import { bookatlasDb } from '../db/supabaseClient.js';
import { listSubmissions } from '../ebookPrep/submissions.js';
import { bookContent } from '../ebookPrep/service.js';
import { ReaderError, readerMemory, type Annotation, type Progress, type Session } from './service.js';

/**
 * Reading insights for authors (phase 9, owner request 2026-11-25): how readers read the author's own books.
 * Aggregates only, never a reader: nothing is shown before 5 readers, a passage only when 3 different readers
 * highlighted it, and the author's own reading is left out. Pure computation in `bookInsights` (tested in
 * authorInsights.test.ts); the loader reads progress, sessions and highlights for the author's books.
 */
export const MIN_READERS = 5;
export const MIN_HIGHLIGHTERS = 3;

type P = Pick<Progress, 'user_id' | 'chapter_index' | 'progress_percent' | 'updated_at'>;
type S = Pick<Session, 'user_id' | 'started_at' | 'seconds' | 'words'>;
type H = Pick<Annotation, 'user_id' | 'kind' | 'chapter_index' | 'paragraph_index' | 'excerpt' | 'hidden'>;

export interface BookInsights {
  readers: number; enoughReaders: boolean;
  finished?: number; completionRate?: number; medianProgress?: number;
  /** For each chapter: the share of readers (0–100) who reached it, and where readers stopped. */
  chapters?: { index: number; title: string; reached: number; stoppedHere: number }[];
  /** The chapter with the biggest drop from the one before, when it is clear (10 points or more). */
  biggestDrop?: { index: number; title: string; drop: number } | null;
  minutesRead?: number; minutesPerReader?: number; wordsPerMinute?: number | null;
  activeLast30?: number; daily?: { day: string; readers: number }[];
  passages?: { chapterIndex: number; paragraphIndex: number; excerpt: string; readers: number }[];
}

const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2); };

export function bookInsights(rows: { progress: P[]; sessions: S[]; highlights: H[] }, chapterTitles: string[], excludeUserId: string, now = new Date()): BookInsights {
  const progress = rows.progress.filter((p) => p.user_id !== excludeUserId);
  const sessions = rows.sessions.filter((s) => s.user_id !== excludeUserId);
  const readerIds = new Set([...progress.map((p) => p.user_id), ...sessions.map((s) => s.user_id)]);
  const readers = readerIds.size;
  if (readers < MIN_READERS) return { readers, enoughReaders: false };

  const finished = progress.filter((p) => p.progress_percent >= 98).length;
  const lastSeen = Math.max(chapterTitles.length - 1, ...progress.map((p) => p.chapter_index));
  const titles = Array.from({ length: lastSeen + 1 }, (_, i) => chapterTitles[i] ?? `Chapter ${i + 1}`);
  const base = Math.max(1, progress.length);
  const chapters = titles.map((title, index) => ({
    index, title,
    reached: Math.round((progress.filter((p) => p.chapter_index >= index || p.progress_percent >= 98).length / base) * 100),
    stoppedHere: progress.filter((p) => p.chapter_index === index && p.progress_percent < 98).length,
  }));
  let biggestDrop: BookInsights['biggestDrop'] = null;
  for (let i = 1; i < chapters.length; i += 1) {
    const drop = chapters[i - 1]!.reached - chapters[i]!.reached;
    if (drop >= 10 && (!biggestDrop || drop > biggestDrop.drop)) biggestDrop = { index: i, title: chapters[i]!.title, drop };
  }

  const seconds = sessions.reduce((n, s) => n + s.seconds, 0);
  const timed = sessions.filter((s) => s.words > 0 && s.seconds >= 60);
  const timedSeconds = timed.reduce((n, s) => n + s.seconds, 0);
  const since = now.getTime() - 30 * 86_400_000;
  const recent = sessions.filter((s) => Date.parse(s.started_at) >= since);
  const daily = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (29 - i))).toISOString().slice(0, 10);
    return { day, readers: new Set(recent.filter((s) => s.started_at.slice(0, 10) === day).map((s) => s.user_id)).size };
  });

  // Most highlighted passages, by different readers (never who).
  const byPara = new Map<string, { chapterIndex: number; paragraphIndex: number; excerpt: string; users: Set<string> }>();
  for (const h of rows.highlights) {
    if (h.kind !== 'highlight' || h.hidden || h.user_id === excludeUserId) continue;
    const k = `${h.chapter_index}:${h.paragraph_index}`;
    const e = byPara.get(k) ?? { chapterIndex: h.chapter_index, paragraphIndex: h.paragraph_index, excerpt: h.excerpt, users: new Set<string>() };
    e.users.add(h.user_id);
    if (h.excerpt.length > e.excerpt.length) e.excerpt = h.excerpt;
    byPara.set(k, e);
  }
  const passages = [...byPara.values()].filter((e) => e.users.size >= MIN_HIGHLIGHTERS)
    .sort((a, b) => b.users.size - a.users.size || a.chapterIndex - b.chapterIndex || a.paragraphIndex - b.paragraphIndex)
    .slice(0, 5).map((e) => ({ chapterIndex: e.chapterIndex, paragraphIndex: e.paragraphIndex, excerpt: e.excerpt.slice(0, 280), readers: e.users.size }));

  return {
    readers, enoughReaders: true, finished, completionRate: progress.length ? Math.round((finished / progress.length) * 100) : 0,
    medianProgress: median(progress.map((p) => p.progress_percent)), chapters, biggestDrop,
    minutesRead: Math.round(seconds / 60), minutesPerReader: Math.round(seconds / 60 / readers),
    wordsPerMinute: timedSeconds >= 600 ? Math.round(timed.reduce((n, s) => n + s.words, 0) / (timedSeconds / 60)) : null,
    activeLast30: new Set(recent.map((s) => s.user_id)).size, daily, passages,
  };
}

async function rowsFor(bookId: string): Promise<{ progress: P[]; sessions: S[]; highlights: H[] }> {
  if (!bookatlasDb) {
    const m = readerMemory();
    return {
      progress: [...m.progress.values()].filter((p) => p.book_id === bookId),
      sessions: m.sessions.filter((s) => s.book_id === bookId),
      highlights: m.annotations.filter((a) => a.book_id === bookId),
    };
  }
  const [p, s, h] = await Promise.all([
    bookatlasDb.from('reader_progress').select('user_id,chapter_index,progress_percent,updated_at').eq('book_id', bookId).limit(50_000),
    bookatlasDb.from('reading_sessions').select('user_id,started_at,seconds,words').eq('book_id', bookId).order('started_at', { ascending: false }).limit(50_000),
    bookatlasDb.from('reader_annotations').select('user_id,kind,chapter_index,paragraph_index,excerpt,hidden').eq('book_id', bookId).eq('kind', 'highlight').limit(50_000),
  ]);
  if (p.error || s.error || h.error) throw new ReaderError('Reading insights are not available right now. Please try again later.', 503);
  return { progress: p.data as P[], sessions: s.data as S[], highlights: h.data as H[] };
}

/** Insights for each of the signed-in author's published books. */
export async function authorInsights(userId: string, now = new Date()) {
  const subs = (await listSubmissions(userId)).filter((s) => s.book_id);
  const books = await Promise.all(subs.map(async (s) => {
    const bookId = s.book_id!;
    const titles = await bookContent(bookId).then((c) => c.chapters.map((ch) => ch.title)).catch(() => [] as string[]);
    return { bookId, title: s.data.intake.title, ...bookInsights(await rowsFor(bookId), titles, userId, now) };
  }));
  return { minReaders: MIN_READERS, books };
}
