/**
 * Due dates for class reading lists and quizzes (Reading Intelligence phase 4, 2026-11-25). Dates are calendar days
 * (YYYY-MM-DD) in the reader's own time zone. Pure helpers, tested in classDates.test.ts.
 */
export const today = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/** Whole days from today until the date: 0 today, negative when it has passed. */
export function daysUntil(date: string, now = new Date()) {
  const [y, m, d] = date.split('-').map(Number);
  const a = Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
  const t = today(now).split('-').map(Number);
  return Math.round((a - Date.UTC(t[0]!, t[1]! - 1, t[2]!)) / 86_400_000);
}

export type DueState = 'done' | 'late' | 'soon' | 'later';
/** Finished work is done; otherwise late after the date, soon within three days. */
export function dueState(date: string, finished: boolean, now = new Date()): DueState {
  if (finished) return 'done';
  const n = daysUntil(date, now);
  return n < 0 ? 'late' : n <= 3 ? 'soon' : 'later';
}

/** "due today", "due tomorrow", "due Fri 5 Dec", "2 days late". */
export function dueLabel(date: string, finished: boolean, now = new Date()) {
  const n = daysUntil(date, now);
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  if (finished) return `done · was due ${day}`;
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} late`;
  if (n === 0) return 'due today';
  if (n === 1) return 'due tomorrow';
  return `due ${day}`;
}

export const DUE_STYLES: Record<DueState, string> = {
  done: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  late: 'bg-rose-50 text-rose-800 ring-rose-200',
  soon: 'bg-amber-50 text-amber-900 ring-amber-200',
  later: 'bg-slate-50 text-slate-700 ring-slate-200',
};
