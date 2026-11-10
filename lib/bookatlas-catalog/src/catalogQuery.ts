/**
 * One definition of catalogue search, filters, sorting and home-page shelves (TASK-0005).
 * The API answers these queries from Postgres for the full catalogue (1.5M+ titles) and from
 * memory on the local stack; both follow this file. The browser never filters the catalogue.
 */
import type { Book } from './types';
import { AFRICAN_LITERATURE_GENRES, CONSCIOUSNESS_COMMUNITY_GENRES } from './data/booksData';

export type CatalogSort = 'featured' | 'bestseller' | 'rating' | 'priceAsc' | 'priceDesc' | 'newest';
export type CatalogFormat = 'all' | 'ebook' | 'audiobook';
export type CatalogPrice = 'all' | 'free' | 'under5' | 'under10' | 'deals';

export interface CatalogQuery {
  q?: string;
  genre?: string;
  /** Any of these categories (home-page shelves). */
  genresAny?: string[];
  format?: CatalogFormat;
  price?: CatalogPrice;
  minRating?: number;
  language?: string;
  plusOnly?: boolean;
  /** Audio available (audiobook, bundle, or an eBook with an audio edition). */
  hasAudio?: boolean;
  editorPick?: boolean;
  sort?: CatalogSort;
  page?: number;
  limit?: number;
}

/** Page sizes stay small so every response is fast; deep pages ask the reader to refine. */
export const PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE = 400;

const SORTS: CatalogSort[] = ['featured', 'bestseller', 'rating', 'priceAsc', 'priceDesc', 'newest'];
const FORMATS: CatalogFormat[] = ['all', 'ebook', 'audiobook'];
const PRICES: CatalogPrice[] = ['all', 'free', 'under5', 'under10', 'deals'];

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Everything a reader may search a book by, normalised (accents removed, lower case). */
export function searchTextOf(book: Book): string {
  return normalizeSearch([
    book.title, book.subtitle, book.author, book.narrator, book.primaryGenre, book.isbn,
    book.isbn?.replace(/[^0-9Xx]/g, ''), ...(book.genres || []), ...(book.tags || []),
  ].filter(Boolean).join(' '));
}

export const searchTerms = (q: string | undefined) => normalizeSearch(q ?? '').split(/\s+/).filter(Boolean).slice(0, 12);

export const hasAudio = (book: Book) => book.format === 'audiobook' || book.format === 'bundle' || !!book.audioDurationMinutes;
export const genresOf = (book: Book) => [...new Set([book.primaryGenre, ...(book.genres ?? [])].filter(Boolean))];

/** Read a query from URL parameters, clamping everything to safe values. */
export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const pick = <T extends string>(value: string | null, allowed: T[], fallback: T) => (allowed as string[]).includes(value ?? '') ? value as T : fallback;
  const text = (key: string, max = 120) => params.get(key)?.trim().slice(0, max) || undefined;
  const genre = text('genre');
  const rating = Number(params.get('minRating'));
  const page = Math.trunc(Number(params.get('page')));
  const limit = Math.trunc(Number(params.get('limit')));
  return {
    q: text('q', 200),
    genre: genre && genre !== 'All Genres' ? genre : undefined,
    format: pick(params.get('format'), FORMATS, 'all'),
    price: pick(params.get('price'), PRICES, 'all'),
    minRating: Number.isFinite(rating) && rating > 0 ? Math.min(rating, 5) : undefined,
    language: text('language', 40) === 'all' ? undefined : text('language', 40),
    plusOnly: params.get('plus') === '1' || undefined,
    hasAudio: params.get('audio') === '1' || undefined,
    sort: pick(params.get('sort'), SORTS, 'featured'),
    page: Number.isFinite(page) && page > 1 ? Math.min(page, MAX_PAGE) : 1,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_PAGE_SIZE) : PAGE_SIZE,
  };
}

/** The same query as URL parameters (the browser's side of `parseCatalogQuery`). */
export function catalogQueryParams(query: CatalogQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (query.q?.trim()) p.set('q', query.q.trim());
  if (query.genre) p.set('genre', query.genre);
  if (query.format && query.format !== 'all') p.set('format', query.format);
  if (query.price && query.price !== 'all') p.set('price', query.price);
  if (query.minRating) p.set('minRating', String(query.minRating));
  if (query.language) p.set('language', query.language);
  if (query.plusOnly) p.set('plus', '1');
  if (query.hasAudio) p.set('audio', '1');
  if (query.sort && query.sort !== 'featured') p.set('sort', query.sort);
  if (query.page && query.page > 1) p.set('page', String(query.page));
  if (query.limit && query.limit !== PAGE_SIZE) p.set('limit', String(query.limit));
  return p;
}

/** In-memory matching, for the local stack and tests. Postgres matches whole-word prefixes instead of substrings. */
export function matchesQuery(book: Book, query: CatalogQuery, searchText = searchTextOf(book)): boolean {
  const terms = searchTerms(query.q);
  if (!terms.every((t) => searchText.includes(t))) return false;
  const genres = genresOf(book);
  if (query.genre && !genres.includes(query.genre)) return false;
  if (query.genresAny?.length && !query.genresAny.some((g) => genres.includes(g))) return false;
  if (query.format === 'ebook' && book.format !== 'ebook' && book.format !== 'bundle') return false;
  if (query.format === 'audiobook' && book.format !== 'audiobook' && book.format !== 'bundle') return false;
  if (query.hasAudio && !hasAudio(book)) return false;
  if (query.plusOnly && !book.isBookatlasPlus) return false;
  if (query.editorPick && !book.isEditorPick) return false;
  if (query.language && book.language !== query.language) return false;
  if (query.price === 'free' && book.price > 0) return false;
  if (query.price === 'under5' && book.price > 4.99) return false;
  if (query.price === 'under10' && book.price > 9.99) return false;
  if (query.price === 'deals' && !book.isDeal && book.price > 4.99) return false;
  if (query.minRating && book.rating < query.minRating) return false;
  return true;
}

export const popularityOf = (book: Book) => Math.round((book.rating || 0) * Math.log10(10 + (book.reviewCount || 0)) * 1000) / 1000;
export const publishedAt = (book: Book) => { const t = Date.parse(book.publishDate); return Number.isFinite(t) ? t : 0; };

export function compareBooks(sort: CatalogSort = 'featured') {
  const tie = (a: Book, b: Book) => popularityOf(b) - popularityOf(a) || a.id.localeCompare(b.id);
  return (a: Book, b: Book) => {
    if (sort === 'rating') return b.rating - a.rating || tie(a, b);
    if (sort === 'priceAsc') return a.price - b.price || tie(a, b);
    if (sort === 'priceDesc') return b.price - a.price || tie(a, b);
    if (sort === 'bestseller') return Number(!!b.isBestseller) - Number(!!a.isBestseller) || tie(a, b);
    if (sort === 'newest') return publishedAt(b) - publishedAt(a) || tie(a, b);
    return Number(!!b.isEditorPick) - Number(!!a.isEditorPick) || tie(a, b);
  };
}

/** What a list or shelf shows of a book; the book page loads the rest. */
export type BookCard = Omit<Book, 'sampleChapters' | 'reviews' | 'editorialReview' | 'authorBio'>;

export function toCard(book: Book): BookCard {
  const { sampleChapters: _s, reviews: _r, editorialReview: _e, authorBio: _a, ...card } = book;
  return { ...card, synopsis: card.synopsis.length > 400 ? `${card.synopsis.slice(0, 397)}…` : card.synopsis };
}

/** Home-page shelves, answered by the API as small queries instead of filtering the whole catalogue. */
export const SHELVES = {
  hero: { editorPick: true, limit: 8 },
  featured: { limit: 12 },
  african: { genresAny: [...AFRICAN_LITERATURE_GENRES], limit: 12 },
  consciousness: { genresAny: [...CONSCIOUSNESS_COMMUNITY_GENRES, 'Spiritual Healing & Alignment'], limit: 12 },
  amsterdam: { genresAny: ['Dutch & European Classics', 'Historical Fiction'], limit: 12 },
  plus: { plusOnly: true, limit: 12 },
  scifi: { genresAny: ['Sci-Fi & Fantasy'], limit: 12 },
  audio: { hasAudio: true, limit: 12 },
  thriller: { genresAny: ['Mystery & Suspense', 'Thriller & Crime'], limit: 12 },
  newest: { sort: 'newest', limit: 12 },
} satisfies Record<string, CatalogQuery>;
export type ShelfId = keyof typeof SHELVES;
