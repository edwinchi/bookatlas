/**
 * Adaptive Fast Read coach (master build plan M1: specification SR-001/SR-002, "RSVP v1.5–v2" and "Chunk Reader
 * v1"). Every Fast Read session is kept on the device; from the recent sessions and quiz scores the coach
 * suggests a speed and a word-group size, with a confidence. Pure functions, tested in adaptiveCoach.test.ts.
 */
export const COACH_MIN_WPM = 100;
export const COACH_MAX_WPM = 1500;

/** One Fast Read session: what was read, at what settings, and how the reader moved through it. */
export interface FastSession {
  at: string;
  mode: 'word' | 'group';
  group: number;
  wpm: number;
  words: number;
  seconds: number;
  pauses: number;
  rewinds: number;
  completed: boolean;
}

/** The specification's ReadingMetrics; comprehension is null when the reader has no quiz scores yet. */
export interface ReadingMetrics {
  averageWpm: number;
  comprehension: number | null;
  rewindRate: number;
  pauseRate: number;
  completionRate: number;
  sessions: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Metrics from the last sessions (at most 5) and quiz percentages (the last 5). Rates are per 100 words read,
 * capped at 1; sessions shorter than 20 words are left out.
 */
export function metricsFrom(sessions: FastSession[], quizPercents: number[] = []): ReadingMetrics | null {
  const recent = sessions.filter((s) => s.words >= 20).slice(-5);
  if (!recent.length) return null;
  const words = recent.reduce((n, s) => n + s.words, 0);
  const per100 = (n: number) => clamp(round(n / Math.max(1, words / 100)), 0, 1);
  const quiz = quizPercents.filter((p) => Number.isFinite(p)).slice(-5);
  return {
    averageWpm: Math.round(recent.reduce((n, s) => n + s.wpm, 0) / recent.length),
    comprehension: quiz.length ? Math.round(quiz.reduce((a, b) => a + b, 0) / quiz.length) : null,
    rewindRate: per100(recent.reduce((n, s) => n + s.rewinds, 0)),
    pauseRate: per100(recent.reduce((n, s) => n + s.pauses, 0)),
    completionRate: round(recent.filter((s) => s.completed).length / recent.length),
    sessions: recent.length,
  };
}

/** The specification's speed recommendation (see docs/MASTER_BUILD_PLAN.md for the exact thresholds). */
export function suggestWpm(m: Pick<ReadingMetrics, 'averageWpm' | 'comprehension' | 'rewindRate' | 'pauseRate' | 'completionRate'>) {
  let adjustment = 0;
  if (m.comprehension !== null) {
    if (m.comprehension >= 90) adjustment += 100;
    else if (m.comprehension >= 80) adjustment += 50;
    else if (m.comprehension < 60) adjustment -= 100;
  }
  if (m.rewindRate > 0.15) adjustment -= 75;
  if (m.pauseRate > 0.2) adjustment -= 50;
  if (m.completionRate >= 0.9) adjustment += 25;
  return clamp(m.averageWpm + adjustment, COACH_MIN_WPM, COACH_MAX_WPM);
}

/** The specification's chunk-size recommendation, kept between 2 and 8 words. */
export function recommendChunkSize(m: { chunkSize: number; comprehension: number | null; rewindRate: number; pauseRate: number }) {
  let size = m.chunkSize;
  if (m.comprehension !== null && m.comprehension >= 90 && m.rewindRate < 0.05) size += 1;
  if (m.comprehension !== null && m.comprehension < 70) size -= 1;
  if (m.pauseRate > 0.2) size -= 1;
  return clamp(size, 2, 8);
}

export type Confidence = 'high' | 'medium' | 'low';
/** How far to trust the advice: the share of finished sessions, and low until there are three sessions. */
export function recommendationConfidence(m: Pick<ReadingMetrics, 'completionRate' | 'sessions'>): Confidence {
  if (m.sessions < 3) return 'low';
  const finished = m.completionRate * 100;
  return finished > 85 ? 'high' : finished > 50 ? 'medium' : 'low';
}

/** One line of advice for the reader. */
export function buildInsight(current: number, recommended: number, m: ReadingMetrics) {
  if (recommended > current) return m.comprehension !== null && m.comprehension >= 80
    ? 'Go a little faster: your quiz scores stay high and you rarely go back.'
    : 'Go a little faster: you finish your sessions and rarely go back.';
  if (recommended < current) return m.comprehension !== null && m.comprehension < 60
    ? 'Slow down a little: your quiz scores show some of the text is being missed.'
    : 'Slow down a little: you go back or pause often at this speed.';
  return 'Stay at this speed: it suits you right now.';
}

export interface CoachAdvice { metrics: ReadingMetrics; wpm: number; group: number; confidence: Confidence; insight: string }
/** Everything the coach card shows, or null before the first session. */
export function coachAdvice(sessions: FastSession[], quizPercents: number[], current: { wpm: number; group: number; mode: 'word' | 'group' }): CoachAdvice | null {
  const metrics = metricsFrom(sessions, quizPercents);
  if (!metrics) return null;
  const wpm = Math.round(suggestWpm(metrics) / 10) * 10;
  const group = current.mode === 'group' ? recommendChunkSize({ chunkSize: current.group, ...metrics }) : current.group;
  return { metrics, wpm, group, confidence: recommendationConfidence(metrics), insight: buildInsight(current.wpm, wpm, metrics) };
}

/**
 * Drift-corrected timing: each word is due a fixed time after the one before it, counted from when it was due,
 * not from when the timer happened to fire. Returns how long to wait now; never negative.
 */
export const driftDelay = (due: number, now: number) => Math.max(0, due - now);

// ------------------------------------------------------------------------------------------- this device

const SESSIONS_KEY = 'bookatlas:fast-read-sessions';
const QUIZ_KEY = 'bookatlas:quiz-percents';
const readList = <T,>(key: string): T[] => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const writeList = (key: string, list: unknown[]) => { try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* private window or full storage */ } };

export const readSessions = () => readList<FastSession>(SESSIONS_KEY).filter((s) => s && typeof s.wpm === 'number' && typeof s.words === 'number');
export function saveSession(s: FastSession) {
  if (s.words < 20) return;
  writeList(SESSIONS_KEY, [...readSessions(), s].slice(-30));
  try { window.dispatchEvent(new Event('bookatlas:fast-read-sessions')); } catch { /* no window */ }
}
export const readQuizPercents = () => readList<number>(QUIZ_KEY).filter((n) => typeof n === 'number' && n >= 0 && n <= 100);
/** A chapter quiz result, as a percentage, for the coach's comprehension. */
export function recordQuizPercent(score: number, total: number) {
  if (!(total > 0) || score < 0 || score > total) return;
  writeList(QUIZ_KEY, [...readQuizPercents(), Math.round((score / total) * 100)].slice(-20));
}
