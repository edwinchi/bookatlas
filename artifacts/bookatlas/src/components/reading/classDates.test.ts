import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysUntil, dueLabel, dueState, today } from './classDates';

test('class due dates: days, state and label', () => {
  const now = new Date(2026, 10, 25, 15, 0); // Wed 25 Nov 2026, local time
  assert.equal(today(now), '2026-11-25');
  assert.equal(daysUntil('2026-11-25', now), 0);
  assert.equal(daysUntil('2026-12-01', now), 6);
  assert.equal(daysUntil('2026-11-23', now), -2);
  assert.equal(dueState('2026-11-23', false, now), 'late');
  assert.equal(dueState('2026-11-23', true, now), 'done');
  assert.equal(dueState('2026-11-27', false, now), 'soon');
  assert.equal(dueState('2026-12-10', false, now), 'later');
  assert.equal(dueLabel('2026-11-25', false, now), 'due today');
  assert.equal(dueLabel('2026-11-26', false, now), 'due tomorrow');
  assert.equal(dueLabel('2026-11-24', false, now), '1 day late');
  assert.equal(dueLabel('2026-11-22', false, now), '3 days late');
  assert.match(dueLabel('2026-12-04', false, now), /^due Fri 4 Dec$/);
});
