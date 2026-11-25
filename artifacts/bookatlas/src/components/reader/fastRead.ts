/**
 * Fast Read (Reading Intelligence, owner request 2026-11-25): the text shown one word, or a small group of words,
 * at a time at a chosen speed; word starts in bold; and a timed reading-speed check. Pure functions, tested in
 * fastRead.test.ts.
 */

export const MIN_WPM = 100;
export const MAX_WPM = 1000;
export const MIN_GROUP = 2;
export const MAX_GROUP = 8;
export const clampWpm = (w: number) => Math.round(Math.min(MAX_WPM, Math.max(MIN_WPM, Number.isFinite(w) ? w : 300)) / 10) * 10;
export const clampGroup = (n: number) => Math.min(MAX_GROUP, Math.max(MIN_GROUP, Math.round(Number.isFinite(n) ? n : 3)));

/** One step on screen: the words shown together, where they came from, and how long they stay. */
export interface FastStep { text: string; paragraph: number; words: number; ms: number }

/** The words of a paragraph (a dash or slash between words stays with the word, as it is printed). */
export const wordsOf = (text: string) => text.split(/\s+/).map((w) => w.trim()).filter(Boolean);

/**
 * How long a step stays on screen at `wpm`: the base time per word, longer after the end of a sentence or a comma
 * and for long words, so the meaning keeps up with the eyes.
 */
export function stepMs(words: string[], wpm: number) {
  const base = 60_000 / clampWpm(wpm);
  let ms = base * words.length;
  const last = words[words.length - 1] ?? '';
  if (/[.!?…。！？]["'”’)]*$/.test(last)) ms += base * 1.2;
  else if (/[,;:—–]["'”’)]*$/.test(last)) ms += base * 0.5;
  for (const w of words) if (w.replace(/[^\p{L}\p{N}]/gu, '').length > 8) ms += base * 0.3;
  return Math.round(ms);
}

/**
 * The steps for a run of paragraphs: one word at a time (`group` 1) or groups of 2 to 8 words. A group never
 * runs past the end of a sentence or a paragraph, so each one reads as a phrase.
 */
export function buildSteps(paragraphs: string[], group: number, wpm: number, firstParagraph = 0): FastStep[] {
  const size = group <= 1 ? 1 : clampGroup(group);
  const steps: FastStep[] = [];
  paragraphs.forEach((text, i) => {
    const words = wordsOf(text);
    let at = 0;
    while (at < words.length) {
      const chunk: string[] = [];
      while (at < words.length && chunk.length < size) {
        const w = words[at++]!;
        chunk.push(w);
        if (size > 1 && /[.!?…;:。！？]["'”’)]*$/.test(w)) break;
      }
      steps.push({ text: chunk.join(' '), paragraph: firstParagraph + i, words: chunk.length, ms: stepMs(chunk, wpm) });
    }
  });
  return steps;
}

/**
 * The letter the eye should rest on in a single word (a little left of the middle), so every word lines up on
 * the same point on screen. Leading quotes and brackets are skipped.
 */
export function focusIndex(word: string) {
  const lead = word.match(/^[^\p{L}\p{N}]*/u)?.[0].length ?? 0;
  const core = word.slice(lead).replace(/[^\p{L}\p{N}]+$/u, '').length;
  const offset = core <= 1 ? 0 : core <= 5 ? 1 : core <= 9 ? 2 : core <= 13 ? 3 : 4;
  return Math.min(word.length - 1, lead + offset);
}

/**
 * Bold starts: splits a paragraph into pieces; in a `bold` piece the eye finds the start of a word quickly.
 * Joined together the pieces are exactly the original text (the read-along highlight depends on that).
 */
export function boldStartPieces(text: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  const push = (t: string, bold: boolean) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last && last.bold === bold) last.text += t; else out.push({ text: t, bold });
  };
  for (const part of text.split(/(\s+)/)) {
    const m = /^([^\p{L}\p{N}]*)([\p{L}\p{N}][\p{L}\p{N}\p{M}'’-]*)(.*)$/su.exec(part);
    if (!m || /^\s+$/.test(part)) { push(part, false); continue; }
    const [, lead, word, tail] = m as unknown as [string, string, string, string];
    const n = word.length <= 3 ? 1 : Math.ceil(word.length * 0.45);
    push(lead, false); push(word.slice(0, n), true); push(word.slice(n) + tail, false);
  }
  return out;
}

/** Words per minute from a timed read; null below 5 seconds or 20 words, which says nothing. */
export function measuredWpm(words: number, seconds: number) {
  if (!Number.isFinite(words) || !Number.isFinite(seconds) || seconds < 5 || words < 20) return null;
  return Math.round(words / (seconds / 60));
}

/** A reading-speed check result, kept with the reader's settings (and on this device when signed out). */
export interface SpeedTest { at: string; wpm: number; words: number; seconds: number; source: 'book' | 'sample' }

export interface SpeedSummary { latest: number | null; average: number | null; best: number | null; count: number; change: number | null }
/** Latest, average and best words per minute, and the change since the first check. */
export function summarizeTests(tests: SpeedTest[]): SpeedSummary {
  const list = [...tests].filter((t) => Number.isFinite(t.wpm) && t.wpm > 0).sort((a, b) => a.at.localeCompare(b.at));
  if (!list.length) return { latest: null, average: null, best: null, count: 0, change: null };
  const wpm = list.map((t) => t.wpm);
  return {
    latest: wpm[wpm.length - 1]!,
    average: Math.round(wpm.reduce((a, b) => a + b, 0) / wpm.length),
    best: Math.max(...wpm),
    count: wpm.length,
    change: wpm.length > 1 ? wpm[wpm.length - 1]! - wpm[0]! : null,
  };
}

/**
 * A plan towards a target speed: about 10% faster each week with 15 minutes a day, which is a pace most readers
 * keep without losing the thread.
 */
export function speedPlan(current: number, target: number) {
  if (!(current > 0) || !(target > current)) return { weeks: 0, minutesPerDay: 15, steps: [] as number[] };
  const steps: number[] = [];
  let w = current;
  while (w < target && steps.length < 52) { w = Math.min(target, Math.round(w * 1.1)); steps.push(w); }
  return { weeks: steps.length, minutesPerDay: 15, steps };
}

const LOCAL = 'bookatlas:speed-tests:v1';
export function readLocalTests(): SpeedTest[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL) || '[]');
    return Array.isArray(v) ? v.filter((t) => t && typeof t.wpm === 'number' && typeof t.at === 'string').slice(-30) : [];
  } catch { return []; }
}
export function saveLocalTests(tests: SpeedTest[]) {
  try { localStorage.setItem(LOCAL, JSON.stringify(tests.slice(-30))); } catch { /* works without storage */ }
}

/**
 * A short passage for the speed check on the Reading Intelligence page (written for BooksAtlas), so anyone can
 * measure their speed without opening a book.
 */
export const SAMPLE_PASSAGE = [
  'The harbour town woke slowly that spring. Fishing boats came back before sunrise, their decks wet and silver, and the bakers opened their shutters to the smell of salt and warm bread.',
  'Amara had lived above the bookshop for three years. Every morning she carried a chair onto the narrow balcony, set a cup of tea on the railing and read one chapter before the street filled with voices. It was the only hour of the day that belonged to nobody else.',
  'That morning a letter lay on the doormat. The envelope was thick and the handwriting old-fashioned, with long loops on every letter. Inside was a map of the coast, drawn by hand, and a single line: the last chapter is buried where the lighthouse once stood.',
  'She read the line twice, then a third time. The lighthouse had fallen into the sea before she was born. Yet the map showed it standing, its beam drawn in faded yellow ink across the water, pointing at a cove she had never heard of.',
  'By noon she had closed the shop, packed a torch, a notebook and a spare jumper, and walked to the end of the harbour wall. The tide was going out. If the map was right, she had four hours before it came back.',
].join('\n\n');
