import express, { type Express, type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { Book } from '@workspace/bookatlas-catalog/types';
import type { SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import { PrepError } from './archive.js';
import { PART_BYTES } from './store.js';
import type { EpubcheckMessage } from './rules.js';
import {
  bookContent, bookCover, bookImage, checkPart, claimCheck, feedbackOverview, getFor, listFor, prepareSubmission,
  publishSubmission, recordCheck, recordFeedback, rejectSubmission, startSubmission, submissionFile, updateIntake,
  uploadPart, view, workerConfigured,
} from './service.js';
import { logger } from '../../lib/logger.js';

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof PrepError) {
        const fields = (error as PrepError & { fields?: Record<string, string> }).fields;
        res.status(error.status).json({ error: error.message, ...(fields ? { fields } : {}) });
        return;
      }
      logger.error({ err: error }, 'eBook preparation request failed');
      res.status(503).json({ error: 'The eBook service failed safely. Nothing was published; please retry.' });
    }
  };
}

function submissionId(req: Request) {
  const value = String(req.params.id);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new PrepError('Invalid submission identifier.');
  return value;
}

function intakeFrom(body: unknown): SubmissionIntake {
  const b = (body ?? {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);
  const opt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    title: String(b.title ?? '').trim(), subtitle: opt(b.subtitle), author: String(b.author ?? '').trim(),
    language: String(b.language ?? '').trim(), description: String(b.description ?? '').trim(),
    categories: list(b.categories), keywords: list(b.keywords),
    copyrightHolder: String(b.copyrightHolder ?? '').trim(), copyrightYear: Number(b.copyrightYear),
    ebookIsbn: opt(b.ebookIsbn), price: Number(b.price), rightsConfirmed: b.rightsConfirmed === true,
    aiContent: (['none', 'assisted', 'generated'].includes(String(b.aiContent)) ? b.aiContent : 'none') as SubmissionIntake['aiContent'],
    wantsPrint: b.wantsPrint === true,
    binding: b.binding === 'hardcover' ? 'hardcover' : b.binding === 'paperback' ? 'paperback' : undefined,
    trimSize: opt(b.trimSize) as SubmissionIntake['trimSize'], paper: opt(b.paper) as SubmissionIntake['paper'],
    pageCount: b.pageCount === undefined || b.pageCount === '' ? undefined : Number(b.pageCount),
    printIsbn: opt(b.printIsbn), backCoverBlurb: opt(b.backCoverBlurb), authorBio: opt(b.authorBio),
  };
}

/** Worker routes use a bearer token, not an account (see accessFor: self-service). */
function requireWorker(req: Request) {
  const expected = process.env.EBOOK_WORKER_TOKEN?.trim() ?? '';
  const given = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')?.[1]?.trim() ?? '';
  const a = Buffer.from(expected), b = Buffer.from(given);
  if (!workerConfigured() || a.length !== b.length || !timingSafeEqual(a, b)) throw new PrepError('Worker authentication failed.', 401);
}

function sendBytes(res: Response, bytes: Uint8Array, contentType: string, cache = 'private, no-store') {
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(contentType).send(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
}

export function mountEbookPrep(app: Express, onPublished: (book: Book, categories: string[]) => void) {
  const raw = express.raw({ type: 'application/octet-stream', limit: PART_BYTES });

  // Authors (signed-in readers) and admins
  app.get('/api/ebook-submissions', guarded(async (req, res) => {
    res.json({ submissions: await listFor(req.bookatlasIdentity!) });
  }));
  app.post('/api/ebook-submissions', guarded(async (req, res) => {
    const row = await startSubmission(req.bookatlasIdentity!, intakeFrom(req.body?.intake), String(req.body?.fileName ?? ''), Number(req.body?.size));
    res.status(201).json(view(row, req.bookatlasIdentity!));
  }));
  app.get('/api/ebook-submissions/:id', guarded(async (req, res) => {
    res.json(await getFor(req.bookatlasIdentity!, submissionId(req)));
  }));
  app.put('/api/ebook-submissions/:id/upload/:part', raw, guarded(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) throw new PrepError('Send the part as application/octet-stream.', 415);
    await uploadPart(req.bookatlasIdentity!, submissionId(req), Number(req.params.part), new Uint8Array(req.body));
    res.status(204).end();
  }));
  app.post('/api/ebook-submissions/:id/prepare', guarded(async (req, res) => {
    res.json(view(await prepareSubmission(req.bookatlasIdentity!, submissionId(req)), req.bookatlasIdentity!));
  }));
  app.put('/api/ebook-submissions/:id/intake', guarded(async (req, res) => {
    res.json(view(await updateIntake(req.bookatlasIdentity!, submissionId(req), intakeFrom(req.body?.intake)), req.bookatlasIdentity!));
  }));
  app.get('/api/ebook-submissions/:id/files/:file', guarded(async (req, res) => {
    const file = req.params.file === 'cover' ? 'cover' : req.params.file === 'epub' ? 'epub' : null;
    if (!file) throw new PrepError('Unknown file.', 404);
    const result = await submissionFile(req.bookatlasIdentity!, submissionId(req), file);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(result.manifest);
  }));
  app.get('/api/ebook-submissions/:id/files/:file/parts/:part', guarded(async (req, res) => {
    const file = req.params.file === 'cover' ? 'cover' : req.params.file === 'epub' ? 'epub' : null;
    if (!file) throw new PrepError('Unknown file.', 404);
    const result = await submissionFile(req.bookatlasIdentity!, submissionId(req), file, Number(req.params.part));
    sendBytes(res, result.bytes!, 'application/octet-stream');
  }));

  // Admin only (accessFor defaults to admin)
  app.post('/api/ebook-submissions/:id/publish', guarded(async (req, res) => {
    res.json(view(await publishSubmission(submissionId(req), onPublished), req.bookatlasIdentity!));
  }));
  app.post('/api/ebook-submissions/:id/reject', guarded(async (req, res) => {
    const reason = String(req.body?.reason ?? '').trim();
    if (!reason) throw new PrepError('Give the author a reason.');
    res.json(view(await rejectSubmission(submissionId(req), reason), req.bookatlasIdentity!));
  }));
  app.get('/api/ebook-prep/feedback', guarded(async (_req, res) => {
    res.json(await feedbackOverview());
  }));
  app.post('/api/ebook-prep/feedback', guarded(async (req, res) => {
    const message = String(req.body?.message ?? '').trim();
    const store = String(req.body?.store ?? '').trim();
    if (!message || !store) throw new PrepError('Enter the store and its message.');
    const id = req.body?.submissionId ? String(req.body.submissionId) : null;
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new PrepError('Invalid submission identifier.');
    res.status(201).json(await recordFeedback(id, store, message));
  }));

  // EPUBCheck worker (bearer token)
  app.post('/api/internal/ebook-checks/claim', guarded(async (req, res) => {
    requireWorker(req);
    const job = await claimCheck();
    if (!job) { res.status(204).end(); return; }
    res.json(job);
  }));
  app.get('/api/internal/ebook-checks/:id/parts/:part', guarded(async (req, res) => {
    requireWorker(req);
    sendBytes(res, await checkPart(submissionId(req), Number(req.params.part)), 'application/octet-stream');
  }));
  app.post('/api/internal/ebook-checks/:id/result', guarded(async (req, res) => {
    requireWorker(req);
    const messages = Array.isArray(req.body?.messages) ? (req.body.messages as unknown[]).slice(0, 5000).map((m) => {
      const x = (m ?? {}) as Record<string, unknown>;
      const severity = ['FATAL', 'ERROR', 'WARNING', 'INFO', 'USAGE'].includes(String(x.severity)) ? String(x.severity) : 'ERROR';
      return { severity, code: String(x.code ?? '').slice(0, 20), message: String(x.message ?? '').slice(0, 500), location: x.location ? String(x.location).slice(0, 300) : undefined } as EpubcheckMessage;
    }) : null;
    if (!messages) throw new PrepError('Send the EPUBCheck messages.');
    const row = await recordCheck(submissionId(req), String(req.body?.sha256 ?? ''), messages);
    res.json({ status: row.status });
  }));

  // Readers (signed in) and the public cover
  app.get('/api/reader/catalog/:bookId/content', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ chapters: (await bookContent(String(req.params.bookId))).chapters });
  }));
  app.get('/api/reader/catalog/:bookId/images/:name', guarded(async (req, res) => {
    const image = await bookImage(String(req.params.bookId), String(req.params.name));
    sendBytes(res, image.bytes, image.contentType, 'private, max-age=3600');
  }));
  app.get('/api/catalog/covers/:file', guarded(async (req, res) => {
    const id = /^(atlas-ebook-[0-9a-f]{8})\.jpg$/.exec(String(req.params.file))?.[1];
    if (!id) throw new PrepError('Cover not found.', 404);
    sendBytes(res, await bookCover(id), 'image/jpeg', 'public, max-age=86400');
  }));
}
