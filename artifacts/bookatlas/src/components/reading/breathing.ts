/**
 * Breathing practices (owner request 2026-11-26: "lots of breathing practices to calm the readers"). Slow
 * breathing, especially a long out-breath, helps the body settle, which makes it easier to focus before reading or
 * to wind down at bedtime. These are calming exercises, not treatment. Pure data and timing helpers, tested in
 * breathing.test.ts.
 */
export type PhaseKind = 'in' | 'hold' | 'out' | 'hum' | 'sniff' | 'hold-out';
export interface Phase { kind: PhaseKind; seconds: number; cue: string }
export interface Practice {
  id: string; name: string; emoji: string; forKids: boolean; rounds: number;
  /** When it helps: before reading, when restless, at bedtime. */
  when: ('reading' | 'restless' | 'bedtime')[];
  intro: string; phases: Phase[];
}

const P = (kind: PhaseKind, seconds: number, cue: string): Phase => ({ kind, seconds, cue });

export const PRACTICES: Practice[] = [
  // ------------------------------------------------------------------------------------- teens and adults
  { id: 'box', name: 'Box breathing', emoji: '⬜', forKids: false, rounds: 5, when: ['reading', 'restless'],
    intro: 'Four equal sides: in, hold, out, hold, four counts each. Steady and simple, a good start before reading.',
    phases: [P('in', 4, 'Breathe in through your nose'), P('hold', 4, 'Hold gently'), P('out', 4, 'Breathe out slowly'), P('hold-out', 4, 'Rest, lungs empty')] },
  { id: '478', name: '4-7-8 relaxing breath', emoji: '🌙', forKids: false, rounds: 4, when: ['bedtime', 'restless'],
    intro: 'In for 4, hold for 7, a long sigh out for 8. Calming before sleep. Stop if you feel light-headed.',
    phases: [P('in', 4, 'In through your nose'), P('hold', 7, 'Hold'), P('out', 8, 'Out through your mouth, a long whoosh')] },
  { id: 'long-out', name: 'The long out-breath', emoji: '🌊', forKids: false, rounds: 8, when: ['reading', 'restless'],
    intro: 'Breathe out for longer than you breathe in. The simplest way to slow down.',
    phases: [P('in', 4, 'Breathe in'), P('out', 6, 'Breathe out, slower and longer')] },
  { id: 'coherent', name: 'Coherent breathing', emoji: '〰️', forKids: false, rounds: 10, when: ['reading'],
    intro: 'About five and a half breaths a minute, smooth and even. Many people find it steadies the mind for a long read.',
    phases: [P('in', 5.5, 'In, smooth and slow'), P('out', 5.5, 'Out, just as smooth')] },
  { id: 'sigh', name: 'The calming sigh', emoji: '😮‍💨', forKids: false, rounds: 5, when: ['restless'],
    intro: 'Two breaths in through the nose, then one long breath out. A quick reset when you feel tense.',
    phases: [P('in', 2, 'Breathe in through your nose'), P('sniff', 1, 'A second small sip of air'), P('out', 6, 'A long breath out through your mouth')] },
  { id: 'triangle', name: 'Triangle breath', emoji: '🔺', forKids: false, rounds: 6, when: ['reading'],
    intro: 'Three sides: in, hold, out. A gentle rhythm to come back to the page.',
    phases: [P('in', 4, 'Breathe in'), P('hold', 4, 'Hold'), P('out', 4, 'Breathe out')] },
  { id: 'count', name: 'Counting breaths', emoji: '🔢', forKids: false, rounds: 10, when: ['reading', 'restless'],
    intro: 'Count each out-breath from one to ten. If your mind wanders, smile and start again at one: that is the training.',
    phases: [P('in', 4, 'Breathe in'), P('out', 5, 'Breathe out and count')] },
  { id: 'nostril', name: 'Alternate-nostril breathing', emoji: '👃', forKids: false, rounds: 6, when: ['reading', 'bedtime'],
    intro: 'Close one nostril with a finger, breathe in through the other, then switch to breathe out. Slow and balancing.',
    phases: [P('in', 4, 'In through the left nostril'), P('out', 4, 'Out through the right'), P('in', 4, 'In through the right'), P('out', 4, 'Out through the left')] },

  // ------------------------------------------------------------------------------------- children
  { id: 'balloon', name: 'Balloon breath', emoji: '🎈', forKids: true, rounds: 5, when: ['reading', 'restless'],
    intro: 'Put your hands on your tummy. Breathe in and make your tummy a big balloon, then let the air out slowly.',
    phases: [P('in', 3, 'Fill up your balloon'), P('out', 4, 'Let the air out slowly')] },
  { id: 'flower', name: 'Smell the flower, blow the candle', emoji: '🌸', forKids: true, rounds: 5, when: ['reading', 'restless'],
    intro: 'Hold up a pretend flower and a pretend candle. Smell the flower through your nose, then blow the candle gently.',
    phases: [P('in', 3, 'Smell the flower'), P('out', 4, 'Blow out the candle, gently')] },
  { id: 'bunny', name: 'Bunny breaths', emoji: '🐰', forKids: true, rounds: 5, when: ['restless'],
    intro: 'Be a bunny: three quick sniffs through your nose, then one long breath out of your mouth.',
    phases: [P('sniff', 1, 'Sniff'), P('sniff', 1, 'Sniff'), P('sniff', 1, 'Sniff'), P('out', 4, 'A long breath out')] },
  { id: 'starfish', name: 'Starfish hand', emoji: '⭐', forKids: true, rounds: 5, when: ['reading', 'bedtime'],
    intro: 'Spread your hand like a starfish. Trace up a finger as you breathe in, down as you breathe out, all five fingers.',
    phases: [P('in', 3, 'Trace up a finger, breathe in'), P('out', 3, 'Trace down, breathe out')] },
  { id: 'bee', name: 'Bumblebee hum', emoji: '🐝', forKids: true, rounds: 5, when: ['restless', 'bedtime'],
    intro: 'Breathe in, then hum like a bee as you breathe out, mmmm. Feel the buzz in your face.',
    phases: [P('in', 3, 'Breathe in'), P('hum', 5, 'Hummm like a bee')] },
  { id: 'snake', name: 'Snake breath', emoji: '🐍', forKids: true, rounds: 5, when: ['restless'],
    intro: 'Breathe in slowly, then breathe out with a long, quiet sss, like a snake.',
    phases: [P('in', 3, 'Breathe in'), P('out', 5, 'Sssss like a snake')] },
  { id: 'teddy', name: 'Teddy belly breathing', emoji: '🧸', forKids: true, rounds: 6, when: ['bedtime'],
    intro: 'Lie down with a teddy on your tummy. Breathe in and lift teddy up, breathe out and let teddy go down. Rock teddy to sleep.',
    phases: [P('in', 4, 'Lift teddy up'), P('out', 4, 'Teddy goes down')] },
];

export const practiceById = (id: string) => PRACTICES.find((p) => p.id === id) ?? null;
export const cycleSeconds = (p: Practice) => p.phases.reduce((n, x) => n + x.seconds, 0);
export const totalSeconds = (p: Practice) => cycleSeconds(p) * p.rounds;

/** Where the guide is at a time: the round, the phase, and seconds left in it; null when finished. */
export function phaseAt(p: Practice, t: number) {
  const cycle = cycleSeconds(p);
  if (t < 0 || t >= cycle * p.rounds) return null;
  const round = Math.floor(t / cycle);
  let inCycle = t - round * cycle;
  for (const [i, ph] of p.phases.entries()) {
    if (inCycle < ph.seconds) return { round: round + 1, index: i, phase: ph, left: Math.ceil(ph.seconds - inCycle) };
    inCycle -= ph.seconds;
  }
  return null;
}

/** How big the guide circle is in a phase: full after breathing in, small after breathing out. */
export function scaleFor(p: Practice, index: number): number {
  let size = 0.55;
  for (let i = 0; i <= index; i += 1) {
    const k = p.phases[i]!.kind;
    if (k === 'in') size = 1;
    else if (k === 'sniff') size = Math.min(1, size + 0.15);
    else if (k === 'out' || k === 'hum') size = 0.55;
  }
  return size;
}

export const WHEN_LABEL = { reading: 'Before reading', restless: 'When restless', bedtime: 'At bedtime' } as const;
