import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boldStartPieces, buildSteps, clampWpm, focusIndex, measuredWpm, speedPlan, stepMs, summarizeTests, wordsOf, SAMPLE_PASSAGE } from './fastRead';

test('fast read: one word at a time, and groups that stop at the end of a sentence', () => {
  const steps = buildSteps(['The cat jumped over the fence. It ran home.'], 1, 300);
  assert.deepEqual(steps.map((s) => s.text), ['The', 'cat', 'jumped', 'over', 'the', 'fence.', 'It', 'ran', 'home.']);
  const groups = buildSteps(['The cat jumped over the fence. It ran home.', 'Next one.'], 4, 300, 7);
  assert.deepEqual(groups.map((s) => s.text), ['The cat jumped over', 'the fence.', 'It ran home.', 'Next one.']);
  assert.deepEqual(groups.map((s) => s.paragraph), [7, 7, 7, 8]);
  assert.equal(groups.reduce((n, s) => n + s.words, 0), 11);
});

test('fast read: speed limits and longer pauses after sentences', () => {
  assert.equal(clampWpm(50), 100);
  assert.equal(clampWpm(5000), 1500);
  assert.equal(clampWpm(Number.NaN), 300);
  assert.equal(stepMs(['word'], 600), 100);
  assert.ok(stepMs(['end.'], 600) > stepMs(['word'], 600));
  assert.ok(stepMs(['comma,'], 600) > stepMs(['word'], 600));
  assert.ok(stepMs(['extraordinarily'], 600) > stepMs(['word'], 600));
  // The whole passage at 300 words per minute takes about a minute per 300 words.
  const steps = buildSteps(SAMPLE_PASSAGE.split('\n\n'), 1, 300);
  const words = wordsOf(SAMPLE_PASSAGE).length;
  const minutes = steps.reduce((n, s) => n + s.ms, 0) / 60_000;
  assert.ok(minutes > words / 300 && minutes < (words / 300) * 1.4, `${minutes} min for ${words} words`);
});

test('fast read: the focus letter sits a little left of the middle', () => {
  assert.equal(focusIndex('a'), 0);
  assert.equal(focusIndex('read'), 1);
  assert.equal(focusIndex('reading'), 2);
  assert.equal(focusIndex('“Hello'), 2);
  assert.equal(focusIndex('extraordinary,'), 3);
});

test('bold starts keep the text exactly as it was', () => {
  const text = '“Reading intelligence,” she said — and smiled at 3 o’clock.  Twice!';
  const pieces = boldStartPieces(text);
  assert.equal(pieces.map((p) => p.text).join(''), text);
  assert.deepEqual(pieces.filter((p) => p.bold).map((p) => p.text).slice(0, 4), ['Read', 'intell', 's', 'sa']);
  assert.equal(boldStartPieces('').length, 0);
  assert.equal(boldStartPieces('Ça va très bien').map((p) => p.text).join(''), 'Ça va très bien');
});

test('reading speed: measured, summarised and planned', () => {
  assert.equal(measuredWpm(300, 60), 300);
  assert.equal(measuredWpm(10, 60), null);
  assert.equal(measuredWpm(300, 2), null);
  const s = summarizeTests([
    { at: '2026-11-02T10:00:00Z', wpm: 260, words: 300, seconds: 69, source: 'sample' },
    { at: '2026-11-01T10:00:00Z', wpm: 220, words: 300, seconds: 82, source: 'book' },
    { at: '2026-11-03T10:00:00Z', wpm: 240, words: 300, seconds: 75, source: 'book' },
  ]);
  assert.deepEqual(s, { latest: 240, average: 240, best: 260, count: 3, change: 20 });
  assert.deepEqual(summarizeTests([]), { latest: null, average: null, best: null, count: 0, change: null });
  const plan = speedPlan(240, 600);
  assert.equal(plan.steps[plan.steps.length - 1], 600);
  assert.ok(plan.weeks >= 9 && plan.weeks <= 11, String(plan.weeks));
  assert.equal(speedPlan(500, 400).weeks, 0);
});
