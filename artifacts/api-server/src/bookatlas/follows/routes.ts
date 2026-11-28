import type { Express, Request, Response } from 'express';
import { logger } from '../../lib/logger.js';
import type { CatalogStore } from '../catalog/store.js';
import { authorProfile, authorSlug } from '../reviews/routes.js';
import { newFromFollowed } from './newBooks.js';
import { FollowError, follow, followsOf, readUnfollowToken, unfollow } from './service.js';

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof FollowError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error({ err: error }, 'Follow request failed');
      res.status(503).json({ error: 'Following is temporarily unavailable. Please retry.' });
    }
  };
}
const signedIn = (req: Request) => {
  if (!req.bookatlasIdentity) throw new FollowError('Please sign in to follow authors.', 401);
  return req.bookatlasIdentity;
};
const page = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · BooksAtlas</title>
<style>body{font:16px/1.5 system-ui,sans-serif;color:#0f172a;max-width:520px;margin:15vh auto;padding:0 16px}a{color:#4f46e5}</style></head><body><h1>${title}</h1><p>${body}</p><p><a href="/">Back to BooksAtlas</a></p></body></html>`;

/** Follow authors (cycle 5c): follow, unfollow, the reader's state, and the signed one-click unsubscribe link. */
export function mountFollows(app: Express, catalog: CatalogStore) {
  // New from the authors the reader follows: their books of the last months, newest first (works without e-mail).
  app.get('/api/follows/new', guarded(async (req, res) => {
    const follows = (await followsOf(signedIn(req).id)).slice(0, 30);
    const lists = await Promise.all(follows.map(async (f) => {
      const page = await catalog.search({ q: f.author_name || f.author_slug.replace(/-/g, ' '), limit: 50 }).catch(() => ({ books: [] }));
      return { slug: f.author_slug, followedAt: f.created_at, books: (page.books as { author: string }[]).filter((b) => authorSlug(b.author) === f.author_slug) };
    }));
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ following: follows.length, books: newFromFollowed(lists as Parameters<typeof newFromFollowed>[0]) });
  }));
  app.get('/api/follows/:slug/mine', guarded(async (req, res) => {
    const who = signedIn(req);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ following: (await followsOf(who.id)).some((f) => f.author_slug === String(req.params.slug)) });
  }));
  app.post('/api/follows/:slug', guarded(async (req, res) => {
    const who = signedIn(req);
    const profile = await authorProfile(catalog, String(req.params.slug));
    if (!profile) throw new FollowError('Author not found.', 404);
    await follow(who, profile.slug, profile.name);
    res.status(201).json({ following: true });
  }));
  app.delete('/api/follows/:slug', guarded(async (req, res) => {
    await unfollow(signedIn(req).id, String(req.params.slug));
    res.json({ following: false });
  }));
  // From the e-mail, without signing in; POST is the mail apps' one-click unsubscribe.
  const unsubscribe = guarded(async (req, res) => {
    const target = readUnfollowToken(String(req.query.token ?? ''));
    if (!target) { res.status(400).type('html').send(page('Link not valid', 'This unsubscribe link is not valid. You can unfollow on the author’s page.')); return; }
    await unfollow(target.userId, target.slug);
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') { res.json({ unsubscribed: true }); return; }
    res.type('html').send(page('Unsubscribed', 'You will no longer receive e-mails about this author’s new books.'));
  });
  app.get('/api/follows/unsubscribe', unsubscribe);
  app.post('/api/follows/unsubscribe', unsubscribe);
}
