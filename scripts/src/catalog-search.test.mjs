import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterCatalog } from '../../artifacts/bookatlas/src/catalog.ts';
const filters = { searchQuery: '', genre: 'All Genres', format: 'all', priceCategory: 'all', minRating: 0, sortBy: 'featured', bookatlasPlusOnly: false };
const books = [
  { id: 'a', title: 'L’Étranger', author: 'Albert Camus', primaryGenre: 'Classics', genres: ['Classics'], tags: ['France'], language: 'French', format: 'ebook', price: 3, rating: 4.7 },
  { id: 'b', title: 'Dune', author: 'Frank Herbert', primaryGenre: 'Science Fiction', genres: [], tags: [], language: 'English', format: 'bundle', price: 8, rating: 4.9 },
];
test('search trims whitespace, ignores accents and combines words across metadata', () => {
  assert.deepEqual(filterCatalog(books, { ...filters, searchQuery: '  etranger   camus  ' }, 'store').map(b => b.id), ['a']);
  assert.deepEqual(filterCatalog(books, { ...filters, searchQuery: 'science herbert' }, 'store').map(b => b.id), ['b']);
});
test('language, price, format and tab constraints combine; source order stays untouched', () => {
  assert.deepEqual(filterCatalog(books, { ...filters, language: 'French', priceCategory: 'under5' }, 'store').map(b => b.id), ['a']);
  assert.deepEqual(filterCatalog(books, { ...filters, language: 'French' }, 'audiobooks'), []);
  assert.deepEqual(filterCatalog(books, { ...filters, format: 'audiobook' }, 'store').map(b => b.id), ['b']);
  assert.deepEqual(filterCatalog(books, { ...filters, sortBy: 'rating' }, 'store').map(b => b.id), ['b', 'a']);
  assert.deepEqual(books.map(b => b.id), ['a', 'b']);
});

test('ISBN search accepts stored hyphenated identifiers and newest uses publication dates', () => {
  const catalog = [
    { ...books[0], isbn: '978-1-2345-6789-0', publishDate: '2020-01-01', isNewRelease: true },
    { ...books[1], isbn: '9780000000000', publishDate: '2026-10-01', isNewRelease: false },
    { ...books[0], id: 'c', publishDate: 'not-a-date', isNewRelease: true },
  ];
  assert.deepEqual(filterCatalog(catalog, { ...filters, searchQuery: '9781234567890' }, 'store').map(book => book.id), ['a']);
  assert.deepEqual(filterCatalog(catalog, { ...filters, sortBy: 'newest' }, 'store').map(book => book.id), ['b', 'a', 'c']);
});
