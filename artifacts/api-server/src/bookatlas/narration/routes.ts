import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import { waitUntil } from '@vercel/functions';
import type { Book } from '@workspace/bookatlas-catalog/types';
import { logger } from '../../lib/logger.js';
import { readerAccess } from '../ebookPrep/service.js';
import { PrepError } from '../ebookPrep/archive.js';
import { PaymentError } from '../payments/purchases.js';
import { confirmCheckout } from '../payments/checkout.js';
import { NarrationError, decide, getNarration, listNarrations, order, quote, readerManifest, readerSegment, step, summary, voiceSample } from './service.js';

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
export function mountNarration(app: Express, findBook: (id: string) => Promise<Book | null | undefined>, appUrl: string) {
  const json = express.json({ limit: '16kb' });

  /** Run the next step after this response; on Vercel `waitUntil` keeps the call alive. */
  const kick = (id: string) => {
    waitUntil(fetch(`${appUrl}/api/internal/narration/step`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-narration-key': stepKey() }, body: JSON.stringify({ id }),
    }).then(() => undefined).catch((err) => logger.warn({ err, event: 'narration.kick_failed', narration: id }, 'Next narration step could not be started')));
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
    res.json(result);
  }));

  const accessOf = async (req: Request, bookId: string) => readerAccess(bookId, req.bookatlasIdentity, (await findBook(bookId))?.price);
  app.get('/api/reader/catalog/:bookId/narration', guarded(async (req, res) => {
    const bookId = String(req.params.bookId);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ narration: /^atlas-ebook-[0-9a-f]{8}$/.test(bookId) ? await readerManifest(bookId, await accessOf(req, bookId)) : null });
  }));
  app.get('/api/reader/catalog/:bookId/narration/:n', guarded(async (req, res) => {
    const bookId = String(req.params.bookId);
    const index = Number(req.params.n);
    if (!/^atlas-ebook-[0-9a-f]{8}$/.test(bookId) || !Number.isSafeInteger(index) || index < 0) throw new NarrationError('Narration not found.', 404);
    sendMp3(res, await readerSegment(bookId, index, await accessOf(req, bookId)), 'private, max-age=86400');
  }));
}
