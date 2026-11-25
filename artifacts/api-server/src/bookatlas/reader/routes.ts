import { timingSafeEqual } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import { logger } from '../../lib/logger.js';
import type { CatalogStore } from '../catalog/store.js';
import {
  ReaderError, addAnnotation, annotationsOf, deleteAnnotation, getPreferences, getProgress, readingStats, recordSession,
  saveProgress, savePreferences, saveSettingsKey, searchAnnotations, updateAnnotation,
} from './service.js';
import { readableContent } from '../ebookPrep/service.js';
import { achievements, DEFAULT_DAILY_GOAL } from './achievements.js';
import { chapterSocial, hideTarget, report, reportedItems, setShared, sharedAnnotationExists } from './social.js';
import { addPost, createGroup, deletePost, groupCount, groupDetail, joinGroup, leaveGroup, myGroups, postExists } from './groups.js';
import { DAILY_AI_LIMIT, LANGUAGES, askBook, defineWord, explainPassage, refundAiQuota, studyChapter, translatePassage, useAiQuota, type Generate } from './ai.js';
import { digestEmailConfigured, getDigest, resendBatch, runDigest, setDigest, unsubscribeDigest } from './digest.js';
import { answerQuiz, classDetail, classReport, createClass, joinClass, leaveClass, myClasses, publishQuiz, removeQuiz, setClassBooks } from './classes.js';
import { FamilyError, addActivity, familyView, readFamily, weekStart, withProfiles, type Family } from './family.js';

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

  // Reading Intelligence phase 2 (2026-11-25): family profiles, their reading, and the weekly family challenge.
  const familyOf = async (userId: string) => readFamily((await getPreferences(userId))?.settings?.family);
  const view = async (userId: string, f: Family) => {
    const stats = await readingStats(userId);
    const monday = weekStart();
    const own = stats.last30.filter((d) => d.day >= monday).reduce((n, d) => n + d.minutes, 0);
    return familyView(f, own);
  };
  const familyGuard = (fn: () => unknown) => { try { return fn(); } catch (e) { if (e instanceof FamilyError) throw new ReaderError(e.message, e.status); throw e; } };
  app.get('/api/reader/family', guarded(async (req, res) => {
    const who = signedIn(req);
    res.json(await view(who.id, await familyOf(who.id)));
  }));
  app.put('/api/reader/family', json, guarded(async (req, res) => {
    const who = signedIn(req);
    const next = withProfiles(await familyOf(who.id), body(req));
    await saveSettingsKey(who.id, 'family', next);
    res.json(await view(who.id, next));
  }));
  app.post('/api/reader/family/activity', json, guarded(async (req, res) => {
    const who = signedIn(req);
    const f = await familyOf(who.id);
    const updated = familyGuard(() => addActivity(f, body(req))) as Family;
    await saveSettingsKey(who.id, 'family', updated);
    res.status(204).end();
  }));

  // Reader Phase 3 (cycle 10): achievements and the daily goal, shared notes, popular highlights, reading groups.
  app.get('/api/reader/achievements', guarded(async (req, res) => {
    const who = signedIn(req);
    const [stats, annotations, groups, prefs] = await Promise.all([readingStats(who.id), annotationsOf(who.id), groupCount(who.id), getPreferences(who.id)]);
    const goal = Number(prefs?.settings?.dailyGoalMinutes) || DEFAULT_DAILY_GOAL;
    res.json(achievements({ stats, annotations, groups, dailyGoalMinutes: goal }));
  }));
  app.patch('/api/reader/annotations/:id/share', json, guarded(async (req, res) => {
    const who = signedIn(req);
    const book = await catalog.get(String(body(req).bookId ?? ''));
    if (!book) throw new ReaderError('Unknown book.', 404);
    const { chapters } = await readableContent(book.id, who, book.price);
    res.json(await setShared(who, String(req.params.id), body(req).shared, chapters as never));
  }));
  app.get('/api/reader/social/:bookId/:chapter', guarded(async (req, res) => {
    const who = signedIn(req);
    const book = await catalog.get(String(req.params.bookId));
    const chapter = Number(req.params.chapter);
    if (!book || !Number.isInteger(chapter) || chapter < 0) throw new ReaderError('Unknown book.', 404);
    const { chapters } = await readableContent(book.id, who, book.price);
    res.json(await chapterSocial(who.id, book.id, chapter, chapters as never));
  }));
  app.post('/api/reader/reports', json, guarded(async (req, res) => {
    const b = body(req);
    res.status(201).json(await report(signedIn(req).id, b.kind, b.targetId, b.reason, (kind, id) => (kind === 'annotation' ? sharedAnnotationExists(id) : postExists(id))));
  }));

  const titleOf = async (id: string) => (await catalog.get(id))?.title ?? null;
  // Schools and teams (Reading Intelligence phase 3, 2026-11-25): classes with an invite code and a reading list.
  const classId = (req: Request) => String(req.params.id);
  app.get('/api/reader/classes', guarded(async (req, res) => { res.json({ classes: await myClasses(signedIn(req), titleOf) }); }));
  app.post('/api/reader/classes', json, guarded(async (req, res) => { res.status(201).json(await createClass(signedIn(req), body(req))); }));
  app.post('/api/reader/classes/join', json, guarded(async (req, res) => { res.json(await joinClass(signedIn(req), body(req), titleOf)); }));
  app.get('/api/reader/classes/:id', guarded(async (req, res) => { res.json(await classDetail(signedIn(req), classId(req), titleOf)); }));
  app.put('/api/reader/classes/:id/books', json, guarded(async (req, res) => { res.json(await setClassBooks(signedIn(req), classId(req), body(req), titleOf)); }));
  // Phase 5: reading e-mails (weekly summary, streak reminder), opt-in, with a signed one-click unsubscribe link.
  app.get('/api/reader/digest', guarded(async (req, res) => { res.json({ ...(await getDigest(signedIn(req).id)), available: digestEmailConfigured() }); }));
  app.put('/api/reader/digest', json, guarded(async (req, res) => { res.json({ ...(await setDigest(signedIn(req), body(req))), available: digestEmailConfigured() }); }));
  const stopDigest = guarded(async (req, res) => {
    const ok = await unsubscribeDigest(req.query.token);
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') { res.status(ok ? 200 : 400).json({ unsubscribed: ok }); return; }
    const page = (title: string, text: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · BooksAtlas</title><style>body{font:16px/1.5 system-ui,sans-serif;color:#0f172a;max-width:520px;margin:15vh auto;padding:0 16px}a{color:#4f46e5}</style></head><body><h1>${title}</h1><p>${text}</p><p><a href="/reading-intelligence#progress">Reading settings</a> · <a href="/">BooksAtlas</a></p></body></html>`;
    res.status(ok ? 200 : 400).type('html').send(ok ? page('Unsubscribed', 'You will no longer get reading e-mails from BooksAtlas. You can switch them on again under Read smarter.') : page('Link not valid', 'This link is not valid. You can switch reading e-mails off under Read smarter → Your reading.'));
  });
  app.get('/api/reader/digest/unsubscribe', stopDigest);
  app.post('/api/reader/digest/unsubscribe', stopDigest);
  // Once a day (vercel.json); with CRON_SECRET set, Vercel's "Authorization: Bearer" header is required.
  app.get('/api/internal/reader/digest', guarded(async (req, res) => {
    const secret = process.env.CRON_SECRET?.trim();
    if (secret) {
      const given = Buffer.from(req.get('authorization') ?? '');
      const wanted = Buffer.from(`Bearer ${secret}`);
      if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) throw new ReaderError('Not allowed.', 403);
    }
    if (!digestEmailConfigured()) { res.json({ skipped: 'e-mail is not configured' }); return; }
    const app = (process.env.APP_URL?.trim().startsWith('https://') ? process.env.APP_URL.trim() : 'https://booksatlas.app').replace(/\/$/, '');
    res.json(await runDigest(app, resendBatch));
  }));

  // Phase 5: the teacher's report, with reading minutes per week.
  app.get('/api/reader/classes/:id/report', guarded(async (req, res) => { res.json(await classReport(signedIn(req), classId(req), titleOf, req.query.weeks)); }));
  // Phase 4: class quizzes made from a chapter, answered once by each member.
  app.post('/api/reader/classes/:id/quizzes', json, guarded(async (req, res) => { res.status(201).json(await publishQuiz(signedIn(req), classId(req), body(req))); }));
  app.delete('/api/reader/classes/:id/quizzes/:quizId', guarded(async (req, res) => { res.json(await removeQuiz(signedIn(req), classId(req), String(req.params.quizId))); }));
  app.post('/api/reader/classes/:id/quizzes/:quizId/answers', json, guarded(async (req, res) => { res.json(await answerQuiz(signedIn(req), classId(req), String(req.params.quizId), body(req))); }));
  app.delete('/api/reader/classes/:id/members/:userId', guarded(async (req, res) => {
    const who = signedIn(req);
    const target = String(req.params.userId);
    res.json(await leaveClass(who, classId(req), target === 'me' ? who.id : target));
  }));
  app.post('/api/reader/groups', json, guarded(async (req, res) => {
    res.status(201).json(await createGroup(signedIn(req), body(req), titleOf));
  }));
  app.get('/api/reader/groups', guarded(async (req, res) => {
    const bookId = typeof req.query.bookId === 'string' ? req.query.bookId : undefined;
    res.json({ groups: await myGroups(signedIn(req), bookId, titleOf) });
  }));
  app.post('/api/reader/groups/join', json, guarded(async (req, res) => {
    res.json(await joinGroup(signedIn(req), body(req).code, titleOf));
  }));
  app.get('/api/reader/groups/:id', guarded(async (req, res) => {
    res.json(await groupDetail(signedIn(req), String(req.params.id), titleOf));
  }));
  app.post('/api/reader/groups/:id/posts', json, guarded(async (req, res) => {
    res.status(201).json(await addPost(signedIn(req), String(req.params.id), body(req)));
  }));
  app.delete('/api/reader/groups/:id/posts/:postId', guarded(async (req, res) => {
    await deletePost(signedIn(req), String(req.params.id), String(req.params.postId));
    res.status(204).end();
  }));
  app.delete('/api/reader/groups/:id/membership', guarded(async (req, res) => {
    res.json(await leaveGroup(signedIn(req), String(req.params.id)));
  }));

  // Administrators: reported shared notes and group posts.
  const admin = (req: Request) => { const who = signedIn(req); if (who.role !== 'admin') throw new ReaderError('Administrator access is required.', 403); return who; };
  app.get('/api/manager/reader-reports', guarded(async (req, res) => {
    admin(req);
    res.json({ items: await reportedItems() });
  }));
  app.post('/api/manager/reader-reports/:kind/:id/:action', guarded(async (req, res) => {
    admin(req);
    const kind = String(req.params.kind), action = String(req.params.action);
    if ((kind !== 'annotation' && kind !== 'post') || !['hide', 'restore'].includes(action) || !/^[0-9a-f-]{36}$/.test(String(req.params.id))) throw new ReaderError('Not found.', 404);
    await hideTarget(kind, String(req.params.id), action === 'hide');
    res.json({ ok: true });
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
