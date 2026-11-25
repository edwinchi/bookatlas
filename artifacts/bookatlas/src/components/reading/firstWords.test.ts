import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_FIRST_WORDS, FIRST_WORDS, PICTURE_BOOKS, findRound, readFirstProgress, recognition, wordKey } from './firstWords';

test('first words: the six groups from the brief, eight words each, picture books with pages', () => {
  assert.deepEqual(FIRST_WORDS.map((g) => g.name), ['Animals', 'Colours', 'Food', 'Family', 'Nature', 'Vehicles']);
  for (const g of FIRST_WORDS) assert.equal(g.words.length, 8, g.id);
  assert.equal(ALL_FIRST_WORDS.length, 48);
  for (const b of PICTURE_BOOKS) assert.ok(b.pages.length >= 5 && b.pages.every((p) => p.text && p.picture), b.id);
});

test('first words: "Find it" has four different pictures, one of them right', () => {
  for (const group of [null, 'animals', 'colours']) {
    for (let round = 0; round < 12; round += 1) {
      const r = findRound(round, group);
      assert.equal(r.choices.length, 4);
      assert.equal(new Set(r.choices.map((c) => c.picture)).size, 4);
      assert.equal(r.choices.filter((c) => c.word === r.target.word).length, 1);
    }
  }
  assert.deepEqual(findRound(3, 'food'), findRound(3, 'food'), 'the same round is the same puzzle');
});

test('first words: progress is read safely', () => {
  const p = readFirstProgress({ heard: [wordKey('animals', 'dog'), 'animals:dog', 'nope:x', 7], found: 3, tries: 2, listenSeconds: -5 });
  assert.deepEqual(p, { heard: ['animals:dog'], found: 3, tries: 3, listenSeconds: 0 });
  assert.equal(recognition(p), 100);
  assert.equal(recognition(readFirstProgress(null)), null);
});
