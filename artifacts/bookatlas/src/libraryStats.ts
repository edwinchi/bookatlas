import type { UserLibraryItem } from './types.ts';

/** Estimates from recorded browser data; never invents activity or completed books. */
export function libraryStats(library: UserLibraryItem[], now = new Date()) {
  const completedBooks = library.filter(item => item.finished || item.progressPercent >= 100).length;
  const pagesRead = library.reduce((sum, item) => sum + Math.max(0, Math.min(100, item.progressPercent || 0)) * Math.max(0, item.book.pageCount || 0) / 100, 0);
  const dates = new Set(library.filter(item => Number.isFinite(item.lastReadTimestamp) && item.lastReadTimestamp > 0 && item.lastReadTimestamp <= now.getTime()).map(item => new Date(item.lastReadTimestamp).toDateString()));
  const day = new Date(now);
  if (!dates.has(day.toDateString())) day.setDate(day.getDate() - 1);
  let recordedStreakDays = 0;
  while (dates.has(day.toDateString())) {
    recordedStreakDays++;
    day.setDate(day.getDate() - 1);
  }
  return { completedBooks, totalReadingHours: Math.round(pagesRead / 45), recordedStreakDays };
}
