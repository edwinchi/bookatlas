/**
 * Where a reader left off (owner request 2026-11-26: "store where I left off so I do not have to start all over
 * every time I return to continue reading or listening, on all books new and old"). Every book's place is kept on
 * this device for everyone, signed in or not: the chapter and paragraph, and for an audiobook the part and the
 * second of audio. Signed-in readers also sync their place through their account, as before. Pure helpers are
 * tested in resumePlace.test.ts.
 */
/** `audio.p` is the paragraph being spoken, which can sit lower on the page than the page's first paragraph. */
export interface Place { chapter: number; paragraph: number; audio?: { n: number; t: number; p?: number }; at: string }

const KEY = 'bookatlas:places';
const MAX_BOOKS = 300;

export function cleanPlaces(raw: unknown): Record<string, Place> {
  const out: Record<string, Place> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const chapter = Number(r.chapter), paragraph = Number(r.paragraph);
    if (!/^[\w.-]{1,120}$/.test(id) || !Number.isInteger(chapter) || chapter < 0 || !Number.isInteger(paragraph) || paragraph < 0 || typeof r.at !== 'string') continue;
    const a = (r.audio && typeof r.audio === 'object' ? r.audio : null) as Record<string, unknown> | null;
    const audio = a && Number.isInteger(a.n) && (a.n as number) >= 0 && Number.isFinite(a.t) && (a.t as number) >= 0 ? { n: a.n as number, t: a.t as number, ...(Number.isInteger(a.p) && (a.p as number) >= 0 ? { p: a.p as number } : {}) } : undefined;
    out[id] = { chapter, paragraph, at: r.at, ...(audio ? { audio } : {}) };
  }
  return out;
}

/** Keeps the most recent `MAX_BOOKS` books. */
export function withPlace(all: Record<string, Place>, bookId: string, place: Omit<Place, 'at'>, now = new Date()): Record<string, Place> {
  const next = { ...all, [bookId]: { ...place, at: now.toISOString() } };
  const ids = Object.keys(next);
  if (ids.length <= MAX_BOOKS) return next;
  const keep = ids.sort((a, b) => next[b]!.at.localeCompare(next[a]!.at)).slice(0, MAX_BOOKS);
  return Object.fromEntries(keep.map((id) => [id, next[id]!]));
}

const readAll = () => { try { return cleanPlaces(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return {}; } };
export const readPlace = (bookId: string): Place | null => readAll()[bookId] ?? null;
export function savePlace(bookId: string, place: Omit<Place, 'at'>) {
  try { localStorage.setItem(KEY, JSON.stringify(withPlace(readAll(), bookId, place))); } catch { /* storage full or off */ }
}

/**
 * Where to start: the reader's account or library place when there is one past the start, else this device's place,
 * kept inside the book's chapters.
 */
export function startPlace(given: { chapter: number; paragraph: number }, saved: Place | null, chapterCount: number) {
  const pick = given.chapter > 0 || given.paragraph > 0 || !saved ? given : saved;
  const chapter = Math.max(0, Math.min(pick.chapter, Math.max(0, chapterCount - 1)));
  return { chapter, paragraph: chapter === pick.chapter ? Math.max(0, pick.paragraph) : 0 };
}

/** The narration part that reads a paragraph (or the first part of its chapter, or the next chapter's). */
export function partForParagraph(segs: { chapter: number; from: number; to: number }[], chapter: number, paragraph: number): number {
  const exact = segs.findIndex((s) => s.chapter === chapter && s.from <= paragraph && paragraph <= s.to);
  if (exact >= 0) return exact;
  const later = segs.findIndex((s) => s.chapter === chapter && s.from > paragraph);
  if (later >= 0) return later;
  return segs.findIndex((s) => s.chapter >= chapter);
}

/**
 * The second to resume at inside a part: the saved second when it is for this part and this place, else the start
 * of the paragraph (from the part's timeline), else 0.
 */
export function resumeSecond(saved: Place | null, partN: number, paragraph: number, paragraphStart: number | null) {
  if (saved?.audio && saved.audio.n === partN && (saved.audio.p ?? saved.paragraph) === paragraph) return Math.max(0, saved.audio.t - 2);
  return paragraphStart !== null ? Math.max(0, paragraphStart - 0.3) : 0;
}

/** How far ahead of the page's first paragraph the spoken one can be and still count as "this page". */
export const PAGE_SPAN = 8;

/**
 * Which paragraph listening starts from: the one last spoken when the reader is still on its page (same chapter,
 * not paged past it or far back from it), else the paragraph the reader is on.
 */
export function listenFrom(saved: Place | null, chapter: number, paragraph: number): number {
  const p = saved?.audio?.p;
  if (p === undefined || saved!.chapter !== chapter) return paragraph;
  return p >= paragraph && p - paragraph <= PAGE_SPAN ? p : paragraph;
}
