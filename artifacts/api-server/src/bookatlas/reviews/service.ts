import { randomUUID } from 'node:crypto';
import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { bookatlasDb } from '../db/supabaseClient.js';
import { submissionForBook } from '../ebookPrep/submissions.js';
import { purchasedBookIds } from '../payments/purchases.js';

/**
 * Reader reviews and ratings (TASK-0009). Only real reviews: buyers of paid books (verified purchase) and
 * signed-in readers of free books; never the book's author; one per reader per book; plain text.
 */
export interface Review {
  id: string; book_id: string; user_id: string; display_name: string; rating: number; title: string | null; body: string;
  verified_purchase: boolean; status: 'published' | 'hidden'; created_at: string; updated_at: string;
}
export class ReviewError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export interface ReviewCatalog { get(id: string): Promise<Book | null | undefined>; setRating(book: Book, rating: number, count: number): Promise<void> }

const memory = new Map<string, Review>();
const db = () => bookatlasDb;
const COLUMNS = 'id,book_id,user_id,display_name,rating,title,body,verified_purchase,status,created_at,updated_at';

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');
/** First name and initial only, so reviewers are not fully identified in public. */
export const publicName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'BooksAtlas reader';
  return parts.length === 1 ? parts[0]!.slice(0, 40) : `${parts[0]!.slice(0, 40)} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
};

async function forBook(bookId: string, includeHidden = false): Promise<Review[]> {
  if (!db()) return [...memory.values()].filter((r) => r.book_id === bookId && (includeHidden || r.status === 'published')).sort((a, b) => b.created_at.localeCompare(a.created_at));
  let q = db()!.from('reviews').select(COLUMNS).eq('book_id', bookId).order('created_at', { ascending: false }).limit(500);
  if (!includeHidden) q = q.eq('status', 'published');
  const r = await q;
  if (r.error) throw new ReviewError('Reviews could not be loaded.', 503);
  return r.data as Review[];
}
async function mine(bookId: string, userId: string): Promise<Review | null> {
  if (!db()) return [...memory.values()].find((r) => r.book_id === bookId && r.user_id === userId) ?? null;
  const r = await db()!.from('reviews').select(COLUMNS).eq('book_id', bookId).eq('user_id', userId).maybeSingle();
  if (r.error) throw new ReviewError('Your review could not be loaded.', 503);
  return r.data as Review | null;
}

export function summarize(reviews: Review[]) {
  const visible = reviews.filter((r) => r.status === 'published');
  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: visible.filter((r) => r.rating === stars).length }));
  const average = visible.length ? Math.round((visible.reduce((n, r) => n + r.rating, 0) / visible.length) * 10) / 10 : 0;
  return { average, count: visible.length, breakdown };
}
const view = (r: Review) => ({ id: r.id, name: r.display_name, rating: r.rating, title: r.title, body: r.body, verifiedPurchase: r.verified_purchase, date: r.created_at, edited: r.updated_at !== r.created_at });

/** Public: the visible reviews of a book with the average and the 5-to-1 star breakdown. */
export async function bookReviews(bookId: string) {
  const all = await forBook(bookId);
  return { ...summarize(all), reviews: all.slice(0, 100).map(view) };
}

/** Whether this reader may review the book, and their review if they wrote one. */
export async function eligibility(who: Identity, book: Book) {
  if (!book.hasReaderContent || book.isSample) return { canReview: false, reason: 'Only books published on BooksAtlas can be reviewed.' } as const;
  const submission = await submissionForBook(book.id);
  if (submission?.owner_id === who.id) return { canReview: false, reason: 'Authors cannot review their own books.' } as const;
  const bought = (await purchasedBookIds(who.id)).includes(book.id);
  if (book.price > 0 && !bought) return { canReview: false, reason: 'Buy this book to review it.' } as const;
  return { canReview: true, verifiedPurchase: bought } as const;
}

async function refreshRating(catalog: ReviewCatalog, bookId: string) {
  const book = await catalog.get(bookId);
  if (!book) return;
  const { average, count } = summarize(await forBook(bookId));
  if (book.rating !== average || book.reviewCount !== count) await catalog.setRating(book, average, count);
}

export async function saveReview(who: Identity, catalog: ReviewCatalog, bookId: string, input: { rating?: unknown; title?: unknown; body?: unknown }) {
  const book = await catalog.get(bookId);
  if (!book) throw new ReviewError('Book not found.', 404);
  const allowed = await eligibility(who, book);
  if (!allowed.canReview) throw new ReviewError(allowed.reason, 403);
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ReviewError('Choose 1 to 5 stars.');
  const body = clean(input.body, 2000);
  if (body.length < 20) throw new ReviewError('Write at least 20 characters about the book.');
  const title = clean(input.title, 120) || null;
  const now = new Date().toISOString();
  const existing = await mine(bookId, who.id);
  const review: Review = {
    id: existing?.id ?? randomUUID(), book_id: bookId, user_id: who.id, display_name: publicName(who.name || ''), rating, title, body,
    verified_purchase: allowed.verifiedPurchase, status: existing?.status ?? 'published', created_at: existing?.created_at ?? now, updated_at: now,
  };
  if (!db()) memory.set(review.id, review);
  else {
    const r = await db()!.from('reviews').upsert(review, { onConflict: 'book_id,user_id' });
    if (r.error) throw new ReviewError('Your review could not be saved.', 503);
  }
  await refreshRating(catalog, bookId);
  return view(review);
}

export async function deleteReview(who: Identity, catalog: ReviewCatalog, bookId: string) {
  const existing = await mine(bookId, who.id);
  if (!existing) throw new ReviewError('You have not reviewed this book.', 404);
  if (!db()) memory.delete(existing.id);
  else {
    const r = await db()!.from('reviews').delete().eq('id', existing.id);
    if (r.error) throw new ReviewError('Your review could not be deleted.', 503);
  }
  await refreshRating(catalog, bookId);
}

export async function myReview(who: Identity, catalog: ReviewCatalog, bookId: string) {
  const book = await catalog.get(bookId);
  if (!book) throw new ReviewError('Book not found.', 404);
  const [allowed, review] = await Promise.all([eligibility(who, book), mine(bookId, who.id)]);
  return { ...allowed, review: review ? { ...view(review), hidden: review.status === 'hidden' } : null };
}

/** Administrators hide a review that breaks the rules (or show it again); the rating follows. */
export async function moderate(catalog: ReviewCatalog, id: string, status: 'published' | 'hidden') {
  let bookId: string | undefined;
  if (!db()) { const r = memory.get(id); if (r) { r.status = status; bookId = r.book_id; } }
  else {
    const r = await db()!.from('reviews').update({ status }).eq('id', id).select('book_id');
    if (r.error) throw new ReviewError('The review could not be updated.', 503);
    bookId = (r.data as { book_id: string }[])[0]?.book_id;
  }
  if (!bookId) throw new ReviewError('Review not found.', 404);
  await refreshRating(catalog, bookId);
  return { id, status };
}

/** A reader's own reviews, for the GDPR data export and account erasure. */
export async function reviewsOf(userId: string) {
  if (!db()) return [...memory.values()].filter((r) => r.user_id === userId).map(view);
  const r = await db()!.from('reviews').select(COLUMNS).eq('user_id', userId);
  if (r.error) throw new ReviewError('Reviews could not be read.', 503);
  return (r.data as Review[]).map(view);
}
export async function eraseReviewsOf(userId: string, catalog: ReviewCatalog) {
  const books = new Set((await reviewsOfRaw(userId)).map((r) => r.book_id));
  if (!db()) { for (const [k, r] of memory) if (r.user_id === userId) memory.delete(k); }
  else {
    const r = await db()!.from('reviews').delete().eq('user_id', userId);
    if (r.error) throw new ReviewError('Reviews could not be erased.', 503);
  }
  for (const b of books) await refreshRating(catalog, b);
}
async function reviewsOfRaw(userId: string): Promise<Review[]> {
  if (!db()) return [...memory.values()].filter((r) => r.user_id === userId);
  const r = await db()!.from('reviews').select('book_id').eq('user_id', userId);
  return (r.data ?? []) as Review[];
}
