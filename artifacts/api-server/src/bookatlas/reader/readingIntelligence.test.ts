import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSpeedTests } from './service.js';
import { EXPLAIN_LEVELS, STUDY_KINDS, explainLevel, explainPrompt } from './ai.js';

test('explain prompt (master build plan M7): the passage, with the surrounding text as context only', () => {
  const p = explainPrompt('expert', 'The passage.', 'Before. The passage. After.');
  assert.match(p.instruction, /specialist/);
  assert.match(p.instruction, /context only/);
  assert.match(p.message, /^Around the passage \(context only\):/);
  assert.ok(p.message.endsWith('Passage:\n"""The passage."""'));
  const plain = explainPrompt('child', 'Text """with fences""".');
  assert.doesNotMatch(plain.message, /context/);
  assert.equal(plain.message, 'Passage:\n"""Text "with fences"."""', 'the passage cannot close the quotes early');
});

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
  assert.equal(explainLevel('expert'), 'expert');
  assert.deepEqual(Object.keys(EXPLAIN_LEVELS), ['child', 'student', 'professional', 'expert']);
  // The four levels ask for different depths (master build plan M7).
  assert.match(EXPLAIN_LEVELS.child, /10-year-old/);
  assert.match(EXPLAIN_LEVELS.professional, /outside this field/);
  assert.match(EXPLAIN_LEVELS.expert, /specialist/);
  assert.equal(new Set(Object.values(EXPLAIN_LEVELS)).size, 4);
  assert.ok(STUDY_KINDS.includes('summary') && STUDY_KINDS.includes('summary_short') && STUDY_KINDS.includes('summary_full'));
});

test('reading speeds (master build plan M5): current, average and best words a minute', async () => {
  const { readingSpeeds } = await import('./service.js');
  assert.deepEqual(readingSpeeds([]), { current: null, average: null, best: null });
  const at = (d: number) => new Date(Date.UTC(2026, 10, d)).toISOString();
  const list = [
    { started_at: at(1), seconds: 600, words: 2000 }, // 200
    { started_at: at(2), seconds: 300, words: 1500 }, // 300
    { started_at: at(3), seconds: 120, words: 800 }, // 400, too short to be the best
    { started_at: at(4), seconds: 30, words: 500 }, // under a minute: left out
  ];
  assert.deepEqual(readingSpeeds(list), { current: 253, average: 253, best: 300 });
});
