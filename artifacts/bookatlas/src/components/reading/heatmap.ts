/**
 * Reading heatmaps (master build plan M5, specification AN-002): when a reader reads, grouped by day of the week
 * and hour on the reader's own clock, a 12-week calendar, the peak hour and day, and a consistency score.
 * Pure helpers, tested in heatmap.test.ts. Sessions come from /api/reader/stats as [start, minutes, words].
 */
export type Activity = [startedAt: string, minutes: number, words: number];

export interface HeatmapCell { weekday: number; hour: number; readingMinutes: number; wordsRead: number; sessions: number }
export interface DayActivity { day: string; minutes: number; words: number }

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

/**
 * A moment on the reader's clock. `offsetMinutes` is what Date#getTimezoneOffset gives (minutes behind UTC), so
 * the page and the tests agree whatever the computer's time zone.
 */
export function onClock(iso: string, offsetMinutes: number) {
  const d = new Date(Date.parse(iso) - offsetMinutes * 60_000);
  return { day: d.toISOString().slice(0, 10), weekday: (d.getUTCDay() + 6) % 7, hour: d.getUTCHours() };
}

/** The specification's aggregation: minutes, words and sessions for each day of the week and hour (168 cells). */
export function aggregateHeatmapData(activity: Activity[], offsetMinutes = 0): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let weekday = 0; weekday < 7; weekday += 1) for (let hour = 0; hour < 24; hour += 1) cells.push({ weekday, hour, readingMinutes: 0, wordsRead: 0, sessions: 0 });
  for (const [at, minutes, words] of activity) {
    if (Number.isNaN(Date.parse(at))) continue;
    const { weekday, hour } = onClock(at, offsetMinutes);
    const c = cells[weekday * 24 + hour]!;
    c.readingMinutes += minutes; c.wordsRead += words; c.sessions += 1;
  }
  for (const c of cells) c.readingMinutes = Math.round(c.readingMinutes);
  return cells;
}

/** Every day of the last `weeks` weeks, Monday first, ending with the week of `now` (days after today are left out). */
export function dailyActivity(activity: Activity[], offsetMinutes: number, now: Date, weeks = 12): DayActivity[] {
  const byDay = new Map<string, DayActivity>();
  for (const [at, minutes, words] of activity) {
    if (Number.isNaN(Date.parse(at))) continue;
    const { day } = onClock(at, offsetMinutes);
    const d = byDay.get(day) ?? { day, minutes: 0, words: 0 };
    d.minutes += minutes; d.words += words;
    byDay.set(day, d);
  }
  const today = onClock(now.toISOString(), offsetMinutes);
  const start = Date.parse(`${today.day}T00:00:00Z`) - (today.weekday + (weeks - 1) * 7) * 86_400_000;
  const out: DayActivity[] = [];
  for (let i = 0; i < weeks * 7; i += 1) {
    const day = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    if (day > today.day) break;
    const d = byDay.get(day);
    out.push({ day, minutes: Math.round(d?.minutes ?? 0), words: d?.words ?? 0 });
  }
  return out;
}

/** The hour and the day with the most reading, or null before any. */
export function peakHour(cells: HeatmapCell[]): number | null {
  const by = Array.from({ length: 24 }, (_, h) => cells.filter((c) => c.hour === h).reduce((n, c) => n + c.readingMinutes, 0));
  const max = Math.max(...by);
  return max > 0 ? by.indexOf(max) : null;
}
export function peakDay(cells: HeatmapCell[]): number | null {
  const by = Array.from({ length: 7 }, (_, d) => cells.filter((c) => c.weekday === d).reduce((n, c) => n + c.readingMinutes, 0));
  const max = Math.max(...by);
  return max > 0 ? by.indexOf(max) : null;
}

/** Five shades: 0 (none) then 1 to 4 by quarters of the busiest cell. */
export function intensity(minutes: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((minutes / max) * 4))) as 1 | 2 | 3 | 4;
}

export function buildTooltip(m: { wordsRead: number; minutesRead: number }) {
  const min = Math.round(m.minutesRead);
  return `${min} minute${min === 1 ? '' : 's'} · ${m.wordsRead} word${m.wordsRead === 1 ? '' : 's'}`;
}

/**
 * Consistency over the last four weeks, 0 to 100: 70 points for the share of days with reading and 30 for how
 * even the four weeks are (the lightest week against the busiest). Reading a little every day scores high;
 * one long weekend binge scores low.
 */
export function consistencyScore(days: DayActivity[]): number {
  const last = days.slice(-28);
  if (!last.length) return 0;
  const read = last.filter((d) => d.minutes >= 1).length;
  const weeks = [0, 1, 2, 3].map((w) => last.slice(Math.max(0, last.length - 7 * (w + 1)), last.length - 7 * w).reduce((n, d) => n + d.minutes, 0));
  const most = Math.max(...weeks);
  const evenness = most > 0 ? Math.min(...weeks) / most : 0;
  return Math.round(70 * (read / 28) + 30 * evenness);
}
export const consistencyLabel = (score: number) => (score >= 80 ? 'Very steady' : score >= 50 ? 'Steady' : score >= 20 ? 'Now and then' : 'Just starting');
