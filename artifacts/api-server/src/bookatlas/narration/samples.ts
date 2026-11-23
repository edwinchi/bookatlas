import { createHash } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import type { Book, Chapter } from '@workspace/bookatlas-catalog/types';
import { sendAudio } from '../../lib/sendAudio.js';
import { logger } from '../../lib/logger.js';
import type { CatalogStore } from '../catalog/store.js';
import { bookContent } from '../ebookPrep/service.js';
import { previewChapters } from '../ebookPrep/content.js';
import { getObject, putObject } from '../ebookPrep/store.js';
import { planSegments, segmentText } from './plan.js';
import { NarrationError, narrateSample, readerManifest, readerSegment } from './service.js';
import { MAX_PART_BYTES, workerAllowed } from './local.js';

/**
 * Owner request 2026-11-16: a real audio sample for every book, for everyone (signed in or not). The opening
 * of the book read aloud (about 45 seconds), recorded once and kept:
 *  - a narrated book: its own first recorded part (no cost);
 *  - otherwise the free Kokoro voice from the owner's computer (`npm run samples` in tools/local-narrator),
 *    or, for a book nobody recorded yet, the cloud voice on first listen.
 * The words come from the book itself (its free preview, or the sample chapter of a sample title).
 */
const SAMPLE_CHARS = 750;

/** The text up to about `max` characters, ending at a sentence. */
export function clip(text: string, max = SAMPLE_CHARS) {
  if (text.length <= max) return text.trim();
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('.\n'));
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…').trim();
}

const plain = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim();

/** What the sample reads: the opening chapter of the free preview, or a sample title's first sample chapter. */
export async function sampleText(book: Book): Promise<string | null> {
  if (book.hasReaderContent && /^atlas-ebook-[0-9a-f]{8}$/.test(book.id)) {
    const { chapters } = await bookContent(book.id);
    const preview = previewChapters(chapters as unknown as Chapter[]) as unknown as Chapter[];
    const opening = preview[preview.length - 1];
    if (!opening) return null;
    const seg = planSegments([opening as never])[0];
    return seg ? clip(segmentText([opening as never], seg)) : null;
  }
  const ch = book.sampleChapters?.find((c) => c.content?.length);
  if (ch) return clip(`${plain(ch.title)}.\n\n${ch.content.map(plain).filter(Boolean).join('\n\n')}`);
  return book.synopsis ? clip(plain(book.synopsis)) : null;
}

export const sampleKey = (bookId: string, text: string) => `samples/books/${bookId}-${createHash('sha256').update(text).digest('hex').slice(0, 12)}.mp3`;

async function stored(key: string) { try { return await getObject(key); } catch { return null; } }

/** A narrated book's first part inside the preview, from its opening chapter where possible. */
async function narratedSample(bookId: string) {
  if (!/^atlas-ebook-[0-9a-f]{8}$/.test(bookId)) return null;
  const manifest = await readerManifest(bookId, 'preview').catch(() => null);
  if (!manifest?.segments.length) return null;
  const last = manifest.segments[manifest.segments.length - 1]!.chapter;
  const seg = manifest.segments.find((s) => s.chapter === last) ?? manifest.segments[0]!;
  return readerSegment(bookId, seg.n, 'preview');
}

const making = new Map<string, Promise<Uint8Array>>();

export async function audioSample(book: Book): Promise<Uint8Array> {
  const narrated = await narratedSample(book.id);
  if (narrated) return narrated;
  const text = await sampleText(book);
  if (!text) throw new NarrationError('This book has no text to sample yet.', 404);
  const key = sampleKey(book.id, text);
  const have = await stored(key);
  if (have) return have;
  // Recorded once; listeners arriving meanwhile wait for the same recording.
  let job = making.get(key);
  if (!job) {
    job = narrateSample(text, book.language || 'English')
      .then(async (mp3) => { await putObject(key, mp3, 'audio/mpeg'); return mp3; })
      .finally(() => making.delete(key));
    making.set(key, job);
  }
  try { return await job; } catch (err) {
    logger.warn({ err, event: 'samples.generate_failed', book: book.id }, 'Audio sample could not be recorded');
    throw new NarrationError('The audio sample is being prepared. Please try again in a few minutes.', 503);
  }
}

async function allBooks(catalog: CatalogStore): Promise<Book[]> {
  const out: Book[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const r = await catalog.search({ page, limit: 100 });
    for (const card of r.books) { const b = await catalog.get(card.id); if (b) out.push(b); }
    if (!r.hasMore) break;
  }
  return out;
}

export function mountSamples(app: Express, catalog: CatalogStore) {
  const guarded = (h: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response) =>
    h(req, res).catch((err) => {
      const status = err instanceof NarrationError ? err.status : (err as { status?: number })?.status ?? 500;
      if (status >= 500 && !(err instanceof NarrationError)) logger.error({ err, event: 'samples.error' }, 'Audio sample request failed');
      if (!res.headersSent) res.status(status).json({ error: status >= 500 && !(err instanceof NarrationError) ? 'Something went wrong.' : (err as Error).message });
    });

  // Public: anyone may listen, signed in or not.
  app.get('/api/audio-samples/:bookId', guarded(async (req, res) => {
    const id = String(req.params.bookId);
    const book = /^[\w.-]{1,120}$/.test(id) ? await catalog.get(id) : null;
    if (!book) throw new NarrationError('Book not found.', 404);
    const mp3 = await audioSample(book);
    sendAudio(req, res, mp3, 'public, max-age=3600, s-maxage=86400');
  }));

  // The book's real chapter titles for the book page ("Sample excerpt included"): which are in the free preview.
  app.get('/api/book-outline/:bookId', guarded(async (req, res) => {
    const id = String(req.params.bookId);
    if (!/^atlas-ebook-[0-9a-f]{8}$/.test(id)) throw new NarrationError('Book not found.', 404);
    const book = await catalog.get(id);
    if (!book?.hasReaderContent) throw new NarrationError('Book not found.', 404);
    const { chapters } = await bookContent(id);
    const preview = previewChapters(chapters as unknown as Chapter[]).length;
    const titled = (chapters as unknown as Chapter[]).map((c, i) => ({ title: plain(c.title || ''), subtitle: c.subtitle ? plain(c.subtitle) : null, preview: i < preview }))
      .filter((c) => c.title && !/^(?:cover|title page|copyright|contents|table of contents)$/i.test(c.title));
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    res.json({ chapters: titled.slice(0, 80), total: titled.length });
  }));

  // The local narrator records missing samples with Kokoro, for free.
  const worker = (req: Request) => { if (!workerAllowed(req.get('authorization'))) throw new NarrationError('Not allowed.', 403); };
  app.get('/api/internal/narration/local/samples', guarded(async (req, res) => {
    worker(req);
    const missing = [];
    for (const book of await allBooks(catalog)) {
      if (await narratedSample(book.id).catch(() => null)) continue;
      const text = await sampleText(book).catch(() => null);
      if (!text) continue;
      const key = sampleKey(book.id, text);
      if (!(await stored(key))) missing.push({ bookId: book.id, title: book.title, language: book.language || 'English', key, text });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ missing });
  }));
  app.put('/api/internal/narration/local/samples/:bookId', express.raw({ type: 'audio/mpeg', limit: MAX_PART_BYTES }), guarded(async (req, res) => {
    worker(req);
    const book = await catalog.get(String(req.params.bookId));
    if (!book) throw new NarrationError('Book not found.', 404);
    const text = await sampleText(book);
    if (!text || req.get('x-sample-key') !== sampleKey(book.id, text)) throw new NarrationError('The book changed; list the samples again.', 409);
    const mp3 = Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : null;
    if (!mp3 || mp3.byteLength < 200 || !((mp3[0] === 0x49 && mp3[1] === 0x44 && mp3[2] === 0x33) || (mp3[0] === 0xff && (mp3[1]! & 0xe0) === 0xe0))) throw new NarrationError('Not an MP3.');
    await putObject(sampleKey(book.id, text), mp3, 'audio/mpeg');
    res.json({ stored: true });
  }));
}
