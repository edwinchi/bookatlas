import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateHeatmapData, buildTooltip, consistencyScore, dailyActivity, intensity, onClock, peakDay, peakHour, type Activity } from './heatmap';

const activities: Activity[] = [
  ['2026-11-23T07:10:00Z', 20, 4000], // Monday 07:00 UTC
  ['2026-11-23T07:40:00Z', 10, 2000],
  ['2026-11-25T21:30:00Z', 45, 9000], // Wednesday 21:00 UTC
  ['not a date', 99, 1],
];

test('heatmap: groups by day and hour (the specification test)', () => {
  const cells = aggregateHeatmapData(activities);
  assert.equal(cells.length, 168);
  const mon7 = cells.find((c) => c.weekday === 0 && c.hour === 7)!;
  assert.deepEqual(mon7, { weekday: 0, hour: 7, readingMinutes: 30, wordsRead: 6000, sessions: 2 });
  assert.equal(peakHour(cells), 21);
  assert.equal(peakDay(cells), 2, 'Wednesday');
  assert.equal(peakHour(aggregateHeatmapData([])), null);
});

test('heatmap: the reader’s own clock moves sessions across hours and days', () => {
  // 21:30 UTC on Wednesday is 06:30 on Thursday in Tokyo (UTC+9: getTimezoneOffset() = -540).
  assert.deepEqual(onClock('2026-11-25T21:30:00Z', -540), { day: '2026-11-26', weekday: 3, hour: 6 });
  // And 07:10 UTC Monday is 02:10 the same day in New York (UTC−5: +300).
  assert.deepEqual(onClock('2026-11-23T07:10:00Z', 300), { day: '2026-11-23', weekday: 0, hour: 2 });
  const tokyo = aggregateHeatmapData(activities, -540);
  assert.equal(tokyo.find((c) => c.weekday === 3 && c.hour === 6)!.readingMinutes, 45);
});

test('heatmap: shades, tooltips and the 12-week calendar', () => {
  assert.equal(intensity(0, 50), 0);
  assert.equal(intensity(1, 50), 1);
  assert.equal(intensity(25, 50), 2);
  assert.equal(intensity(50, 50), 4);
  assert.ok(buildTooltip({ wordsRead: 2500, minutesRead: 45 }).includes('2500'));
  assert.equal(buildTooltip({ wordsRead: 1, minutesRead: 1 }), '1 minute · 1 word');
  const days = dailyActivity(activities, 0, new Date('2026-11-26T12:00:00Z'));
  assert.equal(days[0]!.day, '2026-09-07', 'a Monday, 11 weeks before this week');
  assert.equal(days.at(-1)!.day, '2026-11-26', 'today is the last day');
  assert.equal(days.find((d) => d.day === '2026-11-23')!.minutes, 30);
});

test('heatmap: consistency rewards reading often and evenly', () => {
  const day = (i: number, minutes: number) => ({ day: `d${i}`, minutes, words: 0 });
  assert.equal(consistencyScore(Array.from({ length: 28 }, (_, i) => day(i, 15))), 100, 'every day, even weeks');
  assert.equal(consistencyScore(Array.from({ length: 28 }, () => day(0, 0))), 0);
  const binge = Array.from({ length: 28 }, (_, i) => day(i, i >= 26 ? 240 : 0));
  assert.equal(consistencyScore(binge), 5, 'two days in one week');
  const weekdays = Array.from({ length: 28 }, (_, i) => day(i, i % 7 < 5 ? 20 : 0));
  assert.equal(consistencyScore(weekdays), 80);
});
