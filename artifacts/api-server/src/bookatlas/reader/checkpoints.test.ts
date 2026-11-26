import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkpointRange, checkpointSummary, checkpointsOf, cleanCheckpointQuestions, readCheckpoints, recordCheckpoint, scoreCheckpoint } from './checkpoints.js';
import { accessFor } from '../../auth/policy.js';

test('checkpoints: the specification scoring bands', () => {
  assert.equal(scoreCheckpoint(100), 'excellent');
  assert.equal(scoreCheckpoint(90), 'excellent');
  assert.equal(scoreCheckpoint(89), 'good');
  assert.equal(scoreCheckpoint(75), 'good');
  assert.equal(scoreCheckpoint(74), 'fair');
  assert.equal(scoreCheckpoint(60), 'fair');
  assert.equal(scoreCheckpoint(59), 'needs-improvement');
  assert.equal(scoreCheckpoint(0), 'needs-improvement');
});

test('checkpoints: the AI answer is cleaned (types, options, answers, blanks)', () => {
  const qs = cleanCheckpointQuestions({ questions: [
    { type: 'multiple_choice', question: 'Who found the map?', options: ['Ada', 'Ben', 'Cy', 'Dee'], answer: 1, explanation: 'Page one.' },
    { type: 'true_false', question: 'The river was frozen.', options: ['True', 'False'], answer: 0 },
    { type: 'true_false', question: 'Three options is wrong.', options: ['True', 'False', 'Maybe'], answer: 0 },
    { type: 'fill_blank', question: 'The ship sailed to ____.', options: ['Lagos', 'Lima', 'Oslo', 'Rome'], answer: 2 },
    { type: 'fill_blank', question: 'No blank in this one.', options: ['a', 'b'], answer: 0 },
    { type: 'key_concept', question: 'What is this passage about?', options: ['Trust', 'Trust'], answer: 0 },
    { type: 'key_concept', question: 'Main idea?', options: ['Courage', 'Fear'], answer: 5 },
    { type: 'weird', question: 'Unknown type becomes multiple choice', options: ['x', 'y'], answer: 1 },
    null, 'text',
  ] });
  assert.deepEqual(qs.map((q) => q.type), ['multiple_choice', 'true_false', 'fill_blank', 'multiple_choice']);
  assert.equal(qs[0]!.explanation, 'Page one.');
  assert.deepEqual(cleanCheckpointQuestions(null), []);
});

test('checkpoints: the passage range stays inside the chapter', () => {
  assert.deepEqual(checkpointRange(20, undefined, undefined), { from: 0, to: 19 });
  assert.deepEqual(checkpointRange(20, 5, 12), { from: 5, to: 12 });
  assert.deepEqual(checkpointRange(20, 15, 3), { from: 15, to: 15 });
  assert.deepEqual(checkpointRange(20, -4, 99), { from: 0, to: 19 });
});

test('checkpoints: saved results are cleaned, summarised and kept for the reader', async () => {
  const at = (d: number) => new Date(Date.UTC(2026, 10, d)).toISOString();
  const list = readCheckpoints([
    { bookId: 'book-a', chapterIndex: 0, right: 4, total: 4, reason: 'chapter', at: at(1) },
    { bookId: 'book-a', chapterIndex: 1, right: 2, total: 4, reason: 'words', at: at(2) },
    { bookId: '../evil', chapterIndex: 1, right: 2, total: 4, at: at(3) },
    { bookId: 'book-a', chapterIndex: 1, right: 5, total: 4, at: at(3) },
    { bookId: 'book-a', chapterIndex: 2, right: 3, total: 4, reason: 'nope', at: 'not a date' },
  ]);
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((r) => r.score), [100, 50]);
  const s = checkpointSummary(list);
  assert.equal(s.totalCheckpoints, 2);
  assert.equal(s.averageScore, 75);
  assert.equal(s.band, 'good');
  assert.equal(checkpointSummary([]).averageScore, null);
  const trend = checkpointSummary(readCheckpoints(Array.from({ length: 10 }, (_, i) => ({ bookId: 'b', chapterIndex: i, right: i < 5 ? 2 : 4, total: 4, at: at(i + 1) }))));
  assert.equal(trend.trend, 'up');

  const saved = await recordCheckpoint('user_checkpoints', { bookId: 'book-a', chapterIndex: 3, right: 3, total: 4, reason: 'time' });
  assert.equal(saved.result.score, 75);
  assert.equal(saved.band, 'good');
  await recordCheckpoint('user_checkpoints', { bookId: 'book-a', chapterIndex: 4, right: 4, total: 4, reason: 'manual' });
  const mine = await checkpointsOf('user_checkpoints');
  assert.equal(mine.totalCheckpoints, 2);
  assert.equal(mine.recent[0]!.chapterIndex, 4, 'newest first');
  await assert.rejects(recordCheckpoint('user_checkpoints', { bookId: 'book-a', chapterIndex: 4, right: 9, total: 4 }), /Send the book/);
});

test('checkpoints: only signed-in readers', () => {
  assert.equal(accessFor('POST', '/api/reader/checkpoints'), 'reader');
  assert.equal(accessFor('GET', '/api/reader/checkpoints'), 'reader');
  assert.equal(accessFor('POST', '/api/reader/ai/checkpoint'), 'reader');
  assert.equal(accessFor('DELETE', '/api/reader/checkpoints'), 'admin');
});
