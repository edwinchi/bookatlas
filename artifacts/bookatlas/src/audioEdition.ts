import type { Book } from './types';

/**
 * The natural audiobook add-on (cycle 9): sold as the product `<bookId>.audio` next to the eBook. The server
 * prices it from the catalogue; this only builds the cart line and answers "is it on sale / owned".
 */
export const AUDIO_SUFFIX = '.audio';
export const audioIdOf = (bookId: string) => `${bookId}${AUDIO_SUFFIX}`;
export const isAudioAddOn = (id: string) => id.endsWith(AUDIO_SUFFIX);
/** Narrated: shows the 🎧 badge and the narrated preview. */
export const isNarrated = (book: Book) => !!book.hasReaderContent && book.format === 'bundle';
/** Narrated and sold as an add-on (otherwise the narration comes with the eBook). */
export const audioOnSale = (book: Book) => isNarrated(book) && (book.audioPrice ?? 0) > 0;

export function audioProductOf(book: Book): Book {
  const price = book.audioPrice ?? 0;
  return { ...book, id: audioIdOf(book.id), title: `${book.title} (natural audiobook)`, format: 'audiobook', price, originalPrice: price, isDeal: false };
}
