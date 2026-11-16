import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Chapter } from '@workspace/bookatlas-catalog/types';
import { logger } from '../../lib/logger.js';
import { bookContent } from '../ebookPrep/service.js';
import { putObject } from '../ebookPrep/store.js';
import { NarrationError, getNarration, listNarrations, segKey, update, markNarrated, bookLanguage, type Narration } from './service.js';
import { segmentText } from './plan.js';
import { KOKORO_VOICES, LOCAL_PROVIDER } from './localVoices.js';

/**
 * Owner request 2026-11-16: narrate without paying for tokens. The open-source Kokoro voice (Apache-2.0) runs
 * on the owner's computer (tools/local-narrator); this is the API it uses. It authenticates with
 * NARRATION_WORKER_TOKEN, holds the narration's lease while it works (so cloud steps leave it alone), and
 * uploads one MP3 part at a time. Nothing here calls Gemini.
 */
export { KOKORO_VOICES, LOCAL_PROVIDER, localVoiceLabel } from './localVoices.js';

/** Each part renews the lease; a computer that stops releases the book to the cloud steps after this long. */
const LEASE_MS = 20 * 60_000;
/** One part's MP3: about 0.5 MB a minute, so this is a part of over half an hour. */
export const MAX_PART_BYTES = 4 * 1024 * 1024;

export function workerAllowed(header: string | undefined): boolean {
  const token = process.env.NARRATION_WORKER_TOKEN?.trim();
  if (!token || token.length < 32) return false;
  const given = Buffer.from(header ?? '');
  const wanted = Buffer.from(`Bearer ${token}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

const OPEN = ['approved', 'running', 'failed'] as const;

export async function openForLocal() {
  const rows = await listNarrations([...OPEN]);
  return Promise.all(rows.map(async (r) => {
    const n = (await getNarration(r.id))!;
    const local = n.segments.slice(0, n.done).filter((s) => (s as { provider?: string }).provider === LOCAL_PROVIDER).length;
    return { id: n.id, bookId: n.book_id, title: n.title, status: n.status, done: n.done, total: n.total, localParts: local, otherParts: n.done - local, language: await bookLanguage(n.book_id) };
  }));
}

async function partText(n: Narration, index: number) {
  const { chapters } = await bookContent(n.book_id);
  return segmentText(chapters as unknown as Chapter[], n.segments[index]!);
}

/**
 * Take the narration for this computer. `fromStart` re-narrates every part in the Kokoro voice (one voice for
 * the whole book); otherwise it continues after the parts already recorded.
 */
export async function claimLocal(id: string, voice: string, fromStart: boolean) {
  if (!KOKORO_VOICES[voice]) throw new NarrationError('Unknown Kokoro voice.');
  const n = await getNarration(id);
  if (!n) throw new NarrationError('Narration not found.', 404);
  if (!(OPEN as readonly string[]).includes(n.status)) throw new NarrationError(`This narration is ${n.status}.`, 409);
  const otherVoice = n.segments.slice(0, n.done).some((s) => (s as { provider?: string; kokoroVoice?: string }).provider !== LOCAL_PROVIDER || (s as { kokoroVoice?: string }).kokoroVoice !== voice);
  if (n.done > 0 && otherVoice && !fromStart) {
    throw new NarrationError(`${n.done} parts were recorded in another voice. Start again from part 1 (--from-start) so the whole book has one voice.`, 409);
  }
  // The cloud narrator is recording a part right now (a quota wait holds no token and may be taken over).
  if (n.lease_until && Date.parse(n.lease_until) > Date.now() && n.lease_token && !n.lease_token.startsWith('local:')) {
    throw new NarrationError('The cloud narrator is working on this part; try again in a few minutes.', 409);
  }
  const leaseToken = `local:${randomUUID()}`;
  const done = fromStart ? 0 : n.done;
  await update(n.id, {
    status: 'running', lease_token: leaseToken, lease_until: new Date(Date.now() + LEASE_MS).toISOString(),
    done, seconds: fromStart ? 0 : n.seconds,
    error: `Being narrated on the owner's computer with the free Kokoro voice ${KOKORO_VOICES[voice]}.`,
  });
  logger.info({ event: 'narration.local_claimed', narration: n.id, voice, fromStart, done }, 'Local narration started');
  return { leaseToken, total: n.total, next: done < n.total ? { n: done, text: await partText(n, done) } : null };
}

/** Store one recorded part, advance, and hand back the next part's text. */
export async function uploadLocalPart(id: string, index: number, leaseToken: string, voice: string, seconds: number, mp3: Uint8Array) {
  const n = await getNarration(id);
  if (!n) throw new NarrationError('Narration not found.', 404);
  if (!leaseToken.startsWith('local:') || n.lease_token !== leaseToken) throw new NarrationError('This computer no longer holds the narration; claim it again.', 409);
  if (index !== n.done) throw new NarrationError(`Expected part ${n.done}, got part ${index}.`, 409);
  if (!KOKORO_VOICES[voice]) throw new NarrationError('Unknown Kokoro voice.');
  if (!Number.isFinite(seconds) || seconds < 0.3 || seconds > 3600) throw new NarrationError('Implausible part length.');
  if (mp3.byteLength < 200 || mp3.byteLength > MAX_PART_BYTES) throw new NarrationError('Implausible part size.');
  // An MP3 starts with an ID3 tag or a frame sync.
  if (!((mp3[0] === 0x49 && mp3[1] === 0x44 && mp3[2] === 0x33) || (mp3[0] === 0xff && (mp3[1]! & 0xe0) === 0xe0))) throw new NarrationError('Not an MP3.');
  await putObject(segKey(n.id, index), mp3, 'audio/mpeg');
  const segments = n.segments.map((s, i) => (i === index ? { ...s, seconds: Math.round(seconds * 100) / 100, bytes: mp3.byteLength, provider: LOCAL_PROVIDER, kokoroVoice: voice, attempts: 0 } : s));
  const done = index + 1;
  const finished = done >= n.total;
  await update(n.id, {
    segments, done, seconds: n.seconds + seconds,
    status: finished ? 'done' : 'running',
    lease_token: finished ? null : leaseToken, lease_until: finished ? null : new Date(Date.now() + LEASE_MS).toISOString(),
    error: finished ? null : n.error,
  });
  if (finished) {
    logger.info({ event: 'narration.done', narration: n.id, book: n.book_id, provider: LOCAL_PROVIDER }, 'Narration complete');
    await markNarrated({ ...n, segments, seconds: n.seconds + seconds }).catch((err) => logger.warn({ err, event: 'narration.listing_failed' }, 'Audiobook listing failed'));
    return { done, total: n.total, next: null };
  }
  return { done, total: n.total, next: { n: done, text: await partText(n, done) } };
}

/** Give the narration back (the computer stops): the cloud steps may continue it, or the daily schedule. */
export async function releaseLocal(id: string, leaseToken: string) {
  const n = await getNarration(id);
  if (!n || n.lease_token !== leaseToken) return { released: false };
  await update(n.id, { lease_token: null, lease_until: null, error: `Paused on the owner's computer after ${n.done} of ${n.total} parts. Run the local narrator again to continue.`, status: 'failed' });
  return { released: true };
}
