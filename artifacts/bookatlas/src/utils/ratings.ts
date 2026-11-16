import type { Book } from '../types';

/**
 * Only real reader reviews are shown (EU Omnibus; owner rule). Reviews exist only for books published on
 * BooksAtlas (with reader content); sample titles from the demo catalogue never show a rating or a review count,
 * even when their record carries one.
 */
export const isSampleTitle = (book: Pick<Book, 'isSample' | 'hasReaderContent' | 'availability'>) =>
  !!book.isSample || (!book.hasReaderContent && book.availability !== 'listed');

export const hasRealRating = (book: Pick<Book, 'isSample' | 'hasReaderContent' | 'availability' | 'reviewCount'>) =>
  !isSampleTitle(book) && !!book.hasReaderContent && book.reviewCount > 0;
