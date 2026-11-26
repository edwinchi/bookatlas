/**
 * The audiobook as one continuous stream (owner request 2026-11-26: it stopped when the phone locked, because a
 * locked phone may refuse to start the next file). The player plays /narration/stream/<from> and works out from
 * the playing time which part (and so which chapter and word) is being heard. Pure, tested in
 * narrationStream.test.ts.
 */
export interface StreamPart { n: number; chapter: number; from: number; to: number; seconds: number; bytes: number }

/** Every part has a known size: the stream can be used. */
export const canStream = (segs: { bytes?: number }[]) => segs.length > 0 && segs.every((s) => (s.bytes ?? 0) > 0);

/** Where each part starts in the stream, in bytes, and the stream's total size. */
export function streamLayout(parts: { bytes: number }[]) {
  const starts: number[] = [];
  let total = 0;
  for (const p of parts) { starts.push(total); total += p.bytes; }
  return { starts, total };
}

/**
 * Bytes per second of the stream: from its real length once the browser knows it, else 8,000 (64 kbps, how
 * BooksAtlas narrations are encoded).
 */
export const bytesPerSecond = (total: number, duration: number) => (Number.isFinite(duration) && duration > 0 ? total / duration : 8000);

/** The part being heard at a time in the stream, and the time within that part. */
export function partAt(starts: number[], sizes: number[], time: number, bps: number) {
  const b = Math.max(0, time * bps);
  let i = 0;
  while (i + 1 < starts.length && starts[i + 1]! <= b) i += 1;
  return { index: i, local: Math.max(0, (b - starts[i]!) / bps), length: (sizes[i] ?? 0) / bps };
}

/** The time in the stream where a part starts. */
export const timeOfPart = (starts: number[], index: number, bps: number) => (starts[Math.max(0, Math.min(index, starts.length - 1))] ?? 0) / bps;
