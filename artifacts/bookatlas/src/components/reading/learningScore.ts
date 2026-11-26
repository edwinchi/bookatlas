/**
 * The learning score (specification AN-002 retention analytics and AN-003 learning score): one number from 0 to
 * 100 for how well reading turns into learning, built from four parts the reader can see and improve.
 * - Comprehension: checkpoint scores (else quiz scores).
 * - Retention: flashcards remembered (not graded Again on their last review).
 * - Consistency: days read over the last four weeks (the heatmap's score).
 * - Focus: Fast Read sessions read to the end, with few pauses and jumps back.
 * A part without data yet is left out and the others count for more. Pure, tested in learningScore.test.ts.
 */
export type PartId = 'comprehension' | 'retention' | 'consistency' | 'focus';
export const WEIGHTS: Record<PartId, number> = { comprehension: 40, retention: 25, consistency: 20, focus: 15 };

export interface LearningInputs { comprehension: number | null; retention: number | null; consistency: number | null; focus: number | null }

/** Focus from Fast Read: 60% for reading to the end, 40% for few pauses and jumps back (per 100 words). */
export function focusScore(m: { completionRate: number; pauseRate: number; rewindRate: number } | null): number | null {
  if (!m) return null;
  const steady = 1 - Math.min(1, (m.pauseRate + m.rewindRate) * 2);
  return Math.round(100 * (0.6 * Math.max(0, Math.min(1, m.completionRate)) + 0.4 * steady));
}

export function learningScore(i: LearningInputs) {
  const parts = (Object.keys(WEIGHTS) as PartId[]).map((id) => ({ id, value: i[id], weight: WEIGHTS[id] }));
  const known = parts.filter((p) => p.value !== null) as { id: PartId; value: number; weight: number }[];
  if (!known.length) return { score: null, parts, weakest: null as PartId | null, measured: 0 };
  const total = known.reduce((n, p) => n + p.weight, 0);
  const score = Math.round(known.reduce((n, p) => n + Math.max(0, Math.min(100, p.value)) * p.weight, 0) / total);
  const weakest = known.length > 1 ? known.reduce((a, b) => (b.value < a.value ? b : a)).id : null;
  return { score, parts, weakest, measured: known.length };
}

export const scoreBand = (s: number) => (s >= 85 ? 'Excellent' : s >= 70 ? 'Strong' : s >= 50 ? 'Growing' : 'Getting started');

export const PART_TEXT: Record<PartId, { name: string; how: string; tip: string }> = {
  comprehension: { name: 'Comprehension', how: 'Your checkpoint and quiz scores.', tip: 'Take the quick checkpoint at the end of a chapter, and slow down a little where the scores dip.' },
  retention: { name: 'Retention', how: 'Flashcards you still remember.', tip: 'Review your due flashcards for a few minutes a day; each card comes back just before you would forget it.' },
  consistency: { name: 'Consistency', how: 'Days you read in the last four weeks.', tip: 'A little every day beats a lot once a week: try ten minutes at the same time each day.' },
  focus: { name: 'Focus', how: 'Fast Read sessions read to the end, with few pauses.', tip: 'Choose a slightly slower Fast Read speed so you can read to the end without stopping.' },
};
