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
/** English clips (Kokoro) sit in audio/young; each other language in its own folder (Piper, phase 6). */
export const youngAudioDir = (lang: string) => (lang === 'en' ? YOUNG_AUDIO_DIR : `${YOUNG_AUDIO_DIR}/${lang}`);

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

/** What the pages say in one language (the shape of YoungContent in youngLang.ts). */
export interface SpokenContent {
  stories: { paragraphs: string[] }[];
  sounds: { say: string }[];
  words: Record<number, { word: string }[]>;
  firstWords: { words: { word: string }[] }[];
  pictureBooks: { pages: { text: string }[] }[];
  find: (w: string) => string; right: (w: string) => string; tryAgain: (w: string) => string;
}
const ENGLISH_SPOKEN: SpokenContent = { stories: STORIES, sounds: SOUNDS, words: WORDS, firstWords: FIRST_WORDS, pictureBooks: PICTURE_BOOKS, find: findPhrase, right: rightPhrase, tryAgain: tryAgainPhrase };

/** Every text the young readers' pages say in a language, once each. */
export function youngClipTexts(c: SpokenContent = ENGLISH_SPOKEN): string[] {
  const out = new Set<string>();
  const add = (t: string) => { const v = t.replace(/\s+/g, ' ').trim(); if (v) out.add(v); };
  for (const s of c.stories) for (const p of s.paragraphs) { add(p); for (const w of p.split(/\s+/)) add(tappedWord(w)); }
  for (const s of c.sounds) add(s.say);
  for (const level of Object.values(c.words)) for (const w of level) add(w.word);
  for (const g of c.firstWords) for (const w of g.words) { add(w.word); add(c.find(w.word)); add(c.right(w.word)); add(c.tryAgain(w.word)); }
  for (const b of c.pictureBooks) for (const p of b.pages) add(p.text);
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
