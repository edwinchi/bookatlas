import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { STUDIO_SPEECH_MODEL, narrationDirection } from '@workspace/bookatlas-catalog/voices';
import type { Identity } from '../../auth/policy.js';
import { logger } from '../../lib/logger.js';
import { bookatlasDb } from '../db/supabaseClient.js';
import { bookContent } from '../ebookPrep/service.js';
import { previewChapters } from '../ebookPrep/content.js';
import { submissionForBook } from '../ebookPrep/submissions.js';
import { getObject, putObject } from '../ebookPrep/store.js';
import { issueInvoice } from '../payments/invoices.js';
import { PaymentError } from '../payments/purchases.js';
import { createNarrationCheckout, refundPayment, setNarrationPaidHandler } from '../payments/checkout.js';
import { pcm16ToMp3, pcmSeconds, toPcm16 } from './mp3.js';
import {
  NARRATION_VOICES, inPreview, narrationEstimate, narrationPrice, planSegments, segmentText, wordCount,
  type Chapter, type NarrationVoice, type Segment,
} from './plan.js';

/**
 * Natural audiobook narration (TASK-0008). Orders are paid by the author, approved by an administrator, then
 * narrated one segment per step (each step fits a 60-second serverless request). Spending is bounded by the
 * approved estimate; a lease keeps two steps from narrating the same book at once.
 */

export type NarrationStatus = 'awaiting_payment' | 'paid' | 'approved' | 'running' | 'done' | 'failed' | 'declined' | 'refunded';
export interface SegmentState extends Segment { seconds?: number; bytes?: number; attempts?: number; provider?: 'chirp-free' | 'gemini' }
export interface Narration {
  id: string; book_id: string; owner_id: string; title: string; voice: NarrationVoice; status: NarrationStatus;
  price_cents: number; words: number; estimate_micros: number; spent_micros: number;
  segments: SegmentState[]; done: number; total: number; seconds: number;
  checkout_session_id: string | null; payment_intent_id: string | null;
  lease_token: string | null; lease_until: string | null; error: string | null;
  decided_by: string | null; decided_at: string | null; created_at: string; updated_at: string;
}

export class NarrationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const ACTIVE: NarrationStatus[] = ['awaiting_payment', 'paid', 'approved', 'running', 'done'];
const LEASE_MS = 90_000;
const MAX_ATTEMPTS = 3;
const SAMPLE_TEXT = 'Welcome to your audiobook on BooksAtlas. This is how your book will sound, read in full, chapter by chapter, with every paragraph highlighted as you listen.';

// ---------------------------------------------------------------------------------------------- storage

const memory = new Map<string, Narration>();
const db = () => bookatlasDb;

async function insert(n: Narration) {
  if (!db()) { memory.set(n.id, structuredClone(n)); return; }
  const r = await db()!.from('narrations').insert(n);
  if (r.error) throw new NarrationError('The order could not be saved.', 503);
}
async function update(id: string, patch: Partial<Narration>) {
  const next = { ...patch, updated_at: new Date().toISOString() };
  if (!db()) { const n = memory.get(id); if (n) memory.set(id, { ...n, ...structuredClone(next) }); return; }
  const r = await db()!.from('narrations').update(next).eq('id', id);
  if (r.error) throw new NarrationError('The narration could not be updated.', 503);
}
export async function getNarration(id: string): Promise<Narration | null> {
  if (!db()) return structuredClone(memory.get(id) ?? null);
  const r = await db()!.from('narrations').select('*').eq('id', id).maybeSingle();
  if (r.error) throw new NarrationError('The narration could not be read.', 503);
  return r.data as Narration | null;
}
async function forBook(bookId: string): Promise<Narration[]> {
  if (!db()) return [...memory.values()].filter((n) => n.book_id === bookId).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((n) => structuredClone(n));
  const r = await db()!.from('narrations').select('*').eq('book_id', bookId).order('created_at', { ascending: false }).limit(20);
  if (r.error) throw new NarrationError('The narration could not be read.', 503);
  return r.data as Narration[];
}
/** The order that matters for a book: a finished or paid one before an abandoned unpaid one. */
const PRIORITY: NarrationStatus[] = ['running', 'approved', 'paid', 'done', 'failed', 'awaiting_payment'];
async function latestForBook(bookId: string): Promise<Narration | null> {
  const all = await forBook(bookId);
  for (const status of PRIORITY) { const n = all.find((x) => x.status === status); if (n) return n; }
  return null;
}
/** The finished narration readers hear. */
const finishedForBook = async (bookId: string) => (await forBook(bookId)).find((n) => n.status === 'done') ?? null;
export async function listNarrations(statuses?: NarrationStatus[]): Promise<Narration[]> {
  if (!db()) return [...memory.values()].filter((n) => !statuses || statuses.includes(n.status)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  let q = db()!.from('narrations').select('id,book_id,owner_id,title,voice,status,price_cents,words,estimate_micros,spent_micros,done,total,seconds,error,created_at,updated_at,decided_at').order('created_at', { ascending: false }).limit(200);
  if (statuses) q = q.in('status', statuses);
  const r = await q;
  if (r.error) throw new NarrationError('Narrations could not be read.', 503);
  return r.data as unknown as Narration[];
}

/** Claim the right to narrate the next segment; false when another step holds a live lease. */
async function claim(n: Narration): Promise<string | null> {
  const token = randomUUID();
  const now = new Date();
  const until = new Date(now.getTime() + LEASE_MS).toISOString();
  if (!db()) {
    const cur = memory.get(n.id);
    if (!cur || (cur.lease_until && Date.parse(cur.lease_until) > now.getTime())) return null;
    memory.set(n.id, { ...cur, lease_token: token, lease_until: until });
    return token;
  }
  const r = await db()!.from('narrations').update({ lease_token: token, lease_until: until })
    .eq('id', n.id).in('status', ['approved', 'running']).or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`).select('id');
  if (r.error) throw new NarrationError('The narration could not be claimed.', 503);
  return (r.data ?? []).length ? token : null;
}

// ---------------------------------------------------------------------------------------------- voice

export interface NarrationProvider {
  speak(text: string, voice: NarrationVoice, maxOutputTokens: number): Promise<{ audio: Uint8Array; mimeType: string }>;
}
let providerOverride: NarrationProvider | null = null;
export function setNarrationProvider(p: NarrationProvider | null) { providerOverride = p; }

function provider(): NarrationProvider {
  if (providerOverride) return providerOverride;
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new NarrationError('Natural narration is not configured yet (no Gemini key).', 503);
  const ai = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 50_000 } });
  return {
    async speak(text, voice, maxOutputTokens) {
      const response = await ai.models.generateContent({
        model: STUDIO_SPEECH_MODEL,
        contents: [{ role: 'user', parts: [{ text, speechMetadata: { style: narrationDirection(voice) } } as never] }],
        config: { responseModalities: ['AUDIO'], maxOutputTokens, speechConfig: { voiceConfig: { voice } } as never },
      });
      const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data || !part.inlineData.mimeType) throw new NarrationError('Gemini returned no audio.', 503);
      return { audio: new Uint8Array(Buffer.from(part.inlineData.data, 'base64')), mimeType: part.inlineData.mimeType };
    },
  };
}

const outputTokensFor = (chars: number) => Math.ceil((chars / 6 / 2.5) * 25 * 1.6) + 512;
const costMicros = (seconds: number, chars: number) => Math.ceil(seconds * 25 * 18 + (chars / 4) * 1);

// ------------------------------------------------------------------------- free tier: Google Cloud TTS Chirp 3 HD

/**
 * Owner request 2026-11-15: use free tiers where possible. Google Cloud Text-to-Speech gives 1,000,000 Chirp 3 HD
 * characters a month free; the same Sulafat and Charon voices exist there. Each month the first ~950,000
 * characters (a margin below the free tier) are narrated with Chirp at no cost, then paid Gemini takes over.
 * Google Cloud terms: customer content is not used to train Google's models.
 */
export const CHIRP_FREE_CHARS = 950_000;
const CHIRP_LOCALES: Record<string, string> = { English: 'en-US', Dutch: 'nl-NL', French: 'fr-FR', German: 'de-DE', Spanish: 'es-ES', Portuguese: 'pt-BR' };
const usageKey = (month: string) => `narrations/usage/${month}.json`;
const thisMonth = () => new Date().toISOString().slice(0, 7);

export async function chirpCharsUsed(month = thisMonth()): Promise<number> {
  try { return Number(JSON.parse(new TextDecoder().decode(await getObject(usageKey(month)))).chars) || 0; } catch { return 0; }
}
async function addChirpChars(chars: number, month = thisMonth()) {
  const used = await chirpCharsUsed(month);
  await putObject(usageKey(month), new TextEncoder().encode(JSON.stringify({ chars: used + chars, updatedAt: new Date().toISOString() })), 'application/json');
}

export interface FreeTierProvider {
  speak(text: string, voice: NarrationVoice, locale: string): Promise<{ audio: Uint8Array; mimeType: string }>;
}
let freeOverride: FreeTierProvider | null | undefined;
export function setFreeTierProvider(p: FreeTierProvider | null | undefined) { freeOverride = p; }

function freeTier(): FreeTierProvider | null {
  if (freeOverride !== undefined) return freeOverride;
  const key = process.env.GOOGLE_TTS_API_KEY?.trim();
  if (!key) return null;
  return {
    async speak(text, voice, locale) {
      const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: { text }, voice: { languageCode: locale, name: `${locale}-Chirp3-HD-${voice}` }, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24_000 } }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new NarrationError(`Chirp returned ${res.status}.`, 503);
      const data = await res.json() as { audioContent?: string };
      if (!data.audioContent) throw new NarrationError('Chirp returned no audio.', 503);
      return { audio: new Uint8Array(Buffer.from(data.audioContent, 'base64')), mimeType: 'audio/wav' };
    },
  };
}

/** Free Chirp while this month's free characters last and the language is supported; paid Gemini otherwise. */
async function speakToMp3(text: string, voice: NarrationVoice, language = 'English') {
  const locale = CHIRP_LOCALES[language];
  const free = freeTier();
  if (free && locale && (await chirpCharsUsed()) + text.length <= CHIRP_FREE_CHARS) {
    try {
      const { audio, mimeType } = await free.speak(text, voice, locale);
      const { pcm, sampleRate } = toPcm16(audio, mimeType);
      const seconds = pcmSeconds(pcm, sampleRate);
      if (seconds >= 0.5) {
        await addChirpChars(text.length);
        return { mp3: pcm16ToMp3(pcm, sampleRate), seconds, provider: 'chirp-free' as const };
      }
    } catch (err) {
      logger.warn({ err, event: 'narration.free_tier_failed' }, 'Free Chirp narration failed; using Gemini');
    }
  }
  const { audio, mimeType } = await provider().speak(text, voice, outputTokensFor(text.length));
  const { pcm, sampleRate } = toPcm16(audio, mimeType);
  const seconds = pcmSeconds(pcm, sampleRate);
  if (seconds < 0.5) throw new NarrationError('Gemini returned an empty recording.', 503);
  return { mp3: pcm16ToMp3(pcm, sampleRate), seconds, provider: 'gemini' as const };
}
const languages = new Map<string, string>();
async function bookLanguage(bookId: string) {
  if (!languages.has(bookId)) languages.set(bookId, (await submissionForBook(bookId))?.data.intake.language ?? 'English');
  return languages.get(bookId)!;
}

// ---------------------------------------------------------------------------------------------- author

const segKey = (id: string, n: number) => `narrations/${id}/seg-${String(n).padStart(4, '0')}.mp3`;

async function ownedPublishedBook(who: Identity, bookId: string) {
  if (!/^atlas-ebook-[0-9a-f]{8}$/.test(bookId)) throw new NarrationError('Book not found.', 404);
  const submission = await submissionForBook(bookId);
  if (!submission || (submission.owner_id !== who.id && who.role !== 'admin')) throw new NarrationError('Book not found.', 404);
  const { chapters } = await bookContent(bookId);
  return { submission, chapters: chapters as unknown as Chapter[] };
}

/** What the author sees: price, length, Gemini estimate and the current order, if any. */
export async function quote(who: Identity, bookId: string) {
  const { submission, chapters } = await ownedPublishedBook(who, bookId);
  const words = wordCount(chapters);
  const estimate = narrationEstimate(words);
  const current = await latestForBook(bookId);
  return {
    bookId, title: submission.data.intake.title, words, priceCents: narrationPrice(words), hours: Math.round((estimate.seconds / 3600) * 10) / 10,
    // Owner decision 2026-11-15: administrators narrate any book at no charge; everyone else pays.
    free: who.role === 'admin',
    voices: NARRATION_VOICES, current: current && ACTIVE.includes(current.status) || current?.status === 'failed' ? summary(current) : null,
  };
}

export const summary = (n: Narration) => ({
  id: n.id, bookId: n.book_id, title: n.title, voice: n.voice, status: n.status, priceCents: n.price_cents, words: n.words,
  done: n.done, total: n.total, seconds: Math.round(n.seconds), error: n.error, createdAt: n.created_at, updatedAt: n.updated_at,
});

export async function order(who: Identity, bookId: string, voice: unknown, appUrl: string) {
  if (!NARRATION_VOICES.includes(voice as NarrationVoice)) throw new NarrationError('Choose Sulafat or Charon.');
  const { submission, chapters } = await ownedPublishedBook(who, bookId);
  const current = await latestForBook(bookId);
  if (current && ['paid', 'approved', 'running', 'done'].includes(current.status)) throw new NarrationError('This book already has a narration order.', 409);
  // A paid checkout that was abandoned is replaced by the new order.
  const segments = planSegments(chapters);
  if (!segments.length) throw new NarrationError('This book has no text to narrate.', 422);
  const words = wordCount(chapters);
  const now = new Date().toISOString();
  // Owner decision 2026-11-15: an administrator's order is free (€0, no checkout, no invoice) and starts at once.
  const free = who.role === 'admin';
  if (free && !freeTier()) provider(); // fails clearly when neither the free tier nor Gemini is configured
  const n: Narration = {
    id: randomUUID(), book_id: bookId, owner_id: who.id, title: submission.data.intake.title, voice: voice as NarrationVoice,
    status: free ? 'approved' : 'awaiting_payment', price_cents: free ? 0 : narrationPrice(words), words, estimate_micros: narrationEstimate(words).micros, spent_micros: 0,
    segments, done: 0, total: segments.length, seconds: 0, checkout_session_id: null, payment_intent_id: null,
    lease_token: null, lease_until: null, error: null, decided_by: free ? who.id : null, decided_at: free ? now : null, created_at: now, updated_at: now,
  };
  await insert(n);
  if (free) {
    logger.info({ event: 'narration.admin_free', narration: n.id, book: bookId }, 'Administrator narration started at no charge');
    return { url: null, free: true as const, narration: summary(n) };
  }
  const checkout = await createNarrationCheckout(who, { narrationId: n.id, bookId, title: n.title, voice: n.voice, priceCents: n.price_cents }, appUrl);
  await update(n.id, { checkout_session_id: checkout.id });
  return { url: checkout.url };
}

// Registered with payments: a paid narration checkout marks the order paid and issues a 21% VAT invoice.
setNarrationPaidHandler(async (paid) => {
  const n = await getNarration(paid.narrationId);
  if (!n || n.owner_id !== paid.userId) return;
  if (n.status === 'awaiting_payment') {
    await update(n.id, { status: 'paid', checkout_session_id: paid.checkoutSessionId, payment_intent_id: paid.paymentIntentId });
    logger.info({ event: 'narration.paid', narration: n.id, book: n.book_id }, 'Narration order paid');
  }
  await issueInvoice({
    checkoutSessionId: paid.checkoutSessionId, paymentIntentId: paid.paymentIntentId, userId: paid.userId, buyerEmail: paid.email,
    buyerName: paid.name, buyerCountry: paid.country, currency: paid.currency, kind: 'service', withdrawalWaiverAt: null,
    lines: [{ bookId: n.book_id, title: `Natural audiobook narration: ${n.title} (${n.voice})`, gross: paid.amountTotal || n.price_cents }],
  }).catch((err) => logger.error({ err, event: 'payments.invoice_failed', narration: n.id }, 'Narration invoice failed'));
});

// ---------------------------------------------------------------------------------------------- admin

export async function decide(admin: Identity, id: string, decision: 'approve' | 'decline' | 'resume') {
  const n = await getNarration(id);
  if (!n) throw new NarrationError('Narration not found.', 404);
  const at = new Date().toISOString();
  if (decision === 'approve') {
    if (n.status !== 'paid') throw new NarrationError('Only paid orders can be approved.', 409);
    if (!freeTier()) provider(); // fails clearly when neither the free tier nor Gemini is configured
    await update(id, { status: 'approved', decided_by: admin.id, decided_at: at, error: null });
  } else if (decision === 'resume') {
    if (n.status !== 'failed' && n.status !== 'running') throw new NarrationError('Only a stopped narration can be resumed.', 409);
    await update(id, { status: 'approved', error: null, lease_until: null, lease_token: null, segments: n.segments.map((s) => ({ ...s, attempts: 0 })) });
  } else {
    if (!['paid', 'failed'].includes(n.status)) throw new NarrationError('Only paid or failed orders can be declined.', 409);
    if (n.payment_intent_id) await refundPayment(n.payment_intent_id, 0);
    await update(id, { status: 'refunded', decided_by: admin.id, decided_at: at });
  }
  return summary((await getNarration(id))!);
}

// ---------------------------------------------------------------------------------------------- narrating

/** Narrate the next segment of one book (or of the next book waiting); returns whether work remains. */
export async function step(id?: string): Promise<{ id: string | null; more: boolean }> {
  const candidates = id ? [await getNarration(id)].filter(Boolean) as Narration[] : (await listNarrations(['approved', 'running'])).map((n) => n);
  for (const listed of candidates) {
    const n = (id ? listed : await getNarration(listed.id))!;
    if (!['approved', 'running'].includes(n.status) || n.done >= n.total) continue;
    const token = await claim(n);
    if (!token) continue;
    const seg = n.segments[n.done]!;
    const { chapters } = await bookContent(n.book_id);
    const text = segmentText(chapters as unknown as Chapter[], seg);
    const budget = Math.ceil(n.estimate_micros * 1.5);
    if (n.spent_micros + costMicros(seg.chars / 15, seg.chars) > budget) {
      await update(n.id, { status: 'failed', error: 'The approved budget would be exceeded; nothing more was spent.', lease_until: null, lease_token: null });
      return { id: n.id, more: false };
    }
    try {
      const { mp3, seconds, provider: used } = await speakToMp3(text, n.voice, await bookLanguage(n.book_id));
      await putObject(segKey(n.id, n.done), mp3, 'audio/mpeg');
      const segments = n.segments.map((s, i) => (i === n.done ? { ...s, seconds: Math.round(seconds * 100) / 100, bytes: mp3.length, provider: used } : s));
      const done = n.done + 1;
      await update(n.id, {
        // Free-tier segments cost nothing; only Gemini segments count against the approved budget.
        segments, done, seconds: n.seconds + seconds, spent_micros: n.spent_micros + (used === 'gemini' ? costMicros(seconds, text.length) : 0),
        status: done >= n.total ? 'done' : 'running', lease_until: null, lease_token: null,
      });
      if (done >= n.total) logger.info({ event: 'narration.done', narration: n.id, book: n.book_id }, 'Narration complete');
      return { id: n.id, more: done < n.total };
    } catch (err) {
      // Google's quota (e.g. the free tier's 10 speech requests a day): retrying cannot help, so pause at once
      // with a plain explanation; nothing is lost and an administrator resumes once the quota allows.
      const quota = quotaProblem(err);
      if (quota) {
        logger.warn({ event: 'narration.quota_exceeded', narration: n.id, segment: n.done, daily: quota.daily }, 'Narration paused: Gemini quota exceeded');
        await update(n.id, { status: 'failed', error: quota.message, lease_until: null, lease_token: null });
        return { id: n.id, more: false };
      }
      const attempts = (seg.attempts ?? 0) + 1;
      const segments = n.segments.map((s, i) => (i === n.done ? { ...s, attempts } : s));
      const failed = attempts >= MAX_ATTEMPTS;
      logger.warn({ err, event: 'narration.step_failed', narration: n.id, segment: n.done, attempts }, 'Narration step failed');
      await update(n.id, { segments, status: failed ? 'failed' : 'running', error: failed ? `Segment ${n.done + 1} failed ${attempts} times: ${err instanceof Error ? err.message.slice(0, 300) : 'error'}` : null, lease_until: null, lease_token: null });
      return { id: n.id, more: !failed };
    }
  }
  return { id: null, more: false };
}

/** A Gemini "quota exceeded" (HTTP 429, RESOURCE_EXHAUSTED) as a message an administrator can act on. */
export function quotaProblem(err: unknown): { daily: boolean; message: string } | null {
  const text = err instanceof Error ? err.message : String(err ?? '');
  if (!/RESOURCE_EXHAUSTED|"code":\s*429|Quota exceeded|exceeded your current quota/i.test(text)) return null;
  const freeTier = /free_tier|FreeTier|Free Tier/i.test(text);
  const daily = /PerDay|per day/i.test(text);
  const retry = /retry in ((?:\d+h)?(?:\d+m)?\d+(?:\.\d+)?s)/i.exec(text)?.[1]?.replace(/\.\d+s$/, 's');
  return {
    daily,
    message: freeTier
      ? `Paused: the Gemini API key is on Google's free tier, which allows only a few narration requests ${daily ? 'a day' : 'a minute'}. Turn on billing for the key in Google AI Studio (aistudio.google.com → API keys → Set up billing), then press Resume. Nothing recorded so far is lost.`
      : `Paused: Gemini's ${daily ? 'daily' : 'per-minute'} quota for this API key was reached${retry ? ` (Google says retry in ${retry})` : ''}. Press Resume later, or raise the quota in Google AI Studio. Nothing recorded so far is lost.`,
  };
}

// ---------------------------------------------------------------------------------------------- samples

const samples = new Map<NarrationVoice, Promise<Uint8Array>>();
/** One short sample per voice, generated on the first request and kept in storage. */
export function voiceSample(voice: string): Promise<Uint8Array> {
  if (!NARRATION_VOICES.includes(voice as NarrationVoice)) return Promise.reject(new NarrationError('Unknown voice.', 404));
  const v = voice as NarrationVoice;
  const key = `narrations/samples/${v}-v1.mp3`;
  if (!samples.has(v)) {
    const p = getObject(key).catch(async () => {
      const { mp3 } = await speakToMp3(SAMPLE_TEXT, v);
      await putObject(key, mp3, 'audio/mpeg');
      return mp3;
    });
    p.catch(() => samples.delete(v));
    samples.set(v, p);
  }
  return samples.get(v)!;
}

// ---------------------------------------------------------------------------------------------- readers

/** The finished narration a reader may hear: everything when entitled, the preview part otherwise. */
export async function readerManifest(bookId: string, access: 'full' | 'preview') {
  const n = await finishedForBook(bookId);
  if (!n) return null;
  const { chapters } = await bookContent(bookId);
  const preview = access === 'full' ? null : previewChapters(chapters as never) as unknown as Chapter[];
  const segments = n.segments.map((s, i) => ({ n: i, chapter: s.chapter, from: s.from, to: s.to, seconds: s.seconds ?? 0 }))
    .filter((s) => !preview || inPreview(n.segments[s.n]!, preview));
  return { voice: n.voice, seconds: Math.round(n.seconds), access, segments };
}

export async function readerSegment(bookId: string, index: number, access: 'full' | 'preview') {
  const manifest = await readerManifest(bookId, access);
  if (!manifest?.segments.some((s) => s.n === index)) throw new NarrationError(access === 'preview' ? 'Buy this book to hear the rest of it.' : 'Narration not found.', access === 'preview' ? 403 : 404);
  const n = (await finishedForBook(bookId))!;
  return getObject(segKey(n.id, index));
}

export { PaymentError };
