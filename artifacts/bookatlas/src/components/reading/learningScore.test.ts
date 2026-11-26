import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusScore, learningScore, scoreBand } from './learningScore';

test('learning score: four weighted parts, missing ones left out', () => {
  assert.deepEqual(learningScore({ comprehension: null, retention: null, consistency: null, focus: null }).score, null);
  const all = learningScore({ comprehension: 90, retention: 80, consistency: 50, focus: 70 });
  assert.equal(all.score, Math.round((90 * 40 + 80 * 25 + 50 * 20 + 70 * 15) / 100));
  assert.equal(all.weakest, 'consistency');
  assert.equal(all.measured, 4);
  const two = learningScore({ comprehension: 80, retention: null, consistency: 40, focus: null });
  assert.equal(two.score, Math.round((80 * 40 + 40 * 20) / 60), 'reweighted over what is known');
  assert.equal(learningScore({ comprehension: 70, retention: null, consistency: null, focus: null }).weakest, null, 'one part: no weakest');
  assert.equal(learningScore({ comprehension: 150, retention: null, consistency: null, focus: null }).score, 100, 'kept between 0 and 100');
});

test('learning score: focus from Fast Read, and the bands', () => {
  assert.equal(focusScore(null), null);
  assert.equal(focusScore({ completionRate: 1, pauseRate: 0, rewindRate: 0 }), 100);
  assert.equal(focusScore({ completionRate: 0.5, pauseRate: 0.1, rewindRate: 0.1 }), Math.round(100 * (0.3 + 0.4 * 0.6)));
  assert.equal(focusScore({ completionRate: 0, pauseRate: 1, rewindRate: 1 }), 0);
  assert.deepEqual([90, 75, 55, 20].map(scoreBand), ['Excellent', 'Strong', 'Growing', 'Getting started']);
});
