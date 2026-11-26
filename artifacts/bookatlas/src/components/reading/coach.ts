import { clampWpm, type SpeedTest } from '../reader/fastRead';

/**
 * The adaptive coach (Reading Intelligence phase 2, 2026-11-25): from the reader's speed checks, quiz scores and
 * reading time, the next step: a Fast Read speed, how hard the quizzes should be, and a short plan for today.
 */

export interface CoachInput {
  tests: SpeedTest[];
  /** Average quiz score in percent, or null before any quiz. */
  quizAverage: number | null;
  quizzes: number;
  /** Minutes read today and the daily goal. */
  todayMinutes: number;
  goalMinutes: number;
  streak: number;
}
export interface CoachStep {
  /** The Fast Read speed to practise at. */
  wpm: number;
  /** Why this speed. */
  speedReason: string;
  /** "easy" when understanding needs work, "stretch" when it is solid. */
  quizLevel: 'easy' | 'normal' | 'stretch';
  explain: 'child' | 'student' | 'professional' | 'expert';
  plan: string[];
}

/**
 * Speed rises only while understanding holds: 10% faster with quiz scores of 80% or more, the same pace from 60%,
 * and 10% slower below that, so speed never costs the meaning.
 */
export function nextStep(i: CoachInput): CoachStep {
  const sorted = [...i.tests].sort((a, b) => a.at.localeCompare(b.at));
  const latest = sorted[sorted.length - 1]?.wpm ?? null;
  const q = i.quizAverage;
  let wpm: number, speedReason: string;
  if (latest === null) { wpm = 250; speedReason = 'Take a speed check first; until then, practise at a comfortable 250 words a minute.'; }
  else if (q === null) { wpm = clampWpm(latest); speedReason = `Practise at your own pace (${latest}) and take a chapter quiz, so the coach knows how much you keep.`; }
  else if (q >= 80) { wpm = clampWpm(latest * 1.1); speedReason = `You keep ${q}% of what you read, so you can go a little faster.`; }
  else if (q >= 60) { wpm = clampWpm(latest); speedReason = `Your quiz scores (${q}%) say: stay at this pace until they reach 80%.`; }
  else { wpm = clampWpm(latest * 0.9); speedReason = `Your quiz scores (${q}%) say: slow down a little so the meaning keeps up.`; }
  const quizLevel = q === null ? 'normal' : q >= 85 ? 'stretch' : q < 60 ? 'easy' : 'normal';
  const explain = quizLevel === 'easy' ? 'child' : quizLevel === 'stretch' ? 'professional' : 'student';
  const left = Math.max(0, i.goalMinutes - i.todayMinutes);
  const plan = [
    left > 0 ? `Read for ${left} more minute${left === 1 ? '' : 's'} today to reach your goal of ${i.goalMinutes}.` : `Today’s goal of ${i.goalMinutes} minutes is done. Anything more is a bonus.`,
    `5 minutes of Fast Read at ${wpm} words a minute.`,
    i.quizzes < 3 ? 'Finish a chapter, then take its quiz in the AI coach (cap icon in the reader).' : quizLevel === 'easy'
      ? 'Before the next chapter quiz, read the one-minute summary first.'
      : quizLevel === 'stretch' ? 'Try the complete summary and the professional explanations: you are ready for more depth.' : 'Take one chapter quiz this week to keep track of what you remember.',
  ];
  if (i.streak >= 2) plan.push(`Keep your ${i.streak}-day streak going.`);
  else if (sorted.length === 0) plan.push('Take a speed check: it takes about a minute.');
  return { wpm, speedReason, quizLevel, explain, plan };
}
