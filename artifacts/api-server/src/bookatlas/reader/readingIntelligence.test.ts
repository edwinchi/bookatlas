import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSpeedTests } from './service.js';
import { EXPLAIN_LEVELS, STUDY_KINDS, explainLevel } from './ai.js';

test('reading speed checks are cleaned, deduplicated and capped at 30', () => {
  const ok = { at: '2026-11-25T10:00:00.000Z', wpm: 280, words: 290, seconds: 62, source: 'sample' };
  const list = cleanSpeedTests([
    ok, { ...ok }, // the same check twice
    { at: 'not a date', wpm: 300, words: 300, seconds: 60 },
    { at: '2026-11-24T10:00:00Z', wpm: 5, words: 300, seconds: 60 }, // impossible speed
    { at: '2026-11-23T10:00:00Z', wpm: 1.5, words: 300, seconds: 60 }, // not a whole number
    { at: '2026-11-22T10:00:00Z', wpm: 240, words: 300, seconds: 75, source: 'book', extra: '<script>' },
    null, 'text',
  ]);
  assert.deepEqual(list, [
    { at: '2026-11-22T10:00:00.000Z', wpm: 240, words: 300, seconds: 75, source: 'book' },
    ok,
  ]);
  const many = Array.from({ length: 50 }, (_, i) => ({ ...ok, at: new Date(Date.UTC(2026, 0, 1 + i)).toISOString() }));
  assert.equal(cleanSpeedTests(many).length, 30);
});

test('explain levels and summary lengths (the old names keep working)', () => {
  assert.equal(explainLevel('simplify'), 'child');
  assert.equal(explainLevel('explain'), 'student');
  assert.equal(explainLevel('professional'), 'professional');
  assert.equal(explainLevel('anything'), 'student');
  assert.deepEqual(Object.keys(EXPLAIN_LEVELS), ['child', 'student', 'professional']);
  assert.ok(STUDY_KINDS.includes('summary') && STUDY_KINDS.includes('summary_short') && STUDY_KINDS.includes('summary_full'));
});
