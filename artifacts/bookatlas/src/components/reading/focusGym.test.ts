import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addResult, emptyFocus, focusLevel, focusStreak, gridSize, huntBoard, nextLevel, numberGrid, starRound, starScore, suggestSprint, targetSeconds, todaysPlan } from './focusGym';

test('focus gym: number hunt grows from 3 × 3 (children) or 4 × 4 to 5 × 5', () => {
  assert.equal(gridSize(1, 'child'), 3);
  assert.equal(gridSize(1, 'adult'), 4);
  assert.equal(gridSize(10, 'adult'), 5);
  const g = numberGrid(4, 7);
  assert.deepEqual([...g].sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.deepEqual(numberGrid(4, 7), g, 'the same seed, the same grid');
  assert.ok(targetSeconds(3, 1, 'child') > targetSeconds(3, 1, 'adult'));
  assert.ok(targetSeconds(5, 8, 'adult') < targetSeconds(5, 1, 'adult'));
});

test('focus gym: star catcher pace and scoring', () => {
  const kid = starRound(1, 'child', 3), adult = starRound(1, 'adult', 3), fast = starRound(10, 'adult', 3);
  assert.ok(kid.ms > adult.ms && adult.ms > fast.ms && fast.ms >= 450);
  const stars = kid.items.filter((x) => x === 'star').length;
  assert.ok(stars > 12 && stars < 28, 'mostly stars');
  const s = starScore(['star', 'star', 'moon', 'moon'], [true, false, false, true]);
  assert.deepEqual(s, { hits: 1, misses: 1, wrong: 1, held: 1, score: 50 });
});

test('focus gym: word hunt boards have the target 3 to 6 times among look-alikes', () => {
  for (let seed = 0; seed < 20; seed += 1) {
    const b = huntBoard(3, 'adult', seed);
    assert.ok(b.answers.length >= 3 && b.answers.length <= 6);
    assert.ok(b.answers.every((i) => b.cells[i] === b.target));
    assert.equal(b.cells.filter((c) => c === b.target).length, b.answers.length);
  }
  const kid = huntBoard(1, 'early', 2);
  assert.equal(kid.cells.length, 9);
  assert.ok(/\p{Extended_Pictographic}/u.test(kid.target), 'children get pictures');
});

test('focus gym: levels, streak, plan and sprints adapt', () => {
  let p = emptyFocus();
  assert.equal(nextLevel(p, { game: 'numbers', at: '2026-11-26T10:00:00Z', level: 1, score: 90 }), 2, 'strong: up');
  p = addResult(p, { game: 'stars', at: '2026-11-25T10:00:00Z', level: 3, score: 40 });
  assert.equal(nextLevel(p, { game: 'stars', at: '2026-11-26T10:00:00Z', level: 3, score: 45 }), 2, 'two weak in a row: down');
  p = addResult(p, { game: 'numbers', at: '2026-11-26T09:00:00Z', level: 1, score: 95 });
  assert.equal(p.levels.numbers, 2);
  assert.equal(focusLevel(p), 2, "(numbers 2 + stars 3 + words 1) / 3");
  assert.equal(focusStreak(p, new Date('2026-11-26T20:00:00Z')), 2);
  assert.equal(focusStreak(p, new Date('2026-11-28T20:00:00Z')), 0);
  const plan = todaysPlan(p, new Date('2026-11-26T20:00:00Z'));
  assert.equal(plan.items[0], 'breath');
  assert.ok(plan.items.includes('words'), 'the game not done lately comes up');
  assert.deepEqual(plan.done, ['numbers']);
  let s = emptyFocus();
  assert.equal(suggestSprint(s, 'adult'), 10);
  assert.equal(suggestSprint(s, 'child'), 5);
  s = { ...s, sprints: [{ at: 'a', minutes: 10, away: 0, finished: true }, { at: 'b', minutes: 10, away: 0, finished: true }] };
  assert.equal(suggestSprint(s, 'adult'), 15, 'two clean sprints: longer');
  s = { ...s, sprints: [{ at: 'c', minutes: 15, away: 4, finished: false }] };
  assert.equal(suggestSprint(s, 'adult'), 10, 'many interruptions: shorter');
});
