import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import { waitUntil } from '@vercel/functions';
import type { Book } from '@workspace/bookatlas-catalog/types';
import { logger } from '../../lib/logger.js';
import { PrepError } from '../ebookPrep/archive.js';
import { PaymentError } from '../payments/purchases.js';
import { confirmCheckout } from '../payments/checkout.js';
import { NarrationError, decide, getNarration, listNarrations, narrationsDue, order, quote, readerManifest, readerSegment, setAudioPrice, step, summary, voiceSample } from './service.js';
import { audioAccess } from './edition.js';
import { MAX_PART_BYTES, claimLocal, openForLocal, releaseLocal, uploadLocalPart, workerAllowed } from './local.js';

/** The key the server uses to call its own next narration step; derived from the session secret. */
export const stepKey = () => createHmac('sha256', process.env.SESSION_SECRET ?? 'bookatlas-local').update('bookatlas-narration-step-v1').digest('hex');
const validKey = (given: unknown) => {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(stepKey());
  return a.length === b.length && timingSafeEqual(a, b);
};

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof NarrationError || error instanceof PaymentError || error instanceof PrepError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error({ err: error }, 'Narration request failed');
      res.status(503).json({ error: 'Narration is temporarily unavailable. Please retry.' });
    }
  };
}
const signedIn = (req: Request) => {
  if (!req.bookatlasIdentity) throw new NarrationError('Please sign in with a verified email address.', 401);
  return req.bookatlasIdentity;
};
const admin = (req: Request) => {
  const who = signedIn(req);
  if (who.role !== 'admin') throw new NarrationError('Administrator access is required.', 403);
  return who;
};
const sendMp3 = (res: Response, bytes: Uint8Array, cache: string) => {
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', cache);
  res.setHeader('Content-Length', String(bytes.length));
  res.end(Buffer.from(bytes));
};

/**
 * Natural audiobook narration (TASK-0008): author quote and order, voice samples, administrator approval,
 * the self-chaining narration step, and the reader's manifest and audio.
 */
/** The longest wait for a per-minute quota inside one call (Vercel stops the function at 60 s). */
const KICK_WAIT_MAX_MS = 45_000;

export function mountNarration(app: Express, findBook: (id: string) => Promise<Book | null | undefined>, appUrl: string) {
  const json = express.json({ limit: '16kb' });

  /** Run the next step after this response; on Vercel `waitUntil` keeps the call alive. */
  const kick = (id: string) => {
    waitUntil(fetch(`${appUrl}/api/internal/narration/step`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-narration-key': stepKey() }, body: JSON.stringify({ id }),
    }).then(() => undefined).catch((err) => logger.warn({ err, event: 'narration.kick_failed', narration: id }, 'Next narration step could not be started')));
  };
  /** After a per-minute quota: start the next step once the minute is over (within this call's time limit). */
  const kickAfter = (id: string, ms: number) => {
    waitUntil(new Promise<void>((done) => setTimeout(done, ms)).then(() => kick(id)));
  };
  /** A narration whose chain stopped (expired lease) is resumed when someone looks at it. */
  const resumeIfStalled = (n: { id: string; status: string; lease_until?: string | null }) => {
    if (['approved', 'running'].includes(n.status) && (!n.lease_until || Date.parse(n.lease_until) < Date.now())) kick(n.id);
  };

  app.get('/api/narration/books/:bookId', guarded(async (req, res) => {
    const q = await quote(signedIn(req), String(req.params.bookId));
    if (q.current) { const full = await getNarration(q.current.id); if (full) resumeIfStalled(full); }
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(q);
  }));
  app.post('/api/narration/books/:bookId/order', json, guarded(async (req, res) => {
    const result = await order(signedIn(req), String(req.params.bookId), req.body?.voice, appUrl);
    // A free administrator order is approved already: start narrating now.
    if ('free' in result && result.free) kick(result.narration.id);
    res.status(201).json(result);
  }));
  // Cycle 9: sell the finished audiobook as an add-on to the eBook (0 = included with the eBook).
  app.put('/api/narration/books/:bookId/sale', json, guarded(async (req, res) => {
    res.json(await setAudioPrice(signedIn(req), String(req.params.bookId), req.body?.audioPrice));
  }));
  app.post('/api/narration/confirm', json, guarded(async (req, res) => {
    res.json({ paid: await confirmCheckout(signedIn(req), String(req.body?.sessionId ?? '')) });
  }));
  app.get('/api/narration/samples/:voice', guarded(async (req, res) => {
    signedIn(req);
    sendMp3(res, await voiceSample(String(req.params.voice)), 'private, max-age=86400');
  }));

  app.get('/api/manager/narrations', guarded(async (req, res) => {
    admin(req);
    res.setHeader('Cache-Control', 'private, no-store');
    const all = await listNarrations();
    for (const n of all) resumeIfStalled(n);
    res.json({ narrations: all.map((n) => ({ ...summary(n), ownerId: n.owner_id, estimateMicros: n.estimate_micros, spentMicros: n.spent_micros })) });
  }));
  app.post('/api/manager/narrations/:id/:decision', json, guarded(async (req, res) => {
    const who = admin(req);
    const decision = String(req.params.decision);
    if (!['approve', 'decline', 'resume'].includes(decision)) throw new NarrationError('Unknown decision.', 404);
    const result = await decide(who, String(req.params.id), decision as 'approve' | 'decline' | 'resume');
    if (decision !== 'decline') kick(result.id);
    res.json(result);
  }));

  // Called by the server itself (and by stalled-chain recovery): one segment per request, then the next.
  app.post('/api/internal/narration/step', json, guarded(async (req, res) => {
    if (!validKey(req.get('x-narration-key'))) throw new NarrationError('Not allowed.', 403);
    const result = await step(typeof req.body?.id === 'string' ? req.body.id : undefined);
    if (result.more && result.id) kick(result.id);
    // A per-minute limit: wait here (the function may run 60 s) rather than until the daily cron.
    const wait = result.resumeAt ? Date.parse(result.resumeAt) - Date.now() : Infinity;
    if (result.id && wait <= KICK_WAIT_MAX_MS) kickAfter(result.id, Math.max(0, wait) + 1_000);
    res.json(result);
  }));

  // Owner request 2026-11-16: the free Kokoro voice on the owner's computer (tools/local-narrator).
  const worker = (req: Request) => { if (!workerAllowed(req.get('authorization'))) throw new NarrationError('Not allowed.', 403); };
  app.get('/api/internal/narration/local', guarded(async (req, res) => {
    worker(req);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ narrations: await openForLocal() });
  }));
  app.post('/api/internal/narration/local/:id/claim', json, guarded(async (req, res) => {
    worker(req);
    res.json(await claimLocal(String(req.params.id), String(req.body?.voice ?? ''), req.body?.fromStart === true));
  }));
  app.put('/api/internal/narration/local/:id/parts/:n', express.raw({ type: 'audio/mpeg', limit: MAX_PART_BYTES }), guarded(async (req, res) => {
    worker(req);
    if (!Buffer.isBuffer(req.body)) throw new NarrationError('Send the part as audio/mpeg.');
    res.json(await uploadLocalPart(String(req.params.id), Number(req.params.n), String(req.get('x-lease-token') ?? ''), String(req.get('x-voice') ?? ''), Number(req.get('x-seconds')), new Uint8Array(req.body)));
  }));
  app.post('/api/internal/narration/local/:id/release', json, guarded(async (req, res) => {
    worker(req);
    res.json(await releaseLocal(String(req.params.id), String(req.body?.leaseToken ?? '')));
  }));

  // Owner request 2026-11-16: once a day (Vercel Cron, vercel.json), continue narrations that waited for
  // Google's free daily limit. With CRON_SECRET set, Vercel sends "Authorization: Bearer $CRON_SECRET" and it
  // is required. Without it the call is open but rate-limited (app.ts): it only starts narrations whose wait
  // is over, which the schedule would do anyway, and never spends beyond an approved budget.
  app.get('/api/internal/narration/cron', guarded(async (req, res) => {
    const secret = process.env.CRON_SECRET?.trim();
    if (secret) {
      const given = Buffer.from(req.get('authorization') ?? '');
      const wanted = Buffer.from(`Bearer ${secret}`);
      if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) throw new NarrationError('Not allowed.', 403);
    }
    const due = await narrationsDue();
    for (const id of due) kick(id);
    logger.info({ event: 'narration.cron', resumed: due.length }, 'Narration schedule ran');
    res.json({ resumed: due.length });
  }));

  // The narration is the eBook's unless the author sells the audiobook as an add-on (cycle 9).
  const accessOf = async (req: Request, bookId: string) => audioAccess(bookId, await findBook(bookId), req.bookatlasIdentity);
  app.get('/api/reader/catalog/:bookId/narration', guarded(async (req, res) => {
    const bookId = String(req.params.bookId);
    res.setHeader('Cache-Control', 'private, no-store');
    if (!/^atlas-ebook-[0-9a-f]{8}$/.test(bookId)) { res.json({ narration: null }); return; }
    const book = await findBook(bookId);
    const manifest = await readerManifest(bookId, await audioAccess(bookId, book, req.bookatlasIdentity));
    res.json({ narration: manifest && { ...manifest, audioPrice: book?.audioPrice ?? 0 } });
  }));
  app.get('/api/reader/catalog/:bookId/narration/:n', guarded(async (req, res) => {
    const bookId = String(req.params.bookId);
    const index = Number(req.params.n);
    if (!/^atlas-ebook-[0-9a-f]{8}$/.test(bookId) || !Number.isSafeInteger(index) || index < 0) throw new NarrationError('Narration not found.', 404);
    sendMp3(res, await readerSegment(bookId, index, await accessOf(req, bookId)), 'private, max-age=86400');
  }));
}
