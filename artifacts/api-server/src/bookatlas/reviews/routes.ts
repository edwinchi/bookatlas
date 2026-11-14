import express, { type Express, type Request, type Response } from 'express';
import type { Book } from '@workspace/bookatlas-catalog/types';
import type { BookCard } from '@workspace/bookatlas-catalog/query';
import { logger } from '../../lib/logger.js';
import type { CatalogStore } from '../catalog/store.js';
import { submissionForBook } from '../ebookPrep/submissions.js';
import { ReviewError, bookReviews, deleteReview, moderate, myReview, saveReview, type ReviewCatalog } from './service.js';

/** "Apehgong Edwin Chi" -> "apehgong-edwin-chi": the author page address. */
export const authorSlug = (name: string) => name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

/** An author's real books (demo titles excluded) and their bio, found from the author page address. */
export async function authorProfile(catalog: CatalogStore, slug: string) {
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return null;
  const page = await catalog.search({ q: slug.replace(/-/g, ' '), limit: 100 });
  const books = (page.books as BookCard[]).filter((b) => authorSlug(b.author) === slug && !b.isSample);
  if (!books.length) return null;
  const name = books[0]!.author;
  let bio: string | null = null;
  for (const b of books) {
    const s = await submissionForBook(b.id).catch(() => null);
    const text = s?.data.intake.authorBio?.trim();
    if (text) { bio = text; break; }
  }
  const rated = books.filter((b) => (b.reviewCount ?? 0) > 0);
  const reviews = rated.reduce((n, b) => n + (b.reviewCount ?? 0), 0);
  const rating = reviews ? Math.round((rated.reduce((n, b) => n + b.rating * (b.reviewCount ?? 0), 0) / reviews) * 10) / 10 : 0;
  return { slug, name, bio, books, rating, reviews };
}

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof ReviewError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error({ err: error }, 'Review request failed');
      res.status(503).json({ error: 'Reviews are temporarily unavailable. Please retry.' });
    }
  };
}
const signedIn = (req: Request) => {
  if (!req.bookatlasIdentity) throw new ReviewError('Please sign in to review books.', 401);
  return req.bookatlasIdentity;
};

export function mountReviews(app: Express, catalog: CatalogStore) {
  const json = express.json({ limit: '16kb' });
  const ratings: ReviewCatalog = {
    get: (id) => catalog.get(id),
    setRating: (book: Book, rating, count) => catalog.upsert([{ ...book, rating, reviewCount: count }]),
  };
  const bookId = (req: Request) => {
    const id = String(req.params.id);
    if (!/^[\w.-]{1,120}$/.test(id)) throw new ReviewError('Book not found.', 404);
    return id;
  };

  app.get('/api/catalog/books/:id/reviews', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    res.json(await bookReviews(bookId(req)));
  }));
  app.get('/api/reviews/books/:id/mine', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(await myReview(signedIn(req), ratings, bookId(req)));
  }));
  app.put('/api/reviews/books/:id', json, guarded(async (req, res) => {
    res.json(await saveReview(signedIn(req), ratings, bookId(req), req.body ?? {}));
  }));
  app.delete('/api/reviews/books/:id', guarded(async (req, res) => {
    await deleteReview(signedIn(req), ratings, bookId(req));
    res.status(204).end();
  }));
  app.post('/api/manager/reviews/:reviewId/:action', guarded(async (req, res) => {
    if (signedIn(req).role !== 'admin') throw new ReviewError('Administrator access is required.', 403);
    const action = String(req.params.action);
    if (action !== 'hide' && action !== 'show') throw new ReviewError('Unknown action.', 404);
    res.json(await moderate(ratings, String(req.params.reviewId), action === 'hide' ? 'hidden' : 'published'));
  }));

  app.get('/api/catalog/authors/:slug', guarded(async (req, res) => {
    const profile = await authorProfile(catalog, String(req.params.slug));
    if (!profile) throw new ReviewError('Author not found.', 404);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    res.json(profile);
  }));
}
