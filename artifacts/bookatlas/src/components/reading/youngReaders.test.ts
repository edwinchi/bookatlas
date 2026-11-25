import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOUNDS, STORIES, WORDS, pictureRound, sameWord, scramble, shuffle, storyStars } from './youngReaders';

test('young readers: stories have three answerable questions each, at every level', () => {
  for (const level of [1, 2, 3] as const) assert.ok(STORIES.filter((s) => s.level === level).length >= 2);
  for (const s of STORIES) {
    assert.equal(s.questions.length, 3, s.id);
    for (const q of s.questions) assert.ok(q.answer >= 0 && q.answer < q.options.length, `${s.id}: ${q.question}`);
  }
  assert.equal(new Set(STORIES.map((s) => s.id)).size, STORIES.length);
  assert.equal(new Set(SOUNDS.map((s) => s.id)).size, SOUNDS.length);
  for (const level of [1, 2, 3] as const) assert.ok(WORDS[level].length >= 8);
});

test('young readers: games are fair and repeatable', () => {
  assert.notEqual(scramble('cat', 1).join(''), 'cat');
  assert.deepEqual([...scramble('rocket', 4)].sort(), [...'rocket'].sort());
  assert.deepEqual(scramble('rocket', 4), scramble('rocket', 4), 'the same seed gives the same puzzle');
  assert.deepEqual([...shuffle([1, 2, 3, 4], 9)].sort(), [1, 2, 3, 4]);
  const r = pictureRound(2, 5);
  assert.equal(r.choices.length, 3);
  assert.ok(r.choices.some((c) => c.word === r.target.word));
  assert.equal(new Set(r.choices.map((c) => c.word)).size, 3);
  assert.ok(sameWord(' Cat ', 'cat'));
  assert.ok(!sameWord('cot', 'cat'));
  assert.equal(storyStars(3, 3), 4);
  assert.equal(storyStars(2, 3), 2);
});
