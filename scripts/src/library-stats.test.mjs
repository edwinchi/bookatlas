import { test } from 'node:test';
import assert from 'node:assert/strict';
import { libraryStats } from '../../artifacts/bookatlas/src/libraryStats.ts';
const now = new Date(2026, 10, 1, 12);
const item = (progress, day, extra = {}) => ({ book: { pageCount: 90 }, progressPercent: progress, lastReadTimestamp: new Date(2026, 10, day, 10).getTime(), ...extra });
test('empty libraries have no sample completions, hours or streak', () => {
  assert.deepEqual(libraryStats([], now), { completedBooks: 0, totalReadingHours: 0, recordedStreakDays: 0 });
});
test('statistics use actual completion and bounded progress; same-day reads count once', () => {
  assert.deepEqual(libraryStats([item(100, 1), item(50, 1), item(0, 0, { finished: true })], now), { completedBooks: 2, totalReadingHours: 3, recordedStreakDays: 2 });
  assert.equal(libraryStats([item(200, 1), item(-10, 1)], now).totalReadingHours, 2);
});
test('streak can end yesterday but excludes gaps, future dates and invalid dates', () => {
  assert.equal(libraryStats([item(0, 0), item(0, -1)], now).recordedStreakDays, 2);
  assert.equal(libraryStats([item(0, 1), item(0, -1)], now).recordedStreakDays, 1);
  assert.equal(libraryStats([item(0, 2), item(0, -2), item(0, 1, { lastReadTimestamp: NaN })], now).recordedStreakDays, 0);
});
