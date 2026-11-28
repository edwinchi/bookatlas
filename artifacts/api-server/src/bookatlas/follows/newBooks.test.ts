import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newFromFollowed } from './newBooks';

test('new from authors you follow: recent books, newest first, no samples, no repeats', () => {
  const now = new Date('2026-11-28T12:00:00Z');
  const list = newFromFollowed([
    { slug: 'ada', followedAt: '2026-01-01T00:00:00Z', books: [
      { id: 'a1', title: 'Old', author: 'Ada', publishDate: '2025-02-01' },
      { id: 'a2', title: 'Recent', author: 'Ada', publishDate: '2026-10-01' },
      { id: 'a3', title: 'Sample', author: 'Ada', publishDate: '2026-11-01', isSample: true },
      { id: 'a4', title: 'Future', author: 'Ada', publishDate: '2027-03-01' },
    ] },
    { slug: 'ben', books: [{ id: 'b1', title: 'Newest', author: 'Ben', publishDate: '2026-11-20' }, { id: 'a2', title: 'Recent', author: 'Ada', publishDate: '2026-10-01' }] },
  ], now);
  assert.deepEqual(list.map((b) => b.id), ['b1', 'a2']);
  assert.equal(list[0]!.authorSlug, 'ben');
});

test('new from authors you follow: a book out since the reader followed still counts, past the window', () => {
  const now = new Date('2026-11-28T12:00:00Z');
  const list = newFromFollowed([{ slug: 'ada', followedAt: '2026-03-01T00:00:00Z', books: [{ id: 'a1', title: 'Spring', author: 'Ada', publishDate: '2026-04-01' }, { id: 'a0', title: 'Before', author: 'Ada', publishDate: '2026-02-01' }] }], now);
  assert.deepEqual(list.map((b) => b.id), ['a1']);
});
