/**
 * Comprehension checkpoints in the reader (master build plan M4, specification SR-005): when to offer one, how a
 * score reads, and what it means for reading speed. Pure helpers, tested in checkpoints.test.ts; the server writes
 * the questions (POST /api/reader/ai/checkpoint) and keeps the results (POST /api/reader/checkpoints).
 */

/** When a checkpoint is offered. A reader can always start one by hand. */
export type CheckpointMode = 'off' | 'chapter' | 'words' | 'time';
export const CHECKPOINT_MODES: { id: CheckpointMode; label: string; note: string }[] = [
  { id: 'off', label: 'Off', note: 'Only when you ask for one in the reading assistant.' },
  { id: 'chapter', label: 'Chapter end', note: 'A quick check when you finish a chapter.' },
  { id: 'words', label: '1,000 words', note: 'A quick check after every 1,000 words you read.' },
  { id: 'time', label: '10 minutes', note: 'A quick check after every 10 minutes of reading.' },
];
export const DEFAULT_CHECKPOINT_MODE: CheckpointMode = 'chapter';
export const cleanCheckpointMode = (v: unknown): CheckpointMode => (CHECKPOINT_MODES.some((m) => m.id === v) ? v as CheckpointMode : DEFAULT_CHECKPOINT_MODE);

export const CHECKPOINT_WORDS = 1000;
export const CHECKPOINT_MS = 10 * 60_000;

/** What has been read since the last checkpoint. */
export interface CheckpointTracker { words: number; activeMs: number; chapter: number; paragraph: number }
export const startTracker = (chapter: number, paragraph: number): CheckpointTracker => ({ words: 0, activeMs: 0, chapter, paragraph });

export type CheckpointReason = 'chapter' | 'words' | 'time' | 'manual';
/**
 * Whether to offer a checkpoint now: a finished chapter (moving on to the next one), enough words, or enough
 * reading time, by the reader's choice. A passage that is too short (under 150 words) never gets one.
 */
export function checkpointDue(mode: CheckpointMode, t: CheckpointTracker, event: { chapterFinished?: boolean } = {}): CheckpointReason | null {
  if (mode === 'off') return null;
  if (mode === 'chapter') return event.chapterFinished && t.words >= 150 ? 'chapter' : null;
  if (mode === 'words') return t.words >= CHECKPOINT_WORDS ? 'words' : null;
  return t.activeMs >= CHECKPOINT_MS && t.words >= 150 ? 'time' : null;
}

/** Words read when moving from one place to another (forward only; going back reads nothing new). */
export function wordsBetween(chapters: { content: string[] }[], from: { chapter: number; paragraph: number }, to: { chapter: number; paragraph: number }) {
  if (to.chapter < from.chapter || (to.chapter === from.chapter && to.paragraph <= from.paragraph)) return 0;
  let n = 0;
  for (let c = from.chapter; c <= to.chapter; c += 1) {
    const paras = chapters[c]?.content ?? [];
    const start = c === from.chapter ? from.paragraph : 0;
    const end = c === to.chapter ? to.paragraph : paras.length;
    for (let p = start; p < end; p += 1) n += (paras[p] ?? '').split(/\s+/).filter(Boolean).length;
  }
  return n;
}

/** The specification's bands. */
export type CheckpointBand = 'excellent' | 'good' | 'fair' | 'needs-improvement';
export function scoreCheckpoint(score: number): CheckpointBand {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'needs-improvement';
}
export const BANDS: Record<CheckpointBand, { label: string; className: string }> = {
  excellent: { label: 'Excellent', className: 'bg-emerald-100 text-emerald-900' },
  good: { label: 'Good', className: 'bg-sky-100 text-sky-900' },
  fair: { label: 'Fair', className: 'bg-amber-100 text-amber-900' },
  'needs-improvement': { label: 'Needs improvement', className: 'bg-rose-100 text-rose-900' },
};

/** The specification's speed integration: under 70, read slower; over 90, try faster. */
export function checkpointAdvice(score: number): { direction: 'slower' | 'faster' | 'steady'; text: string } {
  if (score < 70) return { direction: 'slower', text: 'Slow down a little or reread the hard parts: understanding comes before speed.' };
  if (score > 90) return { direction: 'faster', text: 'You understood it well. You could try reading a little faster.' };
  return { direction: 'steady', text: 'Good understanding. Keep this pace.' };
}

export type CheckpointType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'key_concept';
export const TYPE_LABELS: Record<CheckpointType, string> = { multiple_choice: 'Choose the answer', true_false: 'True or false', fill_blank: 'Fill the blank', key_concept: 'Key idea' };
export interface CheckpointQuestion { type: CheckpointType; question: string; options: string[]; answer: number; explanation: string }
