import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { logger } from '../../lib/logger.js';
import { readerAccess } from '../ebookPrep/service.js';
import { submissionForBook } from '../ebookPrep/submissions.js';
import { hasPurchase, purchasesOf } from '../payments/purchases.js';
import { VOICE_LABELS, type NarrationVoice } from './plan.js';

/**
 * The natural audiobook as its own product (cycle 9, 2026-11-15). Once a book is narrated the author may sell
 * the audiobook as an add-on to the eBook: the product `<bookId>.audio`, bought through the same cart, Stripe
 * or crypto checkout, invoice and refund flow as an eBook, with the same author share. With no add-on price the
 * narration stays included with the eBook (as before). Readers who bought the eBook before the add-on went on
 * sale keep the full narration.
 */

export const AUDIO_SUFFIX = '.audio';
export const audioId = (bookId: string) => `${bookId}${AUDIO_SUFFIX}`;
/** The eBook an audiobook add-on belongs to, or null for any other product id. */
export const baseOfAudio = (id: string) => (id.endsWith(AUDIO_SUFFIX) ? id.slice(0, -AUDIO_SUFFIX.length) : null);
export const MIN_AUDIO_PRICE = 0.99;
export const MAX_AUDIO_PRICE = 999;

/** Narrated, prepared and priced: the add-on can be bought. */
export const audioForSale = (book: Book | null | undefined): book is Book =>
  !!book?.hasReaderContent && book.format === 'bundle' && (book.audioPrice ?? 0) > 0;

/** The add-on as a product line: everything checkout, invoices and royalties need, priced from the catalogue. */
export function audioProduct(book: Book): Book {
  const price = book.audioPrice!;
  return {
    ...book, id: audioId(book.id), title: `${book.title} (natural audiobook)`, format: 'audiobook',
    price, originalPrice: price, isDeal: false, superPointsEarned: Math.round(price * 10),
  };
}

/** A catalogue lookup that also answers for `<bookId>.audio` (null unless the add-on is on sale). */
export function withAudioEditions(findBook: (id: string) => Promise<Book | null | undefined>) {
  return async (id: string): Promise<Book | null | undefined> => {
    const base = baseOfAudio(id);
    if (!base) return findBook(id);
    const book = await findBook(base);
    return audioForSale(book) ? audioProduct(book) : null;
  };
}

/** The catalogue fields of a narrated book: the 🎧 badge, the Audiobooks filter and shelf, the length. */
export const narratedFields = (n: { voice: NarrationVoice; seconds: number }) => ({
  format: 'bundle' as const,
  narrator: `${VOICE_LABELS[n.voice]?.split(':')[0] ?? n.voice} (BooksAtlas natural voice)`,
  audioDurationMinutes: Math.max(1, Math.round(n.seconds / 60)),
});

const cache = new Map<string, { access: 'full' | 'preview'; at: number }>();
const CACHE_MS = 60_000;
export const forgetAudioAccess = () => cache.clear();

/** How much of the narration this listener may hear. */
export async function audioAccess(bookId: string, book: Book | null | undefined, who: Identity | undefined): Promise<'full' | 'preview'> {
  const ebook = await readerAccess(bookId, who, book?.price);
  if (!who) return 'preview';
  if (who.role === 'admin') return 'full';
  // No add-on price: the narration is part of the eBook.
  if (!book || !((book.audioPrice ?? 0) > 0)) return ebook;
  const key = `${who.id}:${bookId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.access;
  let access: 'full' | 'preview' = 'preview';
  try {
    if ((await submissionForBook(bookId))?.owner_id === who.id) access = 'full';
    else if (await hasPurchase(who.id, audioId(bookId))) access = 'full';
    else if (ebook === 'full' && book.audioPricedAt) {
      // Bought the eBook while the narration was still included: it stays theirs.
      const since = Date.parse(book.audioPricedAt);
      if ((await purchasesOf(who.id)).some((p) => p.book_id === bookId && p.status === 'paid' && Date.parse(p.created_at) < since)) access = 'full';
    }
  } catch (err) {
    logger.warn({ err, event: 'audiobook.access_lookup_failed' }, 'Audiobook access lookup failed; preview shown');
    return 'preview';
  }
  if (cache.size > 5000) cache.clear();
  cache.set(key, { access, at: Date.now() });
  return access;
}
