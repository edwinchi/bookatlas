/**
 * Natural audiobook narration (TASK-0008): price, cost estimate and the segment plan. Pure, so it is tested.
 * A segment is whole paragraphs from one chapter, about 1,200 characters (about 80 seconds of audio), so each
 * narration step fits a 60-second serverless request and the reader knows which paragraph is being heard.
 */

export const NARRATION_VOICES = ['Sulafat', 'Charon'] as const;
export type NarrationVoice = typeof NARRATION_VOICES[number];
export const VOICE_LABELS: Record<NarrationVoice, string> = { Sulafat: 'Sulafat: warm, female', Charon: 'Charon: informative, male' };

/**
 * Owner decision N4 (revised 2026-11-14, length-based): €24.99 incl. 21% VAT up to 60,000 narrated words
 * (about 220 pages), €3.99 per extra 10,000, so long books carry their Gemini cost.
 */
export const BASE_PRICE_CENTS = 2499;
export const BASE_WORDS = 60_000;
export const EXTRA_PRICE_CENTS = 399;
export const EXTRA_WORDS = 10_000;
export const SERVICE_VAT_BP = 2100;

export const SEGMENT_CHARS = 1_200;
const WORDS_PER_SECOND = 2.5; // about 150 words a minute
const AUDIO_TOKENS_PER_SECOND = 25;
const OUTPUT_MICROS_PER_MILLION = 18_000_000;
const INPUT_MICROS_PER_MILLION = 1_000_000;

export interface Chapter { title: string; content: string[] }
export interface Segment { chapter: number; from: number; to: number; chars: number }

export const plainText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
/**
 * Owner decision N6: code examples and tables are not read aloud. A code listing (symbol-dense text) and a run
 * of table cells (several very short lines without sentence punctuation) become one short spoken cue.
 */
export const CODE_CUE = 'A code example follows in the book.';
export const TABLE_CUE = 'A table follows in the book.';
export function isCodeLike(text: string) {
  if (text.length < 30) return false;
  const symbols = (text.match(/[{}()[\];=<>$#*\\|/+-]/g) ?? []).length / text.length;
  const keywords = /\b(function|const|let|var|return|import|export|class|def|public|private|static|void|SELECT|INSERT|printf|console\.log)\b|=>|::|\+\+|&&|\|\||<\/?[a-z]+>/;
  return symbols > 0.08 && (keywords.test(text) || /\n\s{2,}\S/.test(text) || /;\s*$/m.test(text));
}
const cellLike = (text: string) => text.length > 0 && text.length <= 30 && !/[.!?…:]["”’)]?$/.test(text);

/** Each paragraph as it is spoken: its text, a cue (first paragraph of a code or table run), or nothing. */
export function spokenParagraphs(chapter: Chapter): string[] {
  const texts = chapter.content.map(plainText);
  const out = texts.map((t) => (isCodeLike(t) ? 'code' : t));
  // Runs of at least six cell-like lines are a table.
  for (let i = 0; i < texts.length;) {
    let j = i;
    while (j < texts.length && cellLike(texts[j]!)) j += 1;
    if (j - i >= 6) for (let k = i; k < j; k += 1) out[k] = 'table';
    i = Math.max(j, i + 1);
  }
  return out.map((t, i) => {
    if (t !== 'code' && t !== 'table') return t;
    return out[i - 1] === t ? '' : t === 'code' ? CODE_CUE : TABLE_CUE;
  });
}

export const wordCount = (chapters: Chapter[]) => chapters.reduce((n, c) => n + spokenParagraphs(c)
  .filter((t) => t !== CODE_CUE && t !== TABLE_CUE).reduce((m, t) => m + (t.match(/\S+/g)?.length ?? 0), 0), 0);

export function narrationPrice(words: number) {
  const extra = Math.max(0, Math.ceil((words - BASE_WORDS) / EXTRA_WORDS));
  return BASE_PRICE_CENTS + extra * EXTRA_PRICE_CENTS;
}

/** Hours of audio and the Gemini cost in micro-dollars (a reservation adds a 50% safety margin). */
export function narrationEstimate(words: number) {
  const seconds = words / WORDS_PER_SECOND;
  const outputTokens = seconds * AUDIO_TOKENS_PER_SECOND;
  const inputTokens = words * 1.4;
  const micros = Math.ceil((outputTokens * OUTPUT_MICROS_PER_MILLION + inputTokens * INPUT_MICROS_PER_MILLION) / 1_000_000);
  return { seconds: Math.round(seconds), micros, reserveMicros: Math.ceil(micros * 1.5) };
}

/**
 * Whole paragraphs, one chapter at a time; a very long paragraph is its own segment (split at sentences
 * by the narrator if needed). The chapter title opens its first segment.
 */
export function planSegments(chapters: Chapter[], maxChars = SEGMENT_CHARS): Segment[] {
  const segments: Segment[] = [];
  chapters.forEach((chapter, ci) => {
    let start = -1, chars = 0;
    const spoken = spokenParagraphs(chapter);
    chapter.content.forEach((_p, pi) => {
      const len = spoken[pi]!.length;
      if (!len) return;
      if (start >= 0 && chars + len > maxChars) { segments.push({ chapter: ci, from: start, to: pi - 1, chars }); start = -1; chars = 0; }
      if (start < 0) { start = pi; chars = pi === firstText(chapter) ? plainText(chapter.title).length : 0; }
      chars += len;
    });
    if (start >= 0) segments.push({ chapter: ci, from: start, to: chapter.content.length - 1, chars });
  });
  return segments;
}
const firstText = (c: Chapter) => c.content.findIndex((p) => plainText(p).length > 0);

/** The text one step narrates: the chapter title before its first paragraph, then the paragraphs. */
export function segmentText(chapters: Chapter[], s: Segment) {
  const chapter = chapters[s.chapter]!;
  const paragraphs = spokenParagraphs(chapter).slice(s.from, s.to + 1).filter(Boolean);
  const title = s.from === firstText(chapter) && chapter.title ? `${plainText(chapter.title)}.\n\n` : '';
  return title + paragraphs.join('\n\n');
}

/** Segments a preview listener may hear: those entirely inside the free preview. */
export function inPreview(s: Segment, preview: Chapter[]) {
  const c = preview[s.chapter];
  return !!c && s.to < c.content.length;
}
