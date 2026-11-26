import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECKPOINT_MS, checkpointAdvice, checkpointDue, cleanCheckpointMode, scoreCheckpoint, startTracker, wordsBetween } from './checkpoints';

test('checkpoints: offered at chapter end, every 1,000 words or every 10 minutes, as chosen', () => {
  const t = { ...startTracker(0, 0), words: 400 };
  assert.equal(checkpointDue('chapter', t), null);
  assert.equal(checkpointDue('chapter', t, { chapterFinished: true }), 'chapter');
  assert.equal(checkpointDue('chapter', { ...t, words: 80 }, { chapterFinished: true }), null, 'too little read');
  assert.equal(checkpointDue('off', { ...t, words: 5000 }, { chapterFinished: true }), null);
  assert.equal(checkpointDue('words', { ...t, words: 999 }), null);
  assert.equal(checkpointDue('words', { ...t, words: 1000 }), 'words');
  assert.equal(checkpointDue('time', { ...t, activeMs: CHECKPOINT_MS - 1 }), null);
  assert.equal(checkpointDue('time', { ...t, activeMs: CHECKPOINT_MS }), 'time');
  assert.equal(cleanCheckpointMode('words'), 'words');
  assert.equal(cleanCheckpointMode('every hour'), 'chapter', 'the default');
});

test('checkpoints: words read count forward only', () => {
  const chapters = [{ content: ['one two three', 'four five'] }, { content: ['six seven eight nine', 'ten'] }];
  assert.equal(wordsBetween(chapters, { chapter: 0, paragraph: 0 }, { chapter: 0, paragraph: 1 }), 3);
  assert.equal(wordsBetween(chapters, { chapter: 0, paragraph: 1 }, { chapter: 1, paragraph: 1 }), 6);
  assert.equal(wordsBetween(chapters, { chapter: 1, paragraph: 1 }, { chapter: 0, paragraph: 0 }), 0, 'going back');
});

test('checkpoints: the specification bands and speed advice', () => {
  assert.deepEqual([95, 90, 80, 75, 65, 60, 40].map(scoreCheckpoint), ['excellent', 'excellent', 'good', 'good', 'fair', 'fair', 'needs-improvement']);
  assert.equal(checkpointAdvice(50).direction, 'slower');
  assert.equal(checkpointAdvice(69).direction, 'slower');
  assert.equal(checkpointAdvice(70).direction, 'steady');
  assert.equal(checkpointAdvice(90).direction, 'steady');
  assert.equal(checkpointAdvice(100).direction, 'faster');
});
