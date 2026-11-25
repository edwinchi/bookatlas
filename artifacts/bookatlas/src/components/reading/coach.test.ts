import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextStep, type CoachInput } from './coach';

const base: CoachInput = { tests: [{ at: '2026-11-20T10:00:00Z', wpm: 300, words: 300, seconds: 60, source: 'sample' }], quizAverage: null, quizzes: 0, todayMinutes: 5, goalMinutes: 20, streak: 0 };

test('adaptive coach: speed goes up only while understanding holds', () => {
  assert.equal(nextStep({ ...base, tests: [] }).wpm, 250);
  assert.equal(nextStep(base).wpm, 300);
  assert.equal(nextStep({ ...base, quizAverage: 90, quizzes: 4 }).wpm, 330);
  assert.equal(nextStep({ ...base, quizAverage: 70, quizzes: 4 }).wpm, 300);
  assert.equal(nextStep({ ...base, quizAverage: 40, quizzes: 4 }).wpm, 270);
  assert.equal(nextStep({ ...base, tests: [{ ...base.tests[0]!, wpm: 990 }], quizAverage: 95, quizzes: 4 }).wpm, 1000, 'never above the maximum');
});

test('adaptive coach: quiz level, explanations and a plan for today', () => {
  assert.equal(nextStep({ ...base, quizAverage: 40, quizzes: 4 }).explain, 'child');
  assert.equal(nextStep({ ...base, quizAverage: 90, quizzes: 4 }).quizLevel, 'stretch');
  const s = nextStep({ ...base, streak: 4 });
  assert.match(s.plan[0]!, /15 more minutes/);
  assert.match(s.plan.join(' '), /4-day streak/);
  assert.match(nextStep({ ...base, todayMinutes: 25 }).plan[0]!, /done/);
});
