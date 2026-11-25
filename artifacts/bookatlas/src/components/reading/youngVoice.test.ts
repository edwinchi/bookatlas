import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clipKey, findPhrase, wordAtTime, youngClipTexts } from './youngVoice';
import { PICTURE_BOOKS } from './firstWords';
import { STORIES } from './youngReaders';

test('young voice: stable keys, one per text, every spoken text listed', () => {
  assert.equal(clipKey('The  cat sat. '), clipKey('The cat sat.'));
  assert.notEqual(clipKey('The cat sat.'), clipKey('The cat sat!'));
  assert.match(clipKey('Hello'), /^[0-9a-z]+$/);
  const texts = youngClipTexts();
  assert.equal(new Set(texts).size, texts.length);
  assert.equal(new Set(texts.map(clipKey)).size, texts.length, 'no two texts share a key');
  assert.ok(texts.includes(STORIES[0]!.paragraphs[0]!));
  assert.ok(texts.includes(PICTURE_BOOKS[0]!.pages[0]!.text));
  assert.ok(texts.includes(findPhrase('cat')) || texts.some((t) => t.startsWith('Find the ')));
});

test('young voice: the word being said follows the recorded pieces', () => {
  const text = 'The cat sat. It was happy.';
  const timing = { d: 3, t: [[0, 0.1, 1.1], [13, 1.4, 2.6]] as [number, number, number][] };
  assert.equal(wordAtTime(text, timing, 0), null, 'nothing before the voice starts');
  assert.equal(wordAtTime(text, timing, 0.15), 0); // The
  assert.equal(wordAtTime(text, timing, 0.6), 4); // cat
  assert.equal(wordAtTime(text, timing, 1.05), 8); // sat.
  assert.equal(wordAtTime(text, timing, 1.3), 8, 'the pause keeps the last word');
  assert.equal(wordAtTime(text, timing, 1.45), 13); // It
  assert.equal(wordAtTime(text, timing, 2.9), 20); // happy.
});
