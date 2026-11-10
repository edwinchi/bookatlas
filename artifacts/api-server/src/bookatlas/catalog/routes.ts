import type { Express, Request, Response } from 'express';
import { SHELVES, parseCatalogQuery, type ShelfId } from '@workspace/bookatlas-catalog/query';
import { logger } from '../../lib/logger.js';
import { CatalogError, type CatalogStore } from './store.js';

/** Public catalogue answers are the same for everyone, so Vercel's edge caches them. */
const edgeCache = (res: Response, seconds: number) =>
  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`);

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (!(error instanceof CatalogError)) logger.error({ err: error }, 'Catalogue request failed');
      res.setHeader('Cache-Control', 'no-store');
      res.status(error instanceof CatalogError ? error.status : 503).json({ error: error instanceof CatalogError ? error.message : 'The catalogue is temporarily unavailable.' });
    }
  };
}

const queryOf = (req: Request) => parseCatalogQuery(new URLSearchParams(req.url.split('?')[1] ?? ''));

/** The scalable catalogue (TASK-0005): every list is a small, indexed, cached page. */
export function mountCatalog(app: Express, catalog: CatalogStore) {
  app.get('/api/catalog/search', guarded(async (req, res) => {
    edgeCache(res, 60);
    res.json(await catalog.search(queryOf(req)));
  }));

  app.get('/api/catalog/books/:id', guarded(async (req, res) => {
    const id = String(req.params.id);
    if (!/^[\w.-]{1,80}$/.test(id)) throw new CatalogError('Book not found.', 404);
    const book = await catalog.get(id);
    if (!book) throw new CatalogError('Book not found.', 404);
    edgeCache(res, 60);
    res.json({ book });
  }));

  app.get('/api/catalog/facets', guarded(async (_req, res) => {
    edgeCache(res, 300);
    res.json(await catalog.facets());
  }));

  app.get('/api/catalog/shelves', guarded(async (req, res) => {
    const requested = String(req.query.ids ?? '').split(',').filter((id): id is ShelfId => Object.hasOwn(SHELVES, id)).slice(0, 12);
    const pages = await Promise.all(requested.map((id) => catalog.search(SHELVES[id])));
    edgeCache(res, 120);
    res.json({ shelves: Object.fromEntries(requested.map((id, i) => [id, pages[i]!.books])) });
  }));
}
