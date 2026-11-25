import { FIRST_WORDS, PICTURE_BOOKS } from './firstWords';
import { SOUNDS, STORIES, WORDS } from './youngReaders';

/**
 * Natural-voice audio for young readers (Reading Intelligence phase 4, owner request 2026-11-25). Every fixed text
 * the children's pages say aloud is recorded once with the free Kokoro voice on the owner's computer
 * (`npm run young` in tools/local-narrator) into public/audio/young/. The pages play the recording when there is
 * one, with each word lit up from the recorded timings, and use the device voice otherwise.
 * Pure helpers, shared with the narrator and tested in youngVoice.test.ts.
 */
export const YOUNG_AUDIO_DIR = 'audio/young';

/** The same text always gets the same short key, so changed texts are recorded again and old clips dropped. */
export function clipKey(text: string) {
  const t = text.replace(/\s+/g, ' ').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${h.toString(36)}${t.length.toString(36)}`;
}

/** A word as the story page shows it, without the punctuation (what is said when a child taps it). */
export const tappedWord = (w: string) => w.replace(/[^\p{L}\p{N}'’-]/gu, '');
export const findPhrase = (word: string) => `Find the ${word}!`;
export const rightPhrase = (word: string) => `Yes! The ${word}!`;
export const tryAgainPhrase = (word: string) => `That is the ${word}. Try again!`;

/** Every text the young readers' pages say, once each. */
export function youngClipTexts(): string[] {
  const out = new Set<string>();
  const add = (t: string) => { const v = t.replace(/\s+/g, ' ').trim(); if (v) out.add(v); };
  for (const s of STORIES) for (const p of s.paragraphs) { add(p); for (const w of p.split(/\s+/)) add(tappedWord(w)); }
  for (const s of SOUNDS) add(s.say);
  for (const level of Object.values(WORDS)) for (const w of level) add(w.word);
  for (const g of FIRST_WORDS) for (const w of g.words) { add(w.word); add(findPhrase(w.word)); add(rightPhrase(w.word)); add(tryAgainPhrase(w.word)); }
  for (const b of PICTURE_BOOKS) for (const p of b.pages) add(p.text);
  return [...out];
}

/** Recorded timings of one clip: its length and, per spoken piece, [first character, start s, end s]. */
export interface ClipTiming { d: number; t: [number, number, number][] }
export interface ClipManifest { voice: string; clips: Record<string, ClipTiming> }

/**
 * The character where the word being said at `sec` starts. Inside a piece, the time is shared out by the length
 * of its words; between pieces, the last word of the previous piece stays lit.
 */
export function wordAtTime(text: string, timing: ClipTiming, sec: number): number | null {
  const words = [...text.matchAll(/\S+/g)].map((m) => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  if (!words.length || !timing.t.length) return null;
  let piece = -1;
  for (let i = 0; i < timing.t.length; i += 1) if (sec >= timing.t[i]![1]) piece = i;
  if (piece < 0) return null;
  const [from, start, end] = timing.t[piece]!;
  const to = piece + 1 < timing.t.length ? timing.t[piece + 1]![0] : text.length;
  const inPiece = words.filter((w) => w.start >= from && w.start < to);
  if (!inPiece.length) return null;
  const weight = (w: { start: number; end: number }) => w.end - w.start + 1;
  const total = inPiece.reduce((n, w) => n + weight(w), 0);
  const at = Math.min(1, Math.max(0, (sec - start) / Math.max(0.05, end - start))) * total;
  let n = 0;
  for (const w of inPiece) { n += weight(w); if (at < n) return w.start; }
  return inPiece[inPiece.length - 1]!.start;
}
