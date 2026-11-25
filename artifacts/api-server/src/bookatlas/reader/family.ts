/**
 * Family reading (Reading Intelligence phase 2, owner request 2026-11-25): up to six reader profiles on one
 * account, each with its own reading time, books, quiz scores and stars, and a weekly family challenge.
 *
 * Stored with the account's reader settings (`settings.family`), so no database change is needed. The account
 * holder is the profile "me": their quizzes and game stars are kept here too, next to the reading sessions.
 */

export const MAX_PROFILES = 6;
export const PROFILE_KINDS = ['adult', 'teen', 'child', 'early'] as const;
export type ProfileKind = (typeof PROFILE_KINDS)[number];
export const PROFILE_COLORS = ['indigo', 'rose', 'amber', 'emerald', 'sky', 'violet', 'orange', 'teal'] as const;

export interface FamilyProfile { id: string; name: string; kind: ProfileKind; color: string; level: number; createdAt: string }
export interface DayStat { m: number; w: number }
export interface ProfileStats {
  /** Minutes and words per day (YYYY-MM-DD), the last 120 days. */
  days: Record<string, DayStat>;
  /** Books opened, most recent first (at most 50). */
  books: string[];
  /** Quiz results, the last 30. */
  quizzes: { at: string; score: number; total: number }[];
  /** Stars from the young readers' games and stories. */
  stars: number;
}
export interface Family { profiles: FamilyProfile[]; challenge: { weeklyMinutes: number }; stats: Record<string, ProfileStats> }

export const ME = 'me';
const DAY_KEEP = 120;
const emptyStats = (): ProfileStats => ({ days: {}, books: [], quizzes: [], stars: 0 });
const int = (v: unknown, min: number, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const ID = /^[a-z0-9-]{4,40}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const emptyFamily = (): Family => ({ profiles: [], challenge: { weeklyMinutes: 300 }, stats: {} });

/** A stored family read back safely (anything malformed is dropped, never trusted). */
export function readFamily(raw: unknown): Family {
  const f = emptyFamily();
  if (!raw || typeof raw !== 'object') return f;
  const r = raw as Record<string, unknown>;
  f.profiles = cleanProfiles(r.profiles);
  f.challenge.weeklyMinutes = int((r.challenge as Record<string, unknown> | undefined)?.weeklyMinutes, 30, 5000) ?? 300;
  const stats = r.stats && typeof r.stats === 'object' ? r.stats as Record<string, unknown> : {};
  for (const id of [ME, ...f.profiles.map((p) => p.id)]) {
    const s = stats[id] as Record<string, unknown> | undefined;
    if (!s || typeof s !== 'object') continue;
    const out = emptyStats();
    if (s.days && typeof s.days === 'object') {
      for (const [d, v] of Object.entries(s.days as Record<string, unknown>)) {
        const dv = v as Record<string, unknown> | null;
        if (DAY.test(d) && dv) out.days[d] = { m: int(dv.m, 0, 1440) ?? 0, w: int(dv.w, 0, 500_000) ?? 0 };
      }
    }
    out.books = (Array.isArray(s.books) ? s.books : []).filter((b): b is string => typeof b === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(b)).slice(0, 50);
    out.quizzes = (Array.isArray(s.quizzes) ? s.quizzes : []).map((q: Record<string, unknown>) => ({ at: String(q?.at ?? ''), score: int(q?.score, 0, 100) ?? -1, total: int(q?.total, 1, 100) ?? 0 }))
      .filter((q) => !Number.isNaN(Date.parse(q.at)) && q.score >= 0 && q.total > 0 && q.score <= q.total).slice(-30);
    out.stars = int(s.stars, 0, 1_000_000) ?? 0;
    f.stats[id] = out;
  }
  return f;
}

/** The profiles as the family edits them: names, kinds, colours and reading levels; at most six. */
export function cleanProfiles(list: unknown, now = new Date()): FamilyProfile[] {
  const out: FamilyProfile[] = [];
  for (const p of Array.isArray(list) ? list.slice(0, MAX_PROFILES * 2) : []) {
    if (!p || typeof p !== 'object') continue;
    const r = p as Record<string, unknown>;
    const id = typeof r.id === 'string' && ID.test(r.id) && r.id !== ME ? r.id : null;
    const name = text(r.name, 30);
    if (!id || !name || out.some((o) => o.id === id)) continue;
    const kind = (PROFILE_KINDS as readonly unknown[]).includes(r.kind) ? r.kind as ProfileKind : 'child';
    const color = (PROFILE_COLORS as readonly unknown[]).includes(r.color) ? String(r.color) : PROFILE_COLORS[out.length % PROFILE_COLORS.length]!;
    const level = int(r.level, 1, 3) ?? 1;
    const createdAt = typeof r.createdAt === 'string' && !Number.isNaN(Date.parse(r.createdAt)) ? new Date(r.createdAt).toISOString() : now.toISOString();
    out.push({ id, name, kind, color, level, createdAt });
    if (out.length === MAX_PROFILES) break;
  }
  return out;
}

/** Saves the profiles and the challenge; the reading of profiles that were removed is removed with them. */
export function withProfiles(f: Family, body: Record<string, unknown>, now = new Date()): Family {
  const profiles = cleanProfiles(body.profiles, now);
  const keep = new Set([ME, ...profiles.map((p) => p.id)]);
  const stats = Object.fromEntries(Object.entries(f.stats).filter(([id]) => keep.has(id)));
  const weekly = int((body.challenge as Record<string, unknown> | undefined)?.weeklyMinutes, 30, 5000);
  return { profiles, challenge: { weeklyMinutes: weekly ?? f.challenge.weeklyMinutes }, stats };
}

export class FamilyError extends Error { constructor(message: string, public status = 400) { super(message); } }

/**
 * Adds reading to a profile: minutes and words for today, a book opened, a quiz result or stars from a game.
 * Minutes are capped per call and per day, so a stuck tab cannot fill a week.
 */
export function addActivity(f: Family, body: Record<string, unknown>, now = new Date()): Family {
  const id = typeof body.profileId === 'string' ? body.profileId : '';
  if (id !== ME && !f.profiles.some((p) => p.id === id)) throw new FamilyError('Unknown reader profile.', 404);
  const s = f.stats[id] ? { ...f.stats[id]!, days: { ...f.stats[id]!.days }, books: [...f.stats[id]!.books], quizzes: [...f.stats[id]!.quizzes] } : emptyStats();
  const today = now.toISOString().slice(0, 10);
  const minutes = int(body.minutes, 0, 240) ?? 0;
  const words = int(body.words, 0, 100_000) ?? 0;
  if (minutes || words) {
    const d = s.days[today] ?? { m: 0, w: 0 };
    s.days[today] = { m: Math.min(1440, d.m + minutes), w: Math.min(500_000, d.w + words) };
    const days = Object.keys(s.days).sort();
    for (const old of days.slice(0, Math.max(0, days.length - DAY_KEEP))) delete s.days[old];
  }
  if (typeof body.bookId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(body.bookId)) s.books = [body.bookId, ...s.books.filter((b) => b !== body.bookId)].slice(0, 50);
  const quiz = body.quiz as Record<string, unknown> | undefined;
  if (quiz && typeof quiz === 'object') {
    const total = int(quiz.total, 1, 100), score = int(quiz.score, 0, 100);
    if (total !== null && score !== null && score <= total) s.quizzes = [...s.quizzes, { at: now.toISOString(), score, total }].slice(-30);
  }
  s.stars += int(body.stars, 0, 50) ?? 0;
  return { ...f, stats: { ...f.stats, [id]: s } };
}

/** Monday of the week that holds `now` (UTC), as YYYY-MM-DD. */
export function weekStart(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Days in a row with reading, ending today (or yesterday when today has none yet). */
export function streakOf(days: Record<string, DayStat>, now = new Date()) {
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const has = (d: Date) => (days[d.toISOString().slice(0, 10)]?.m ?? 0) > 0;
  if (!has(cursor)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let n = 0;
  while (has(cursor)) { n += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return n;
}

export interface ProfileSummary { id: string; weekMinutes: number; todayMinutes: number; totalMinutes: number; words: number; streak: number; books: number; quizAverage: number | null; quizzes: number; stars: number; last14: { day: string; minutes: number }[] }

/** What the family dashboard shows for one profile. */
export function summarize(s: ProfileStats | undefined, now = new Date()): Omit<ProfileSummary, 'id'> {
  const st = s ?? emptyStats();
  const monday = weekStart(now);
  const today = now.toISOString().slice(0, 10);
  const entries = Object.entries(st.days);
  const quizPct = st.quizzes.map((q) => q.score / q.total);
  return {
    weekMinutes: entries.filter(([d]) => d >= monday && d <= today).reduce((n, [, v]) => n + v.m, 0),
    todayMinutes: st.days[today]?.m ?? 0,
    totalMinutes: entries.reduce((n, [, v]) => n + v.m, 0),
    words: entries.reduce((n, [, v]) => n + v.w, 0),
    streak: streakOf(st.days, now),
    books: st.books.length,
    quizAverage: quizPct.length ? Math.round((quizPct.reduce((a, b) => a + b, 0) / quizPct.length) * 100) : null,
    quizzes: st.quizzes.length,
    stars: st.stars,
    last14: Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (13 - i))).toISOString().slice(0, 10);
      return { day: d, minutes: st.days[d]?.m ?? 0 };
    }),
  };
}

/** The family as the page sees it: profiles, the challenge with this week's total, and a summary per profile. */
export function familyView(f: Family, ownMinutesThisWeek: number, now = new Date()) {
  const summaries: ProfileSummary[] = [ME, ...f.profiles.map((p) => p.id)].map((id) => ({ id, ...summarize(f.stats[id], now) }));
  // The account holder's own reading comes from their reader sessions; the profile "me" adds games and quizzes.
  const me = summaries[0]!;
  me.weekMinutes = Math.max(me.weekMinutes, ownMinutesThisWeek);
  const total = summaries.reduce((n, s) => n + s.weekMinutes, 0);
  return {
    profiles: f.profiles,
    challenge: { weeklyMinutes: f.challenge.weeklyMinutes, weekMinutes: total, weekStart: weekStart(now), met: total >= f.challenge.weeklyMinutes },
    summaries,
    maxProfiles: MAX_PROFILES,
  };
}
