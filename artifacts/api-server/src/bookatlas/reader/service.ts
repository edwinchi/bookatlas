import { randomUUID } from 'node:crypto';
import { bookatlasDb } from '../db/supabaseClient.js';

/**
 * BooksAtlas Reader sync (cycle 7, bookatlascode_ebook_reader.md Phase 1): reading progress, highlights,
 * bookmarks and notes, reader preferences and reading sessions, saved to the reader's account so they follow
 * them across devices. Locations are chapter and paragraph indexes in the prepared book.
 */
export class ReaderError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export interface Progress { user_id: string; book_id: string; chapter_index: number; paragraph_index: number; progress_percent: number; device: string | null; updated_at: string }
export type AnnotationKind = 'highlight' | 'bookmark' | 'note';
export interface Annotation {
  id: string; user_id: string; book_id: string; kind: AnnotationKind; color: string | null;
  chapter_index: number; paragraph_index: number; excerpt: string; note: string | null; created_at: string; updated_at: string;
  /** Phase 3 (cycle 10): shared with other readers of the book under `display_name`; `hidden` after reports. */
  shared?: boolean; display_name?: string | null; hidden?: boolean;
}
export interface ReadingGroup { id: string; book_id: string; name: string; owner_id: string; invite_code: string; created_at: string }
export interface GroupMember { group_id: string; user_id: string; display_name: string; role: 'owner' | 'member'; joined_at: string }
export interface GroupPost { id: string; group_id: string; user_id: string; display_name: string; chapter_index: number | null; body: string; status: 'published' | 'hidden'; created_at: string }
export interface Session { id: string; user_id: string; book_id: string; started_at: string; seconds: number; paragraphs: number; words: number; device: string | null }

const COLORS = ['yellow', 'green', 'blue', 'pink', 'purple', 'orange'];
const MAX_PER_BOOK = 5_000;
const BOOK = /^[\w.-]{1,120}$/;

const db = () => bookatlasDb;
const mem = {
  progress: new Map<string, Progress>(), annotations: [] as Annotation[], prefs: new Map<string, { settings: Record<string, unknown>; updated_at: string }>(), sessions: [] as Session[],
  groups: [] as ReadingGroup[], members: [] as GroupMember[], posts: [] as GroupPost[],
};
/** The local stack and tests keep reader data in memory (no Supabase). */
export const readerMemory = () => mem;

const int = (v: unknown, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= max ? n : null; };
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');
const device = (v: unknown) => text(v, 40) || null;
function bookId(v: unknown) {
  const id = String(v ?? '');
  if (!BOOK.test(id)) throw new ReaderError('Unknown book.', 404);
  return id;
}
const fail = (r: { error: unknown }, what: string) => { if (r.error) throw new ReaderError(`${what} could not be saved. Please retry.`, 503); };

// ------------------------------------------------------------------------------------------- progress

export async function getProgress(userId: string, book: string): Promise<Progress | null> {
  const id = bookId(book);
  if (!db()) return structuredClone(mem.progress.get(`${userId}|${id}`) ?? null);
  const r = await db()!.from('reader_progress').select('*').eq('user_id', userId).eq('book_id', id).maybeSingle();
  if (r.error) throw new ReaderError('Reading progress could not be read.', 503);
  return r.data as Progress | null;
}

/** Last write wins; a write older than the stored one (a slow device) is ignored. */
export async function saveProgress(userId: string, book: string, body: Record<string, unknown>) {
  const id = bookId(book);
  const chapter = int(body.chapterIndex, 10_000), paragraph = int(body.paragraphIndex, 1_000_000), pct = int(body.progressPercent, 100);
  if (chapter === null || paragraph === null || pct === null) throw new ReaderError('Invalid reading position.');
  const at = typeof body.at === 'string' && !Number.isNaN(Date.parse(body.at)) ? new Date(Math.min(Date.parse(body.at), Date.now())).toISOString() : new Date().toISOString();
  const current = await getProgress(userId, id);
  if (current && current.updated_at > at) return current;
  const row: Progress = { user_id: userId, book_id: id, chapter_index: chapter, paragraph_index: paragraph, progress_percent: pct, device: device(body.device), updated_at: at };
  if (!db()) mem.progress.set(`${userId}|${id}`, row);
  else fail(await db()!.from('reader_progress').upsert(row), 'Reading progress');
  return row;
}

// ------------------------------------------------------------------------------------------- annotations

export async function annotationsOf(userId: string, book?: string): Promise<Annotation[]> {
  const id = book === undefined ? undefined : bookId(book);
  if (!db()) return mem.annotations.filter((a) => a.user_id === userId && (!id || a.book_id === id)).map((a) => structuredClone(a)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  let q = db()!.from('reader_annotations').select('*').eq('user_id', userId);
  if (id) q = q.eq('book_id', id);
  const r = await q.order('created_at', { ascending: false }).limit(10_000);
  if (r.error) throw new ReaderError('Notes and highlights could not be read.', 503);
  return r.data as Annotation[];
}

export async function addAnnotation(userId: string, body: Record<string, unknown>) {
  const id = bookId(body.bookId);
  const kind = body.kind as AnnotationKind;
  if (!['highlight', 'bookmark', 'note'].includes(kind)) throw new ReaderError('Choose highlight, bookmark or note.');
  const chapter = int(body.chapterIndex, 10_000), paragraph = int(body.paragraphIndex, 1_000_000);
  if (chapter === null || paragraph === null) throw new ReaderError('Invalid position in the book.');
  const color = kind === 'highlight' ? (COLORS.includes(String(body.color)) ? String(body.color) : 'yellow') : null;
  const note = text(body.note, 5_000) || null;
  if (kind === 'note' && !note) throw new ReaderError('Write the note first.');
  const existing = await annotationsOf(userId, id);
  if (existing.length >= MAX_PER_BOOK) throw new ReaderError(`You can keep up to ${MAX_PER_BOOK} notes, highlights and bookmarks per book.`, 409);
  // One highlight and one bookmark per paragraph: adding again updates it.
  const same = kind !== 'note' && existing.find((a) => a.kind === kind && a.chapter_index === chapter && a.paragraph_index === paragraph);
  if (same) return updateAnnotation(userId, same.id, { color, note: note ?? same.note });
  const now = new Date().toISOString();
  const row: Annotation = { id: randomUUID(), user_id: userId, book_id: id, kind, color, chapter_index: chapter, paragraph_index: paragraph, excerpt: text(body.excerpt, 600), note, created_at: now, updated_at: now };
  if (!db()) mem.annotations.push(row);
  else fail(await db()!.from('reader_annotations').insert(row), 'The note');
  return row;
}

async function ownAnnotation(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new ReaderError('Not found.', 404);
  const found = !db() ? mem.annotations.find((a) => a.id === id)
    : (await db()!.from('reader_annotations').select('*').eq('id', id).maybeSingle()).data as Annotation | null;
  if (!found || found.user_id !== userId) throw new ReaderError('Not found.', 404);
  return found;
}

export async function updateAnnotation(userId: string, id: string, body: Record<string, unknown>) {
  const a = await ownAnnotation(userId, id);
  const patch: Partial<Annotation> = { updated_at: new Date().toISOString() };
  if ('note' in body) patch.note = text(body.note, 5_000) || null;
  if (a.kind === 'highlight' && 'color' in body && COLORS.includes(String(body.color))) patch.color = String(body.color);
  if (a.kind === 'note' && !(patch.note ?? a.note)) throw new ReaderError('A note cannot be empty; delete it instead.');
  if (!db()) { Object.assign(mem.annotations.find((x) => x.id === id)!, patch); return { ...a, ...patch }; }
  fail(await db()!.from('reader_annotations').update(patch).eq('id', id).eq('user_id', userId), 'The note');
  return { ...a, ...patch };
}

export async function deleteAnnotation(userId: string, id: string) {
  await ownAnnotation(userId, id);
  if (!db()) { mem.annotations.splice(mem.annotations.findIndex((a) => a.id === id), 1); return; }
  fail(await db()!.from('reader_annotations').delete().eq('id', id).eq('user_id', userId), 'The deletion');
}

/** Search across every book: highlighted text and notes. */
export async function searchAnnotations(userId: string, query: string) {
  const q = text(query, 100).toLowerCase();
  const all = await annotationsOf(userId);
  return (q ? all.filter((a) => a.excerpt.toLowerCase().includes(q) || (a.note ?? '').toLowerCase().includes(q)) : all).slice(0, 200);
}

// ------------------------------------------------------------------------------------------- preferences

const PREF_KEYS: Record<string, (v: unknown) => unknown> = {
  theme: (v) => (typeof v === 'string' && /^[a-z-]{2,20}$/.test(v) ? v : undefined),
  fontFamily: (v) => (typeof v === 'string' && /^[a-z-]{2,20}$/.test(v) ? v : undefined),
  fontSize: (v) => (int(v, 64) !== null && Number(v) >= 10 ? Number(v) : undefined),
  lineHeight: (v) => (typeof v === 'number' && v >= 1 && v <= 3 ? Math.round(v * 100) / 100 : undefined),
  marginWidth: (v) => (typeof v === 'string' && /^[a-z]{2,12}$/.test(v) ? v : undefined),
  ttsVoice: (v) => (typeof v === 'string' ? text(v, 80) || undefined : undefined),
  ttsSpeed: (v) => (typeof v === 'number' && v >= 0.5 && v <= 3 ? v : undefined),
  // Phase 3 (cycle 10): the daily reading goal in minutes.
  dailyGoalMinutes: (v) => (int(v, 240) !== null && Number(v) >= 5 ? Number(v) : undefined),
};

export async function getPreferences(userId: string) {
  if (!db()) return mem.prefs.get(userId) ?? null;
  const r = await db()!.from('reader_preferences').select('settings,updated_at').eq('user_id', userId).maybeSingle();
  if (r.error) throw new ReaderError('Reader settings could not be read.', 503);
  return r.data as { settings: Record<string, unknown>; updated_at: string } | null;
}
export async function savePreferences(userId: string, body: Record<string, unknown>) {
  // Merged into the stored settings: the reader's display sync and the daily goal are saved separately.
  const settings: Record<string, unknown> = { ...((await getPreferences(userId))?.settings ?? {}) };
  for (const [k, clean] of Object.entries(PREF_KEYS)) { const v = clean(body[k]); if (v !== undefined) settings[k] = v; }
  const row = { user_id: userId, settings, updated_at: new Date().toISOString() };
  if (!db()) mem.prefs.set(userId, { settings, updated_at: row.updated_at });
  else fail(await db()!.from('reader_preferences').upsert(row), 'Reader settings');
  return { settings, updated_at: row.updated_at };
}

// ------------------------------------------------------------------------------------------- sessions and stats

export async function recordSession(userId: string, body: Record<string, unknown>) {
  const id = bookId(body.bookId);
  const seconds = int(body.seconds, 6 * 3600), paragraphs = int(body.paragraphs, 100_000) ?? 0, words = int(body.words, 2_000_000) ?? 0;
  if (seconds === null || seconds < 5) throw new ReaderError('Sessions shorter than 5 seconds are not recorded.');
  const started = typeof body.startedAt === 'string' && !Number.isNaN(Date.parse(body.startedAt)) ? new Date(Math.min(Date.parse(body.startedAt), Date.now())).toISOString() : new Date(Date.now() - seconds * 1000).toISOString();
  // A reader cannot plausibly read more than 1,500 words a minute; cap so stats stay believable.
  const row: Session = { id: randomUUID(), user_id: userId, book_id: id, started_at: started, seconds, paragraphs, words: Math.min(words, Math.ceil((seconds / 60) * 1500)), device: device(body.device) };
  if (!db()) mem.sessions.push(row);
  else fail(await db()!.from('reading_sessions').insert(row), 'The reading session');
  return row;
}

async function sessionsOf(userId: string, sinceIso?: string): Promise<Session[]> {
  if (!db()) return mem.sessions.filter((s) => s.user_id === userId && (!sinceIso || s.started_at >= sinceIso));
  let q = db()!.from('reading_sessions').select('*').eq('user_id', userId);
  if (sinceIso) q = q.gte('started_at', sinceIso);
  const r = await q.order('started_at', { ascending: false }).limit(20_000);
  if (r.error) throw new ReaderError('Reading statistics could not be read.', 503);
  return r.data as Session[];
}

/** Reading statistics: time, words, speed, streak and the last 30 days (UTC days). */
export async function readingStats(userId: string, now = new Date()) {
  const sessions = await sessionsOf(userId);
  const day = (iso: string) => iso.slice(0, 10);
  const days = new Set(sessions.map((s) => day(s.started_at)));
  let streak = 0;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Today not read yet still keeps yesterday's streak alive.
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  // The longest run of consecutive reading days ever (for achievements).
  let bestStreak = 0, run = 0, prev = '';
  for (const d of [...days].sort()) {
    const next = prev && new Date(Date.parse(`${prev}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) === d;
    run = next ? run + 1 : 1; bestStreak = Math.max(bestStreak, run); prev = d;
  }
  const seconds = sessions.reduce((n, s) => n + s.seconds, 0);
  const words = sessions.reduce((n, s) => n + s.words, 0);
  const timed = sessions.filter((s) => s.words > 0);
  const timedSeconds = timed.reduce((n, s) => n + s.seconds, 0);
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (29 - i))).toISOString().slice(0, 10);
    const own = sessions.filter((s) => day(s.started_at) === d);
    return { day: d, minutes: Math.round(own.reduce((n, s) => n + s.seconds, 0) / 60) };
  });
  const progress = !db() ? [...mem.progress.values()].filter((p) => p.user_id === userId)
    : ((await db()!.from('reader_progress').select('book_id,progress_percent').eq('user_id', userId)).data ?? []) as Pick<Progress, 'book_id' | 'progress_percent'>[];
  return {
    totalMinutes: Math.round(seconds / 60), words, wordsPerMinute: timedSeconds >= 60 ? Math.round(words / (timedSeconds / 60)) : null,
    streakDays: streak, bestStreakDays: bestStreak, todayMinutes: last30[29]!.minutes, booksStarted: progress.length, booksFinished: progress.filter((p) => p.progress_percent >= 98).length,
    sessions: sessions.length, last30,
  };
}

// ------------------------------------------------------------------------------------------- export and erasure

export async function readerDataOf(userId: string) {
  const progress = !db() ? [...mem.progress.values()].filter((p) => p.user_id === userId)
    : ((await db()!.from('reader_progress').select('*').eq('user_id', userId)).data ?? []) as Progress[];
  return { progress, annotations: await annotationsOf(userId), preferences: await getPreferences(userId), sessions: await sessionsOf(userId) };
}

export async function eraseReaderData(userId: string) {
  if (!db()) {
    for (const k of [...mem.progress.keys()]) if (k.startsWith(`${userId}|`)) mem.progress.delete(k);
    mem.annotations = mem.annotations.filter((a) => a.user_id !== userId);
    mem.sessions = mem.sessions.filter((s) => s.user_id !== userId);
    mem.prefs.delete(userId);
    return;
  }
  for (const table of ['reader_progress', 'reader_annotations', 'reader_preferences', 'reading_sessions'] as const) {
    const r = await db()!.from(table).delete().eq('user_id', userId);
    if (r.error) throw new ReaderError(`Could not erase ${table}.`, 503);
  }
}
