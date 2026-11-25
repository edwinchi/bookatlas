import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInsight, coachAdvice, driftDelay, metricsFrom, recommendChunkSize, recommendationConfidence, suggestWpm, type FastSession } from './adaptiveCoach';

// The specification's own test cases (docs/MASTER_BUILD_PLAN.md explains the one that differs).
test('adaptive speed: the specification thresholds', () => {
  assert.equal(suggestWpm({ averageWpm: 700, comprehension: 95, rewindRate: 0.02, pauseRate: 0.03, completionRate: 1 }), 825, 'strong reader');
  assert.equal(suggestWpm({ averageWpm: 500, comprehension: 82, rewindRate: 0.05, pauseRate: 0.05, completionRate: 0.9 }), 575, 'moderate reader');
  assert.equal(suggestWpm({ averageWpm: 700, comprehension: 55, rewindRate: 0.1, pauseRate: 0.12, completionRate: 0.75 }), 600, 'low comprehension');
  assert.equal(suggestWpm({ averageWpm: 650, comprehension: 88, rewindRate: 0.25, pauseRate: 0.05, completionRate: 0.95 }), 650, 'heavy rewinds: +50 −75 +25');
  assert.equal(suggestWpm({ averageWpm: 650, comprehension: 88, rewindRate: 0.03, pauseRate: 0.3, completionRate: 0.95 }), 675, 'heavy pausing');
  assert.equal(suggestWpm({ averageWpm: 700, comprehension: 58, rewindRate: 0.24, pauseRate: 0.3, completionRate: 0.5 }), 475, 'struggling reader example');
  assert.equal(suggestWpm({ averageWpm: 100, comprehension: 30, rewindRate: 1, pauseRate: 1, completionRate: 0 }), 100, 'floor');
  assert.equal(suggestWpm({ averageWpm: 1500, comprehension: 100, rewindRate: 0, pauseRate: 0, completionRate: 1 }), 1500, 'ceiling');
  assert.equal(suggestWpm({ averageWpm: 400, comprehension: null, rewindRate: 0, pauseRate: 0, completionRate: 1 }), 425, 'no quiz scores: comprehension is left out');
});

test('adaptive chunk size: the specification thresholds', () => {
  assert.equal(recommendChunkSize({ chunkSize: 4, comprehension: 95, rewindRate: 0.01, pauseRate: 0.01 }), 5);
  assert.equal(recommendChunkSize({ chunkSize: 5, comprehension: 50, rewindRate: 0.2, pauseRate: 0.3 }), 3);
  assert.equal(recommendChunkSize({ chunkSize: 8, comprehension: 99, rewindRate: 0, pauseRate: 0 }), 8);
  assert.equal(recommendChunkSize({ chunkSize: 2, comprehension: 40, rewindRate: 0.5, pauseRate: 0.5 }), 2);
});

const session = (o: Partial<FastSession> = {}): FastSession => ({ at: '2026-11-25T10:00:00Z', mode: 'word', group: 3, wpm: 400, words: 500, seconds: 75, pauses: 0, rewinds: 0, completed: true, ...o });

test('metrics from sessions: rates per 100 words, the last five sessions, short ones left out', () => {
  assert.equal(metricsFrom([]), null);
  assert.equal(metricsFrom([session({ words: 10 })]), null);
  const m = metricsFrom([session({ wpm: 200 }), session({ wpm: 400, rewinds: 2, pauses: 1 }), session({ wpm: 600, completed: false })], [80, 90])!;
  assert.deepEqual(m, { averageWpm: 400, comprehension: 85, rewindRate: 0.13, pauseRate: 0.07, completionRate: 0.67, sessions: 3 });
  assert.equal(metricsFrom(Array.from({ length: 9 }, (_, i) => session({ wpm: 100 * (i + 1) })))!.averageWpm, 700, 'the last five only');
});

test('confidence and advice', () => {
  assert.equal(recommendationConfidence({ completionRate: 1, sessions: 2 }), 'low', 'too few sessions');
  assert.equal(recommendationConfidence({ completionRate: 0.9, sessions: 5 }), 'high');
  assert.equal(recommendationConfidence({ completionRate: 0.6, sessions: 5 }), 'medium');
  assert.equal(recommendationConfidence({ completionRate: 0.4, sessions: 5 }), 'low');
  const a = coachAdvice(Array.from({ length: 4 }, () => session()), [95, 92], { wpm: 400, group: 4, mode: 'group' })!;
  assert.equal(a.wpm, 530, '525, rounded to the speed control’s steps of 10');
  assert.equal(a.group, 5);
  assert.equal(a.confidence, 'high');
  assert.match(a.insight, /faster/);
  assert.equal(coachAdvice([], [], { wpm: 300, group: 3, mode: 'word' }), null);
  assert.match(buildInsight(500, 500, a.metrics), /Stay/);
});

test('drift-corrected timing waits from when the word was due', () => {
  assert.equal(driftDelay(1200, 1000), 200);
  assert.equal(driftDelay(1200, 1225), 0, 'late: the next word comes at once, so the lost time is made up');
});
