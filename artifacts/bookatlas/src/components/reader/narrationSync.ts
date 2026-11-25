/**
 * Narration that follows every word (Reading Intelligence phase 3, 2026-11-25). A recorded part has no word
 * timings, but its voice speaks at a steady pace with fixed pauses: 0.18 s after each chunk of sentences and 0.55 s
 * between paragraphs (tools/local-narrator). From the text and the length of the audio, each word gets its own
 * moment, so the reader can light up the word being spoken. Works for every audiobook already recorded.
 */

const CHUNK_CHARS = 350;
export const PAUSE_CHUNK = 0.18;
export const PAUSE_PARAGRAPH = 0.55;

/** The narrator's chunks: sentences grouped up to 350 characters; a very long sentence is split at commas. */
export function narratorChunks(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [paragraph];
  const pieces = sentences.flatMap((s) => (s.length <= CHUNK_CHARS ? [s] : s.split(/(?<=[,;:—–])\s+/).reduce<string[]>((acc, part) => {
    if (acc.length && `${acc[acc.length - 1]} ${part}`.length <= CHUNK_CHARS) acc[acc.length - 1] += ` ${part}`; else acc.push(part);
    return acc;
  }, [])));
  const out: string[] = [];
  for (const p of pieces) { if (out.length && `${out[out.length - 1]} ${p}`.length <= CHUNK_CHARS) out[out.length - 1] += ` ${p}`; else out.push(p); }
  return out;
}

/** One spoken word: its paragraph, its characters and its sentence in the paragraph as printed, and its time. */
export interface TimedWord { p: number; w0: number; w1: number; s0: number; s1: number; t0: number; t1: number }

/**
 * The timeline of a part: `paragraphs` as printed (with their paragraph numbers), `lead` spoken first and not shown
 * (the chapter title), `duration` the length of the audio in seconds.
 */
export function narrationTimeline(paragraphs: { p: number; text: string }[], lead: string | null, duration: number): TimedWord[] {
  if (!(duration > 0)) return [];
  type Unit = { p: number; text: string; shown: boolean };
  const units: Unit[] = [...(lead?.trim() ? [{ p: -1, text: lead.trim(), shown: false }] : []), ...paragraphs.filter((x) => x.text.trim()).map((x) => ({ ...x, shown: true }))];
  if (!units.length) return [];
  // Pauses: one after every chunk, a longer one between paragraphs. They take at most 40% of the part.
  const chunkCount = units.reduce((n, u) => n + narratorChunks(u.text.replace(/\s+/g, ' ').trim()).length, 0);
  let pauses = chunkCount * PAUSE_CHUNK + (units.length - 1) * PAUSE_PARAGRAPH;
  const scale = pauses > duration * 0.4 ? (duration * 0.4) / pauses : 1;
  pauses *= scale;
  const wordChars = (t: string): number => { let n = 0; for (const w of t.match(/\S+/g) ?? []) n += w.length + 1; return n; };
  let chars = 0;
  for (const u of units) chars += wordChars(u.text);
  const perChar = Math.max(0, duration - pauses) / Math.max(1, chars);
  const out: TimedWord[] = [];
  let t = 0;
  units.forEach((u, ui) => {
    // Sentence ranges, to light up the sentence too; chunk ends, where the narrator paused.
    const sentences = [...u.text.matchAll(/[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)/g)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length] as const).filter(([a, b]) => u.text.slice(a, b).trim());
    const chunkEnds = new Set<number>();
    { let from = 0; for (const c of narratorChunks(u.text.replace(/\s+/g, ' ').trim())) { const last = c.split(' ').pop() ?? ''; const at = u.text.indexOf(last, from); if (at >= 0) { from = at + last.length; chunkEnds.add(from); } } }
    for (const m of u.text.matchAll(/\S+/g)) {
      const w0 = m.index ?? 0, w1 = w0 + m[0].length;
      const t0 = t;
      t += (m[0].length + 1) * perChar;
      if (u.shown) {
        const s = sentences.find(([a, b]) => w0 >= a && w0 < b) ?? [w0, w1];
        out.push({ p: u.p, w0, w1, s0: s[0] + (u.text.slice(s[0], s[1]).length - u.text.slice(s[0], s[1]).trimStart().length), s1: s[1], t0, t1: t });
      }
      if (chunkEnds.has(w1)) t += PAUSE_CHUNK * scale;
    }
    if (ui < units.length - 1) t += PAUSE_PARAGRAPH * scale;
  });
  return out;
}

/** The word being spoken at `time` (the last one before it during a pause). */
export function wordAt(timeline: TimedWord[], time: number): TimedWord | null {
  if (!timeline.length || !Number.isFinite(time)) return null;
  let lo = 0, hi = timeline.length - 1;
  if (time <= timeline[0]!.t0) return timeline[0]!;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (timeline[mid]!.t0 <= time) lo = mid; else hi = mid - 1; }
  return timeline[lo]!;
}
