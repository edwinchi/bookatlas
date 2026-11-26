import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { readableChapters, type Generate } from './ai.js';
import { ReaderError, getPreferences, saveSettingsKey } from './service.js';

/**
 * Comprehension checkpoints (master build plan M4, specification SR-005). A short check of what was just read:
 * offered at the end of a chapter, every 1,000 words, every 10 minutes or when the reader asks. Four questions,
 * one of each type (multiple choice, true or false, fill the blank, key concept recall), written by the AI from
 * the passage only. The score is kept in the reader's settings (no new table: the owner runs migrations) and on
 * the device, where it feeds the adaptive speed coach.
 */
export const CHECKPOINT_TYPES = ['multiple_choice', 'true_false', 'fill_blank', 'key_concept'] as const;
export type CheckpointType = (typeof CHECKPOINT_TYPES)[number];
export const CHECKPOINT_REASONS = ['chapter', 'words', 'time', 'manual'] as const;
export type CheckpointReason = (typeof CHECKPOINT_REASONS)[number];
export interface CheckpointQuestion { type: CheckpointType; question: string; options: string[]; answer: number; explanation: string }

/** The specification's scoring bands. */
export type CheckpointBand = 'excellent' | 'good' | 'fair' | 'needs-improvement';
export function scoreCheckpoint(score: number): CheckpointBand {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'needs-improvement';
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');

/** What the AI sent, made safe: known types, 2 to 4 options, a valid answer, a blank in a fill-the-blank question. */
export function cleanCheckpointQuestions(data: unknown): CheckpointQuestion[] {
  const list = data && typeof data === 'object' && Array.isArray((data as { questions?: unknown }).questions) ? (data as { questions: unknown[] }).questions : [];
  const out: CheckpointQuestion[] = [];
  for (const raw of list) {
    const q = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const type = CHECKPOINT_TYPES.includes(q.type as CheckpointType) ? q.type as CheckpointType : 'multiple_choice';
    let options = (Array.isArray(q.options) ? q.options : []).map((o) => clean(o, 200)).filter(Boolean).slice(0, 4);
    let question = clean(q.question, 400);
    const answer = Number(q.answer);
    if (type === 'true_false') options = options.length === 2 ? options : [];
    if (type === 'fill_blank' && question && !/_{2,}/.test(question)) question = '';
    if (!question || options.length < 2 || new Set(options).size !== options.length || !Number.isInteger(answer) || answer < 0 || answer >= options.length) continue;
    out.push({ type, question, options, answer, explanation: clean(q.explanation, 400) });
  }
  return out.slice(0, 6);
}

/** Paragraphs the checkpoint covers: the range sent (what was just read), else the whole chapter. */
export function checkpointRange(paragraphs: number, from: unknown, to: unknown) {
  const last = Math.max(0, paragraphs - 1);
  const f = Number.isInteger(Number(from)) ? Math.min(Math.max(0, Number(from)), last) : 0;
  const t = Number.isInteger(Number(to)) ? Math.min(Math.max(f, Number(to)), last) : last;
  return { from: f, to: t };
}

const cache = new Map<string, CheckpointQuestion[]>();
export async function checkpointQuestions(generate: Generate, book: Book, who: Identity, body: Record<string, unknown>) {
  const { access, chapters } = await readableChapters(book, who);
  const ci = Number(body.chapterIndex);
  const chapter = Number.isInteger(ci) ? chapters[ci] : undefined;
  if (!chapter) throw new ReaderError(access === 'preview' ? 'This chapter is not in the free preview.' : 'Unknown chapter.', access === 'preview' ? 403 : 404);
  const { from, to } = checkpointRange(chapter.content.length, body.from, body.to);
  const text = chapter.content.slice(from, to + 1).join('\n').slice(0, 16_000);
  if (text.replace(/\s+/g, ' ').length < 200) throw new ReaderError('There is not enough text here for a checkpoint yet. Read a little more.', 409);
  const key = `${book.id}|${ci}|${from}|${to}|${access}`;
  const known = cache.get(key);
  if (known) return { chapterIndex: ci, from, to, cached: true, questions: known };
  const raw = await generate({
    jsonMode: true, temperature: 0.2,
    systemInstruction: `You write a quick comprehension checkpoint for a reader of "${book.title}" by ${book.author}. Use only the passage. Write in the language of the passage. Reply with JSON only: {"questions": [{"type": "multiple_choice" | "true_false" | "fill_blank" | "key_concept", "question": "...", "options": ["..."], "answer": 0, "explanation": "why, 1 sentence"}]}. Exactly 4 questions, one of each type: multiple_choice has 4 options; true_false is a statement with the 2 options "True" and "False" (in the passage's language); fill_blank is a sentence from the ideas of the passage with ____ where a key word goes and 4 options; key_concept asks which idea, term or event the passage is about, with 4 options. "answer" is the index of the right option. Test understanding, not tiny details. No spoilers beyond the passage.`,
    messages: [{ role: 'user', text: `Chapter ${ci + 1}: "${chapter.title}"\n"""${text.replace(/"""/g, '"')}"""` }],
  });
  let parsed: unknown;
  try { const m = (raw ?? '').match(/\{[\s\S]*\}/); parsed = JSON.parse(m ? m[0] : raw ?? ''); } catch { throw new ReaderError('The AI assistant returned an unreadable checkpoint. Please try again.', 502); }
  const questions = cleanCheckpointQuestions(parsed);
  if (questions.length < 2) throw new ReaderError('The AI assistant could not build a checkpoint from this passage. Please try again.', 502);
  cache.set(key, questions);
  return { chapterIndex: ci, from, to, cached: false, questions };
}

// ------------------------------------------------------------------------------------------- results

export const CHECKPOINTS_KEY = 'checkpoints';
export interface CheckpointResult { bookId: string; chapterIndex: number; score: number; right: number; total: number; reason: CheckpointReason; at: string }

/** Saved results, cleaned; newest last, at most 200. */
export function readCheckpoints(raw: unknown): CheckpointResult[] {
  if (!Array.isArray(raw)) return [];
  const out: CheckpointResult[] = [];
  for (const v of raw) {
    const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const total = Number(r.total), right = Number(r.right), chapterIndex = Number(r.chapterIndex);
    const at = typeof r.at === 'string' && !Number.isNaN(Date.parse(r.at)) ? new Date(r.at).toISOString() : '';
    if (typeof r.bookId !== 'string' || !/^[\w.-]{1,120}$/.test(r.bookId) || !at) continue;
    if (!Number.isInteger(total) || total < 1 || total > 10 || !Number.isInteger(right) || right < 0 || right > total || !Number.isInteger(chapterIndex) || chapterIndex < 0) continue;
    out.push({ bookId: r.bookId, chapterIndex, right, total, score: Math.round((right / total) * 100), reason: CHECKPOINT_REASONS.includes(r.reason as CheckpointReason) ? r.reason as CheckpointReason : 'manual', at });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(-200);
}

/** The specification's ComprehensionMetrics: average, how many, the band, the trend of the last five against the five before. */
export function checkpointSummary(list: CheckpointResult[]) {
  if (!list.length) return { totalCheckpoints: 0, averageScore: null, band: null, lastFive: null, trend: null, recent: [] as CheckpointResult[] };
  const avg = (xs: CheckpointResult[]) => Math.round(xs.reduce((a, r) => a + r.score, 0) / xs.length);
  const averageScore = avg(list);
  const last = list.slice(-5), before = list.slice(-10, -5);
  const lastFive = avg(last);
  const trend = before.length ? (lastFive - avg(before) >= 5 ? 'up' : avg(before) - lastFive >= 5 ? 'down' : 'steady') : null;
  return { totalCheckpoints: list.length, averageScore, band: scoreCheckpoint(averageScore), lastFive, trend, recent: list.slice(-10).reverse() };
}

export async function recordCheckpoint(userId: string, body: Record<string, unknown>, now = new Date()) {
  const [result] = readCheckpoints([{ ...body, at: now.toISOString() }]);
  if (!result) throw new ReaderError('Send the book, the chapter and the number of right answers.');
  const list = readCheckpoints((await getPreferences(userId))?.settings?.[CHECKPOINTS_KEY]);
  list.push(result);
  const kept = list.slice(-200);
  await saveSettingsKey(userId, CHECKPOINTS_KEY, kept);
  return { result, band: scoreCheckpoint(result.score), summary: checkpointSummary(kept) };
}

export async function checkpointsOf(userId: string) {
  return checkpointSummary(readCheckpoints((await getPreferences(userId))?.settings?.[CHECKPOINTS_KEY]));
}
