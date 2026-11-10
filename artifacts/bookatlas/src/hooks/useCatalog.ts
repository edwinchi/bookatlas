import { useCallback, useEffect, useRef, useState } from 'react';
import { catalogQueryParams, type CatalogQuery, type ShelfId } from '@workspace/bookatlas-catalog/query';
import type { Book } from '../types';

/**
 * The storefront asks the API for small pages (TASK-0005); it never downloads or filters the
 * whole catalogue. Cards lack the heavy fields, so they get safe empty defaults until the book
 * page loads the full record.
 */
const asBook = (card: Partial<Book>): Book => ({ sampleChapters: [], reviews: [], editorialReview: '', authorBio: '', ...card }) as Book;

export interface CatalogFacets {
  total: number;
  categories: { name: string; count: number }[];
  languages: { name: string; count: number }[];
  formats: { name: string; count: number }[];
}

export function useCatalogSearch(query: CatalogQuery) {
  const key = catalogQueryParams({ ...query, page: undefined }).toString();
  const [state, setState] = useState({ books: [] as Book[], total: 0, page: 1, hasMore: false, loading: true, error: '' });
  const inflight = useRef<AbortController | null>(null);

  const load = useCallback((page: number, append: boolean) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setState((s) => ({ ...s, loading: true, error: '' }));
    const params = new URLSearchParams(key);
    if (page > 1) params.set('page', String(page));
    fetch(`/api/catalog/search?${params}`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error('The catalogue is temporarily unavailable.'); return res.json(); })
      .then((data: { books: Partial<Book>[]; total: number; page: number; hasMore: boolean }) => {
        if (controller.signal.aborted) return;
        setState((s) => {
          const books = data.books.map(asBook);
          const merged = append ? [...s.books, ...books.filter((b) => !s.books.some((x) => x.id === b.id))] : books;
          return { books: merged, total: data.total, page: data.page, hasMore: data.hasMore, loading: false, error: '' };
        });
      })
      .catch((err: Error) => { if (!controller.signal.aborted) setState((s) => ({ ...s, loading: false, error: err.message })); });
  }, [key]);

  // A new query replaces the results; typing is debounced so each keystroke is not a request.
  useEffect(() => {
    const timer = window.setTimeout(() => load(1, false), query.q ? 220 : 0);
    return () => { window.clearTimeout(timer); inflight.current?.abort(); };
  }, [load]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const loadMore = useCallback(() => {
    const s = stateRef.current;
    if (s.hasMore && !s.loading) load(s.page + 1, true);
  }, [load]);

  return { ...state, loadMore };
}

export function useShelves(ids: ShelfId[]) {
  const [shelves, setShelves] = useState<Partial<Record<ShelfId, Book[]>>>({});
  const key = ids.join(',');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/catalog/shelves?ids=${key}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { shelves: {} }))
      .then((data: { shelves: Record<string, Partial<Book>[]> }) => {
        if (!controller.signal.aborted) setShelves(Object.fromEntries(Object.entries(data.shelves).map(([id, list]) => [id, list.map(asBook)])));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [key]);
  return shelves;
}

export function useCatalogFacets() {
  const [facets, setFacets] = useState<CatalogFacets | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/catalog/facets', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!controller.signal.aborted && data) setFacets(data); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return facets;
}

const fullBooks = new Map<string, Book>();

/** The whole record of one book (sample chapters, reviews, author bio), cached for the session. */
export async function fetchFullBook(id: string): Promise<Book | null> {
  const cached = fullBooks.get(id);
  if (cached) return cached;
  const res = await fetch(`/api/catalog/books/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const { book } = await res.json() as { book: Book };
  if (fullBooks.size > 200) fullBooks.delete(fullBooks.keys().next().value!);
  fullBooks.set(id, book);
  return book;
}

export const needsFullRecord = (book: Book) => !book.sampleChapters?.length && !book.reviews?.length && !book.authorBio;
