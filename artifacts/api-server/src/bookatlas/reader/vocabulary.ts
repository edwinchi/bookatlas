import { ReaderError, getPreferences, saveSettingsKey } from './service.js';

/**
 * Vocabulary growth (specification "Track learning: vocabulary growth"). Every word a signed-in reader looks up
 * with Define is kept with its meaning and the book, in the reader's settings (no new table), at most 1,000 words
 * (a word looked up again is moved to now, not counted twice). My progress shows the total, this week, the last
 * eight weeks and the latest words, and can turn them into flashcards.
 */
export const VOCABULARY_KEY = 'vocabulary';
export const MAX_WORDS = 1000;
export interface VocabWord { word: string; definition: string; bookId: string; at: string; looks: number }

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const norm = (w: string) => w.toLowerCase().normalize('NFKC');

export function readVocabulary(raw: unknown): VocabWord[] {
  if (!Array.isArray(raw)) return [];
  const out: VocabWord[] = [];
  for (const v of raw) {
    const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const word = clean(r.word, 60), definition = clean(r.definition, 300);
    const at = typeof r.at === 'string' && !Number.isNaN(Date.parse(r.at)) ? new Date(r.at).toISOString() : '';
    if (!word || !definition || !at || typeof r.bookId !== 'string' || !/^[\w.-]{1,120}$/.test(r.bookId)) continue;
    const looks = Number.isInteger(r.looks) && (r.looks as number) > 0 ? Math.min(r.looks as number, 999) : 1;
    out.push({ word, definition, bookId: r.bookId, at, looks });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(-MAX_WORDS);
}

/** A word looked up: added, or moved to now with one more look. */
export function addWord(list: VocabWord[], word: string, definition: string, bookId: string, now = new Date()): VocabWord[] {
  const w = clean(word, 60), d = clean(definition, 300);
  if (!w || !d) return list;
  const before = list.find((x) => norm(x.word) === norm(w));
  const rest = list.filter((x) => norm(x.word) !== norm(w));
  return [...rest, { word: w, definition: d, bookId, at: now.toISOString(), looks: (before?.looks ?? 0) + 1 }].slice(-MAX_WORDS);
}

/** Totals for My progress: all words, this week (since Monday, UTC), the last eight weeks, the latest 20. */
export function vocabularySummary(list: VocabWord[], now = new Date()) {
  const monday = (d: Date) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };
  const thisWeek = monday(now);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(thisWeek.getTime() - (7 - i) * 7 * 86_400_000);
    const end = new Date(start.getTime() + 7 * 86_400_000);
    // A word counts in the week it was first looked up at the latest time it was saved.
    return { week: start.toISOString().slice(0, 10), words: list.filter((w) => w.at >= start.toISOString() && w.at < end.toISOString()).length };
  });
  return {
    total: list.length,
    thisWeek: list.filter((w) => w.at >= thisWeek.toISOString()).length,
    weeks,
    recent: [...list].reverse().slice(0, 20),
  };
}

export async function recordLookup(userId: string, word: string, definition: string, bookId: string) {
  const list = readVocabulary((await getPreferences(userId))?.settings?.[VOCABULARY_KEY]);
  await saveSettingsKey(userId, VOCABULARY_KEY, addWord(list, word, definition, bookId));
}

export async function myVocabulary(userId: string) {
  return vocabularySummary(readVocabulary((await getPreferences(userId))?.settings?.[VOCABULARY_KEY]));
}

export async function forgetWord(userId: string, word: string) {
  const list = readVocabulary((await getPreferences(userId))?.settings?.[VOCABULARY_KEY]);
  const next = list.filter((w) => norm(w.word) !== norm(clean(word, 60)));
  if (next.length === list.length) throw new ReaderError('That word is not in your list.', 404);
  await saveSettingsKey(userId, VOCABULARY_KEY, next);
  return vocabularySummary(next);
}
