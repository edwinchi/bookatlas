import type { Annotation } from './service.js';

/**
 * Achievements and the daily goal (Reader Phase 3, cycle 10). Worked out from the reader's own data each time
 * (sessions, progress, notes, groups), so nothing is invented and nothing extra is stored.
 */
export interface AchievementInput {
  stats: { totalMinutes: number; words: number; bestStreakDays: number; booksFinished: number; sessions: number; todayMinutes: number };
  annotations: Pick<Annotation, 'kind' | 'shared'>[];
  groups: number;
  dailyGoalMinutes: number;
}

/** About 250 words to a printed page. */
const WORDS_PER_PAGE = 250;

const DEFINITIONS: { id: string; title: string; description: string; icon: string; points: number; target: number; value: (i: AchievementInput) => number }[] = [
  { id: 'first-pages', title: 'First pages', description: 'Read for the first time in the BooksAtlas Reader.', icon: 'book-open', points: 5, target: 1, value: (i) => i.stats.sessions },
  { id: 'streak-3', title: 'Three in a row', description: 'Read on 3 days in a row.', icon: 'flame', points: 10, target: 3, value: (i) => i.stats.bestStreakDays },
  { id: 'streak-7', title: 'A week of reading', description: 'Read on 7 days in a row.', icon: 'flame', points: 25, target: 7, value: (i) => i.stats.bestStreakDays },
  { id: 'streak-30', title: 'Reading habit', description: 'Read on 30 days in a row.', icon: 'flame', points: 100, target: 30, value: (i) => i.stats.bestStreakDays },
  { id: 'pages-100', title: '100 pages', description: 'Read about 100 pages (25,000 words).', icon: 'file-text', points: 15, target: 100, value: (i) => Math.floor(i.stats.words / WORDS_PER_PAGE) },
  { id: 'pages-1000', title: '1,000 pages', description: 'Read about 1,000 pages.', icon: 'library', points: 75, target: 1000, value: (i) => Math.floor(i.stats.words / WORDS_PER_PAGE) },
  { id: 'hours-10', title: 'Ten hours', description: 'Spend 10 hours (600 minutes) reading.', icon: 'clock', points: 30, target: 600, value: (i) => i.stats.totalMinutes },
  { id: 'finished-1', title: 'The end', description: 'Finish your first book.', icon: 'trophy', points: 25, target: 1, value: (i) => i.stats.booksFinished },
  { id: 'finished-5', title: 'Five books', description: 'Finish 5 books.', icon: 'trophy', points: 75, target: 5, value: (i) => i.stats.booksFinished },
  { id: 'highlighter', title: 'Highlighter', description: 'Highlight 10 passages.', icon: 'highlighter', points: 10, target: 10, value: (i) => i.annotations.filter((a) => a.kind === 'highlight').length },
  { id: 'first-note', title: 'Margin notes', description: 'Write your first note.', icon: 'sticky-note', points: 5, target: 1, value: (i) => i.annotations.filter((a) => a.kind === 'note').length },
  { id: 'sharer', title: 'Generous reader', description: 'Share a highlight or note with other readers.', icon: 'share', points: 10, target: 1, value: (i) => i.annotations.filter((a) => a.shared).length },
  { id: 'book-club', title: 'Book club', description: 'Join or start a reading group.', icon: 'users', points: 10, target: 1, value: (i) => i.groups },
];

export const DEFAULT_DAILY_GOAL = 15;

export function achievements(input: AchievementInput) {
  const list = DEFINITIONS.map((d) => {
    const current = Math.min(d.value(input), d.target);
    return { id: d.id, title: d.title, description: d.description, icon: d.icon, points: d.points, target: d.target, current, unlocked: current >= d.target };
  });
  return {
    achievements: list,
    points: list.filter((a) => a.unlocked).reduce((n, a) => n + a.points, 0),
    unlocked: list.filter((a) => a.unlocked).length,
    goal: { minutes: input.dailyGoalMinutes, today: input.stats.todayMinutes, met: input.stats.todayMinutes >= input.dailyGoalMinutes },
  };
}
