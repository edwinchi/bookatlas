import type { Book } from '@workspace/bookatlas-catalog/types';
import {
  compareBooks, genresOf, hasAudio, matchesQuery, popularityOf, publishedAt, searchTerms, searchTextOf, toCard,
  PAGE_SIZE, type BookCard, type CatalogQuery,
} from '@workspace/bookatlas-catalog/query';
import { bookatlasDb } from '../db/supabaseClient.js';
import { logger } from '../../lib/logger.js';

export interface CatalogPage { books: BookCard[]; total: number; page: number; limit: number; hasMore: boolean }
export interface Facets {
  total: number;
  categories: { name: string; count: number }[];
  languages: { name: string; count: number }[];
  formats: { name: string; count: number }[];
}

export class CatalogError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}

/** A book as stored in `bookatlas_books`: the full record in `data`, the list view in `card`, and indexed columns. */
export function bookRow(book: Book) {
  const published = publishedAt(book);
  return {
    id: book.id, title: book.title, author: book.author, primary_genre: book.primaryGenre, price: book.price,
    data: book, card: toCard(book), updated_at: new Date().toISOString(),
    subtitle: book.subtitle ?? null, genres: genresOf(book), format: book.format, language: book.language || null,
    original_price: book.originalPrice ?? book.price, rating: book.rating || 0, review_count: book.reviewCount || 0,
    is_deal: !!book.isDeal, is_bestseller: !!book.isBestseller, is_new_release: !!book.isNewRelease,
    is_editor_pick: !!book.isEditorPick, is_plus: !!book.isBookatlasPlus, is_sample: !!book.isSample,
    has_audio: hasAudio(book), has_reader_content: !!book.hasReaderContent,
    published_at: published ? new Date(published).toISOString().slice(0, 10) : null,
    popularity: popularityOf(book), search_text: searchTextOf(book),
  };
}

/** Prefix match on every word: "awak cod" finds "The Awakened Codex". */
function toTsQuery(q: string | undefined) {
  const tokens = searchTerms(q).flatMap((t) => t.split(/[^\p{L}\p{N}]+/u)).filter(Boolean).slice(0, 12);
  return tokens.length ? tokens.map((t) => `${t}:*`).join(' & ') : null;
}

export interface CatalogStore {
  search(query: CatalogQuery): Promise<CatalogPage>;
  get(id: string): Promise<Book | null>;
  getMany(ids: string[]): Promise<BookCard[]>;
  facets(): Promise<Facets>;
  upsert(books: Book[]): Promise<void>;
  remove(id: string): Promise<void>;
  /** Sitemap support: how many titles exist, and one stable chunk of ids with their last change. */
  sitemapCount(): Promise<number>;
  sitemapChunk(chunk: number, size: number): Promise<{ id: string; updatedAt: string | null; sample: boolean }[]>;
}

const pageOf = (query: CatalogQuery) => ({ page: query.page ?? 1, limit: query.limit ?? PAGE_SIZE });

/** The local stack and tests: the in-memory catalogue the server already keeps. */
export function memoryCatalog(books: () => Book[], save: (books: Book[]) => void = () => undefined): CatalogStore {
  return {
    async search(query) {
      const { page, limit } = pageOf(query);
      const found = books().filter((b) => matchesQuery(b, query)).sort(compareBooks(query.sort));
      const from = (page - 1) * limit;
      return { books: found.slice(from, from + limit).map(toCard), total: found.length, page, limit, hasMore: from + limit < found.length };
    },
    async get(id) { return books().find((b) => b.id === id) ?? null; },
    async getMany(ids) { const set = new Set(ids); return books().filter((b) => set.has(b.id)).map(toCard); },
    async facets() {
      const count = (values: (string | undefined)[]) => {
        const map = new Map<string, number>();
        for (const v of values) if (v) map.set(v, (map.get(v) ?? 0) + 1);
        return [...map].map(([name, n]) => ({ name, count: n })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      };
      const all = books();
      return { total: all.length, categories: count(all.flatMap(genresOf)), languages: count(all.map((b) => b.language)), formats: count(all.map((b) => b.format)) };
    },
    async upsert(list) { save(list); },
    async remove() { /* as above */ },
    async sitemapCount() { return books().length; },
    async sitemapChunk(chunk, size) {
      return [...books()].sort((a, b) => a.id.localeCompare(b.id)).slice(chunk * size, (chunk + 1) * size)
        .map((b) => ({ id: b.id, updatedAt: b.publishDate || null, sample: !!b.isSample }));
    },
  };
}

const LIST_COLUMNS = 'card';

/**
 * Production: Postgres indexes answer every query. A page is two steps: the ids in order (an
 * index-only scan for category pages), then those cards. Totals are the planner's estimate,
 * made exact whenever the results end on this page.
 */
export function postgresCatalog(db: NonNullable<typeof bookatlasDb>): CatalogStore {
  let refreshAt = 0;
  const refreshFacets = () => {
    if (Date.now() - refreshAt < 60_000) return;
    refreshAt = Date.now();
    void db.rpc('bookatlas_refresh_catalog_facets').then(({ error }) => { if (error) logger.warn({ err: error }, '[catalog] facet refresh failed'); });
  };
  return {
    async search(query) {
      const { page, limit } = pageOf(query);
      let qb = db.from('books').select('id', { count: 'planned' });
      const tsq = toTsQuery(query.q);
      if (tsq) qb = qb.textSearch('search', tsq, { config: 'simple' });
      if (query.genre) qb = qb.contains('genres', [query.genre]);
      if (query.genresAny?.length) qb = qb.overlaps('genres', query.genresAny);
      if (query.format === 'ebook') qb = qb.in('format', ['ebook', 'bundle']);
      if (query.format === 'audiobook') qb = qb.in('format', ['audiobook', 'bundle']);
      if (query.hasAudio) qb = qb.eq('has_audio', true);
      if (query.plusOnly) qb = qb.eq('is_plus', true);
      if (query.editorPick) qb = qb.eq('is_editor_pick', true);
      if (query.language) qb = qb.eq('language', query.language);
      if (query.price === 'free') qb = qb.eq('price', 0);
      if (query.price === 'under5') qb = qb.lte('price', 4.99);
      if (query.price === 'under10') qb = qb.lte('price', 9.99);
      if (query.price === 'deals') qb = qb.or('is_deal.eq.true,price.lte.4.99');
      if (query.minRating) qb = qb.gte('rating', query.minRating);
      const sort = query.sort ?? 'featured';
      if (sort === 'rating') qb = qb.order('rating', { ascending: false });
      else if (sort === 'priceAsc') qb = qb.order('price', { ascending: true });
      else if (sort === 'priceDesc') qb = qb.order('price', { ascending: false });
      else if (sort === 'newest') qb = qb.order('published_at', { ascending: false, nullsFirst: false });
      else if (sort === 'bestseller') qb = qb.order('is_bestseller', { ascending: false });
      else qb = qb.order('is_editor_pick', { ascending: false });
      qb = qb.order('popularity', { ascending: false }).order('id', { ascending: true });
      const from = (page - 1) * limit;
      // One extra id tells us exactly whether another page exists.
      const { data, count, error } = await qb.range(from, from + limit);
      if (error) { logger.error({ err: error }, '[catalog] search failed'); throw new CatalogError('The catalogue is temporarily unavailable.'); }
      const ids = (data as { id: string }[]).map((r) => r.id);
      const hasMore = ids.length > limit;
      const pageIds = ids.slice(0, limit);
      const total = hasMore ? Math.max(count ?? 0, from + ids.length) : from + pageIds.length;
      if (!pageIds.length) return { books: [], total, page, limit, hasMore: false };
      const cards = await db.from('books').select('id,card').in('id', pageIds);
      if (cards.error) { logger.error({ err: cards.error }, '[catalog] cards failed'); throw new CatalogError('The catalogue is temporarily unavailable.'); }
      const byId = new Map((cards.data as unknown as { id: string; card: BookCard }[]).map((r) => [r.id, r.card]));
      return { books: pageIds.flatMap((id) => byId.get(id) ?? []), total, page, limit, hasMore };
    },
    async get(id) {
      const { data, error } = await db.from('books').select('data').eq('id', id).maybeSingle();
      if (error) throw new CatalogError('The book could not be loaded.');
      return (data as { data: Book } | null)?.data ?? null;
    },
    async getMany(ids) {
      if (!ids.length) return [];
      const { data, error } = await db.from('books').select(LIST_COLUMNS).in('id', ids.slice(0, 100));
      if (error) throw new CatalogError('The books could not be loaded.');
      return (data as unknown as { card: BookCard }[]).map((r) => r.card);
    },
    async facets() {
      const { data, error } = await db.rpc('bookatlas_catalog_facets');
      if (error) throw new CatalogError('The categories are temporarily unavailable.');
      const rows = (data ?? []) as { kind: string; name: string; n: number }[];
      const of = (kind: string) => rows.filter((r) => r.kind === kind).map((r) => ({ name: r.name, count: Number(r.n) })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      return { total: Number(rows.find((r) => r.kind === 'total')?.n ?? 0), categories: of('category'), languages: of('language'), formats: of('format') };
    },
    async upsert(books) {
      for (let i = 0; i < books.length; i += 500) {
        const { error } = await db.from('books').upsert(books.slice(i, i + 500).map(bookRow));
        if (error) { logger.error({ err: error }, '[catalog] upsert failed'); throw new CatalogError('The books could not be saved.'); }
      }
      refreshFacets();
    },
    async remove(id) {
      const { error } = await db.from('books').delete().eq('id', id);
      if (error) throw new CatalogError('The book could not be removed.');
      refreshFacets();
    },
    async sitemapCount() {
      const { count, error } = await db.from('books').select('id', { count: 'planned', head: true });
      if (error) throw new CatalogError('The catalogue is temporarily unavailable.');
      return count ?? 0;
    },
    async sitemapChunk(chunk, size) {
      // Ordered by the primary key, so every chunk is stable between crawls.
      const { data, error } = await db.from('books').select('id,updated_at,is_sample').order('id', { ascending: true }).range(chunk * size, (chunk + 1) * size - 1);
      if (error) throw new CatalogError('The catalogue is temporarily unavailable.');
      return (data as { id: string; updated_at: string | null; is_sample: boolean | null }[])
        .map((r) => ({ id: r.id, updatedAt: r.updated_at, sample: !!r.is_sample }));
    },
  };
}
