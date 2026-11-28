import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retrieve, stem } from './ai';

const chapters = [
  { title: 'The valley', content: ['The farmers walked to the market every morning.', 'Their houses stood by the old bridge.'] },
  { title: 'The storm', content: ['A storm broke the bridge in the night.', 'Nobody could cross the river for a week.'] },
];

test('ask the book: word forms meet, and a passage that matches carries its score', () => {
  assert.equal(stem('walking'), 'walk');
  assert.equal(stem('walked'), 'walk');
  assert.equal(stem('houses'), 'house');
  assert.equal(stem('glass'), 'glass');
  const hit = retrieve(chapters, 'Who walks to the market?');
  assert.equal(hit[0]?.chapterIndex, 0);
  assert.ok(hit[0]!.score > 0);
});

test('ask the book: a question without matching words falls back to the reader\'s chapter, with no score', () => {
  const miss = retrieve(chapters, 'Que se passe-t-il pendant la tempête ?', { chapterIndex: 1 });
  assert.ok(miss.length > 0 && miss.every((p) => p.chapterIndex === 1 && p.score === 0));
  // The search words the AI gives back, in the book's language, then find the passage.
  assert.equal(retrieve(chapters, 'storm night bridge', { chapterIndex: 0 })[0]?.chapterIndex, 1);
});
