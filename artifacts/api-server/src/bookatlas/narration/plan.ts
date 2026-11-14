/**
 * Natural audiobook narration (TASK-0008): price, cost estimate and the segment plan. Pure, so it is tested.
 * A segment is whole paragraphs from one chapter, about 1,200 characters (about 80 seconds of audio), so each
 * narration step fits a 60-second serverless request and the reader knows which paragraph is being heard.
 */

export const NARRATION_VOICES = ['Sulafat', 'Charon'] as const;
export type NarrationVoice = typeof NARRATION_VOICES[number];
export const VOICE_LABELS: Record<NarrationVoice, string> = { Sulafat: 'Sulafat: warm, female', Charon: 'Charon: informative, male' };

/** Owner decision N4: €24.99 incl. 21% VAT up to 80,000 words, €2.99 per extra 10,000 words. */
export const BASE_PRICE_CENTS = 2499;
export const BASE_WORDS = 80_000;
export const EXTRA_PRICE_CENTS = 299;
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
export const wordCount = (chapters: Chapter[]) => chapters.reduce((n, c) => n + c.content.reduce((m, p) => m + (plainText(p).match(/\S+/g)?.length ?? 0), 0), 0);

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
    chapter.content.forEach((p, pi) => {
      const len = plainText(p).length;
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
  const paragraphs = chapter.content.slice(s.from, s.to + 1).map(plainText).filter(Boolean);
  const title = s.from === firstText(chapter) && chapter.title ? `${plainText(chapter.title)}.\n\n` : '';
  return title + paragraphs.join('\n\n');
}

/** Segments a preview listener may hear: those entirely inside the free preview. */
export function inPreview(s: Segment, preview: Chapter[]) {
  const c = preview[s.chapter];
  return !!c && s.to < c.content.length;
}
