/**
 * Focus gym (owner request 2026-11-26: "keep the reader's or children's attention and train them to focus").
 * Short daily exercises that train the kinds of attention reading needs, each adapting to the reader:
 * - Number hunt (a Schulte table): tap 1, 2, 3… in order; steady scanning.
 * - Star catcher (go/no-go): tap the stars, never the moons; holding back an impulse.
 * - Word hunt (visual search): find every copy of a word among look-alikes; careful looking, as in reading.
 * - Calm breath: a minute of slow breathing before reading.
 * Plus focus sprints in the reader. Training, not a test or a diagnosis. Pure helpers, tested in focusGym.test.ts;
 * progress is kept on this device for each family profile.
 */
import type { ProfileKind } from './family';
import { seeded, shuffle } from './youngReaders';

export type GameId = 'numbers' | 'stars' | 'words' | 'breath';
export const young = (kind: ProfileKind) => kind === 'child' || kind === 'early';

// ------------------------------------------------------------------------------------------- number hunt

/** Grid size by level: children start at 3 × 3, adults at 4 × 4; up to 5 × 5 (the classic table). */
export const gridSize = (level: number, kind: ProfileKind) => Math.min(5, (young(kind) ? 3 : 4) + Math.floor((level - 1) / 3));
export function numberGrid(size: number, seed: number): number[] {
  return shuffle(Array.from({ length: size * size }, (_, i) => i + 1), seed);
}
/** A good time to aim for: about 1.6 s per cell for children, 1.1 s for adults, a little faster each level. */
export const targetSeconds = (size: number, level: number, kind: ProfileKind) =>
  Math.round(size * size * (young(kind) ? 1.6 : 1.1) * Math.max(0.6, 1 - (level - 1) * 0.04));

// ------------------------------------------------------------------------------------------- star catcher

export interface StarRound { items: ('star' | 'moon')[]; ms: number }
/** About 70% stars; the pace quickens with the level (children slower), never faster than 450 ms. */
export function starRound(level: number, kind: ProfileKind, seed: number, count = 30): StarRound {
  const r = seeded(seed);
  const items = Array.from({ length: count }, () => (r() < 0.7 ? 'star' : 'moon') as 'star' | 'moon');
  const ms = Math.max(450, (young(kind) ? 1300 : 1000) - (level - 1) * 60);
  return { items, ms };
}
/** Hits count, misses and taps on a moon cost; the score is the share of right decisions. */
export function starScore(items: ('star' | 'moon')[], tapped: boolean[]) {
  let hits = 0, misses = 0, wrong = 0, held = 0;
  items.forEach((it, i) => {
    if (it === 'star') { if (tapped[i]) hits += 1; else misses += 1; } else if (tapped[i]) wrong += 1; else held += 1;
  });
  const score = items.length ? Math.round(((hits + held) / items.length) * 100) : 0;
  return { hits, misses, wrong, held, score };
}

// ------------------------------------------------------------------------------------------- word hunt

/** Targets with look-alikes: the eye has to read, not guess from the shape. */
export const WORD_SETS: { target: string; decoys: string[] }[] = [
  { target: 'form', decoys: ['from', 'farm', 'foam', 'fort', 'firm'] },
  { target: 'bread', decoys: ['beard', 'broad', 'bead', 'braid', 'break'] },
  { target: 'night', decoys: ['might', 'thing', 'light', 'nigh', 'sight'] },
  { target: 'plane', decoys: ['planet', 'panel', 'plan', 'place', 'plain'] },
  { target: 'trail', decoys: ['trial', 'tail', 'trait', 'rail', 'train'] },
  { target: 'calm', decoys: ['clam', 'claim', 'palm', 'calf', 'cam'] },
  { target: 'stone', decoys: ['tones', 'store', 'notes', 'stove', 'onset'] },
  { target: 'heart', decoys: ['earth', 'hater', 'heard', 'hearth', 'heat'] },
];
/** For children: pictures with look-alikes. */
export const PICTURE_SETS: { target: string; decoys: string[] }[] = [
  { target: '🐶', decoys: ['🐱', '🐺', '🦊', '🐹'] },
  { target: '🍎', decoys: ['🍅', '🍒', '🍑', '🍓'] },
  { target: '⭐', decoys: ['🌟', '✨', '🌙', '☀️'] },
  { target: '🚗', decoys: ['🚕', '🚙', '🚌', '🚓'] },
  { target: '🐸', decoys: ['🐢', '🦎', '🐍', '🐊'] },
];
export interface HuntBoard { target: string; cells: string[]; answers: number[] }
/** A board of `size` cells with 3 to 6 copies of the target among look-alikes. */
export function huntBoard(level: number, kind: ProfileKind, seed: number): HuntBoard {
  const sets = young(kind) ? PICTURE_SETS : WORD_SETS;
  const set = sets[seed % sets.length]!;
  const size = Math.min(young(kind) ? 16 : 36, (young(kind) ? 9 : 16) + (level - 1) * 4);
  const r = seeded(seed * 31 + level);
  const copies = 3 + Math.floor(r() * 4);
  const cells = Array.from({ length: size }, (_, i) => (i < copies ? set.target : set.decoys[Math.floor(r() * set.decoys.length)]!));
  const mixed = shuffle(cells, seed + 7);
  return { target: set.target, cells: mixed, answers: mixed.flatMap((c, i) => (c === set.target ? [i] : [])) };
}

// ------------------------------------------------------------------------------------------- progress and levels

export interface GameResult { game: GameId; at: string; level: number; score: number; seconds?: number }
export interface FocusProgress { levels: Record<GameId, number>; results: GameResult[]; sprints: { at: string; minutes: number; away: number; finished: boolean }[] }
export const emptyFocus = (): FocusProgress => ({ levels: { numbers: 1, stars: 1, words: 1, breath: 1 }, results: [], sprints: [] });

/** Level up after a strong result, down after two weak ones in a row; 1 to 10. Breath has no levels. */
export function nextLevel(p: FocusProgress, r: GameResult): number {
  if (r.game === 'breath') return 1;
  const strong = r.score >= 85;
  const recent = p.results.filter((x) => x.game === r.game).slice(-1);
  const weak = r.score < 55 && recent.length === 1 && recent[0]!.score < 55;
  return Math.max(1, Math.min(10, r.level + (strong ? 1 : weak ? -1 : 0)));
}

export function addResult(p: FocusProgress, r: GameResult): FocusProgress {
  return { ...p, levels: { ...p.levels, [r.game]: nextLevel(p, r) }, results: [...p.results, r].slice(-300) };
}

export const dayOf = (iso: string) => iso.slice(0, 10);
/** Days in a row with at least one exercise or sprint, up to today (or yesterday, so today can still count). */
export function focusStreak(p: FocusProgress, now = new Date()): number {
  const days = new Set([...p.results.map((r) => dayOf(r.at)), ...p.sprints.filter((s) => s.finished).map((s) => dayOf(s.at))]);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!days.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (days.has(d.toISOString().slice(0, 10))) { n += 1; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

/** The overall focus level: the average of the three trained games' levels, one decimal. */
export const focusLevel = (p: FocusProgress) => Math.round(((p.levels.numbers + p.levels.stars + p.levels.words) / 3) * 10) / 10;

/** Today's plan: a breath to settle, two exercises (the ones done least lately) and a reading sprint. */
export function todaysPlan(p: FocusProgress, now = new Date()): { items: GameId[]; done: GameId[] } {
  const today = dayOf(now.toISOString());
  const done = [...new Set(p.results.filter((r) => dayOf(r.at) === today).map((r) => r.game))];
  const trained: GameId[] = ['numbers', 'stars', 'words'];
  const lastAt = (g: GameId) => p.results.filter((r) => r.game === g).at(-1)?.at ?? '';
  const two = [...trained].sort((a, b) => lastAt(a).localeCompare(lastAt(b))).slice(0, 2);
  return { items: ['breath', ...two], done };
}

// ------------------------------------------------------------------------------------------- reading sprints

export const SPRINT_MINUTES = [5, 10, 15, 25] as const;
/**
 * The next sprint to suggest: start at 5 minutes (children) or 10 (others); after two sprints finished in a row
 * without leaving the page, one step longer; after leaving the page three times or more, one step shorter.
 */
export function suggestSprint(p: FocusProgress, kind: ProfileKind): number {
  const steps = young(kind) ? [5, 10, 15] : [...SPRINT_MINUTES];
  const last = p.sprints.slice(-2);
  const current = last.at(-1)?.minutes ?? (young(kind) ? 5 : 10);
  let i = Math.max(0, steps.indexOf(current));
  if (last.length === 2 && last.every((s) => s.finished && s.away === 0)) i = Math.min(steps.length - 1, i + 1);
  else if (last.at(-1) && last.at(-1)!.away >= 3) i = Math.max(0, i - 1);
  return steps[i]!;
}
