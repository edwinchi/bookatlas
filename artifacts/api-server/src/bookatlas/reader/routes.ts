import express, { type Express, type Request, type Response } from 'express';
import { logger } from '../../lib/logger.js';
import type { CatalogStore } from '../catalog/store.js';
import {
  ReaderError, addAnnotation, annotationsOf, deleteAnnotation, getPreferences, getProgress, readingStats, recordSession,
  saveProgress, savePreferences, searchAnnotations, updateAnnotation,
} from './service.js';

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'private, no-store');
      await handler(req, res);
    } catch (error) {
      if (error instanceof ReaderError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error({ err: error }, 'Reader sync request failed');
      res.status(503).json({ error: 'Syncing is temporarily unavailable. Your reading continues on this device.' });
    }
  };
}
const signedIn = (req: Request) => {
  if (!req.bookatlasIdentity) throw new ReaderError('Sign in to save your place, notes and highlights.', 401);
  return req.bookatlasIdentity;
};
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;

/** BooksAtlas Reader sync (cycle 7): one account, the same place, marks and settings on every device. */
export function mountReader(app: Express, catalog: CatalogStore) {
  const json = express.json({ limit: '32kb' });
  const knownBook = async (id: string) => { if (!(await catalog.get(id))) throw new ReaderError('Unknown book.', 404); };

  app.get('/api/reader/state/:bookId', guarded(async (req, res) => {
    const who = signedIn(req);
    const id = String(req.params.bookId);
    const [progress, annotations] = await Promise.all([getProgress(who.id, id), annotationsOf(who.id, id)]);
    res.json({ progress, annotations });
  }));
  app.put('/api/reader/progress/:bookId', json, guarded(async (req, res) => {
    const who = signedIn(req);
    await knownBook(String(req.params.bookId));
    res.json(await saveProgress(who.id, String(req.params.bookId), body(req)));
  }));
  app.post('/api/reader/annotations', json, guarded(async (req, res) => {
    const who = signedIn(req);
    await knownBook(String(body(req).bookId ?? ''));
    res.status(201).json(await addAnnotation(who.id, body(req)));
  }));
  app.get('/api/reader/annotations', guarded(async (req, res) => {
    res.json({ annotations: await searchAnnotations(signedIn(req).id, String(req.query.q ?? '')) });
  }));
  app.patch('/api/reader/annotations/:id', json, guarded(async (req, res) => {
    res.json(await updateAnnotation(signedIn(req).id, String(req.params.id), body(req)));
  }));
  app.delete('/api/reader/annotations/:id', guarded(async (req, res) => {
    await deleteAnnotation(signedIn(req).id, String(req.params.id));
    res.status(204).end();
  }));
  app.get('/api/reader/preferences', guarded(async (req, res) => {
    res.json((await getPreferences(signedIn(req).id)) ?? { settings: null, updated_at: null });
  }));
  app.put('/api/reader/preferences', json, guarded(async (req, res) => {
    res.json(await savePreferences(signedIn(req).id, body(req)));
  }));
  app.post('/api/reader/sessions', json, guarded(async (req, res) => {
    const who = signedIn(req);
    await knownBook(String(body(req).bookId ?? ''));
    res.status(201).json(await recordSession(who.id, body(req)));
  }));
  app.get('/api/reader/stats', guarded(async (req, res) => {
    res.json(await readingStats(signedIn(req).id));
  }));
}
