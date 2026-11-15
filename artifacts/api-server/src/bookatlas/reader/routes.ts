import express, { type Express, type Request, type Response } from 'express';
import { logger } from '../../lib/logger.js';
import type { CatalogStore } from '../catalog/store.js';
import {
  ReaderError, addAnnotation, annotationsOf, deleteAnnotation, getPreferences, getProgress, readingStats, recordSession,
  saveProgress, savePreferences, searchAnnotations, updateAnnotation,
} from './service.js';
import { DAILY_AI_LIMIT, LANGUAGES, askBook, defineWord, explainPassage, refundAiQuota, studyChapter, translatePassage, useAiQuota, type Generate } from './ai.js';

let generatorOverride: Generate | null = null;
/** Tests substitute the AI; production uses the app's OpenRouter/Gemini text generation. */
export function setReaderAiGenerator(g: Generate | null) { generatorOverride = g; }

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'private, no-store');
      await handler(req, res);
    } catch (error) {
      if (error instanceof ReaderError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error({ err: error }, 'Reader request failed');
      res.status(503).json({ error: req.path.startsWith('/api/reader/ai/') ? 'The AI assistant is not available right now. Please try again in a minute.' : 'Syncing is temporarily unavailable. Your reading continues on this device.' });
    }
  };
}
const signedIn = (req: Request) => {
  if (!req.bookatlasIdentity) throw new ReaderError('Sign in to save your place, notes and highlights.', 401);
  return req.bookatlasIdentity;
};
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;

/** BooksAtlas Reader sync (cycle 7): one account, the same place, marks and settings on every device. */
export function mountReader(app: Express, catalog: CatalogStore, generate?: Generate) {
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

  // Reader Phase 2 (cycle 8): AI on the text the reader may read, with a daily limit per reader.
  const ai = (handler: (gen: Generate, book: NonNullable<Awaited<ReturnType<CatalogStore['get']>>>, who: NonNullable<Request['bookatlasIdentity']>, b: Record<string, unknown>) => Promise<object>) =>
    guarded(async (req, res) => {
      if (!req.bookatlasIdentity) throw new ReaderError('Sign in to use the AI reading assistant.', 401);
      const who = req.bookatlasIdentity;
      const book = await catalog.get(String(body(req).bookId ?? ''));
      if (!book) throw new ReaderError('Unknown book.', 404);
      const gen = generatorOverride ?? generate;
      if (!gen) throw new ReaderError('The AI assistant is not configured yet.', 503);
      const remaining = useAiQuota(who.id);
      let result: object;
      try { result = await handler(gen, book, who, body(req)); } catch (e) { refundAiQuota(who.id); throw e; }
      res.json({ ...result, remaining });
    });
  app.get('/api/reader/ai/config', (_req, res) => { res.json({ dailyLimit: DAILY_AI_LIMIT, languages: LANGUAGES }); });
  app.post('/api/reader/ai/ask', json, ai(askBook));
  app.post('/api/reader/ai/study', json, ai(studyChapter));
  app.post('/api/reader/ai/explain', json, ai(explainPassage));
  app.post('/api/reader/ai/translate', json, ai(translatePassage));
  app.post('/api/reader/ai/define', json, ai(defineWord));
}
