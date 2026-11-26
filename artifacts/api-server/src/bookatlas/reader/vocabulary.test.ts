import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_WORDS, addWord, forgetWord, myVocabulary, readVocabulary, recordLookup, vocabularySummary } from './vocabulary.js';
import { accessFor } from '../../auth/policy.js';

test('vocabulary: a word looked up again is moved, not counted twice', () => {
  let list = addWord([], 'Hapi', 'The Nile as a god.', 'book-a', new Date('2026-11-20T10:00:00Z'));
  list = addWord(list, 'stele', 'A carved stone slab.', 'book-a', new Date('2026-11-21T10:00:00Z'));
  list = addWord(list, 'HAPI', 'The Nile as a god.', 'book-b', new Date('2026-11-25T10:00:00Z'));
  assert.deepEqual(list.map((w) => [w.word, w.looks, w.bookId]), [['stele', 1, 'book-a'], ['HAPI', 2, 'book-b']]);
  assert.equal(addWord(list, '', 'x', 'book-a').length, 2, 'empty words are ignored');
  let many: ReturnType<typeof addWord> = [];
  for (let i = 0; i < MAX_WORDS + 20; i += 1) many = addWord(many, `w${i}`, 'd', 'b', new Date(Date.UTC(2026, 0, 1, 0, i)));
  assert.equal(many.length, MAX_WORDS);
  assert.equal(readVocabulary([{ word: 'ok', definition: 'd', bookId: 'b', at: '2026-11-01T00:00:00Z' }, { word: 'x', definition: 'd', bookId: '../x', at: '2026-11-01T00:00:00Z' }, null]).length, 1);
});

test('vocabulary: totals, this week and eight weeks', () => {
  const now = new Date('2026-11-26T12:00:00Z'); // a Thursday
  const list = readVocabulary([
    { word: 'a', definition: 'd', bookId: 'b', at: '2026-11-24T09:00:00Z' }, // this week (Monday 23rd)
    { word: 'b', definition: 'd', bookId: 'b', at: '2026-11-22T09:00:00Z' }, // last week
    { word: 'c', definition: 'd', bookId: 'b', at: '2026-08-01T09:00:00Z' }, // long ago
  ]);
  const s = vocabularySummary(list, now);
  assert.equal(s.total, 3);
  assert.equal(s.thisWeek, 1);
  assert.equal(s.weeks.length, 8);
  assert.deepEqual(s.weeks.slice(-2).map((w) => w.words), [1, 1]);
  assert.equal(s.weeks.at(-1)!.week, '2026-11-23');
  assert.equal(s.recent[0]!.word, 'a');
});

test('vocabulary: kept for the reader, forgotten on request, only for signed-in readers', async () => {
  await recordLookup('user_vocab', 'ankh', 'The sign of life.', 'book-a');
  await recordLookup('user_vocab', 'papyrus', 'A writing material from reeds.', 'book-a');
  assert.equal((await myVocabulary('user_vocab')).total, 2);
  assert.equal((await forgetWord('user_vocab', 'ANKH')).total, 1);
  await assert.rejects(forgetWord('user_vocab', 'nope'), /not in your list/);
  assert.equal(accessFor('GET', '/api/reader/vocabulary'), 'reader');
  assert.equal(accessFor('DELETE', '/api/reader/vocabulary/ankh'), 'reader');
  assert.equal(accessFor('POST', '/api/reader/vocabulary'), 'admin');
});
