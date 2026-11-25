/**
 * Young readers (Reading Intelligence phase 2, owner request 2026-11-25): letter sounds, word games and short
 * stories with questions, in three reading levels. All texts were written for BooksAtlas. Pure data and helpers,
 * tested in youngReaders.test.ts.
 */

export type Level = 1 | 2 | 3;
export const LEVELS: { id: Level; name: string; ages: string; note: string }[] = [
  { id: 1, name: 'Starting out', ages: 'about 4–6', note: 'Short words and sentences.' },
  { id: 2, name: 'Growing reader', ages: 'about 6–8', note: 'Longer sentences and new words.' },
  { id: 3, name: 'Confident reader', ages: 'about 8–12', note: 'Paragraphs, feelings and reasons.' },
];

/** Letter sounds: the sound, said with a word that starts with it, and a picture. */
export interface Sound { id: string; label: string; say: string; word: string; picture: string; group: 'letters' | 'pairs' | 'vowels' }
const L = (label: string, word: string, picture: string): Sound => ({ id: label, label, say: `${label}. ${label} as in ${word}.`, word, picture, group: 'letters' });
const P = (label: string, word: string, picture: string, group: Sound['group'] = 'pairs'): Sound => ({ id: label, label, say: `${label}, as in ${word}.`, word, picture, group });
export const SOUNDS: Sound[] = [
  L('a', 'apple', '🍎'), L('b', 'ball', '⚽'), L('c', 'cat', '🐱'), L('d', 'dog', '🐶'), L('e', 'egg', '🥚'), L('f', 'fish', '🐟'),
  L('g', 'goat', '🐐'), L('h', 'hat', '🎩'), L('i', 'insect', '🐞'), L('j', 'jam', '🍯'), L('k', 'kite', '🪁'), L('l', 'lion', '🦁'),
  L('m', 'moon', '🌙'), L('n', 'nest', '🪺'), L('o', 'octopus', '🐙'), L('p', 'pig', '🐷'), L('q', 'queen', '👑'), L('r', 'rain', '🌧️'),
  L('s', 'sun', '☀️'), L('t', 'tree', '🌳'), L('u', 'umbrella', '☂️'), L('v', 'van', '🚐'), L('w', 'water', '💧'), L('x', 'box', '📦'),
  L('y', 'yellow', '💛'), L('z', 'zebra', '🦓'),
  P('sh', 'ship', '🚢'), P('ch', 'chair', '🪑'), P('th', 'thumb', '👍'), P('ph', 'phone', '📱'), P('wh', 'whale', '🐋'), P('ck', 'duck', '🦆'),
  P('ng', 'ring', '💍'), P('qu', 'quilt', '🛏️'),
  P('ee', 'tree', '🌲', 'vowels'), P('oo', 'moon', '🌕', 'vowels'), P('ai', 'rain', '🌦️', 'vowels'), P('oa', 'boat', '⛵', 'vowels'),
  P('ar', 'star', '⭐', 'vowels'), P('or', 'fork', '🍴', 'vowels'), P('ow', 'cow', '🐄', 'vowels'), P('igh', 'night', '🌃', 'vowels'),
];

/** Words with a picture, by level, for the games. */
export interface PictureWord { word: string; picture: string }
export const WORDS: Record<Level, PictureWord[]> = {
  1: [
    { word: 'cat', picture: '🐱' }, { word: 'dog', picture: '🐶' }, { word: 'sun', picture: '☀️' }, { word: 'bus', picture: '🚌' },
    { word: 'hat', picture: '🎩' }, { word: 'pig', picture: '🐷' }, { word: 'bed', picture: '🛏️' }, { word: 'cup', picture: '☕' },
    { word: 'egg', picture: '🥚' }, { word: 'fox', picture: '🦊' }, { word: 'car', picture: '🚗' }, { word: 'map', picture: '🗺️' },
  ],
  2: [
    { word: 'fish', picture: '🐟' }, { word: 'frog', picture: '🐸' }, { word: 'tree', picture: '🌳' }, { word: 'star', picture: '⭐' },
    { word: 'ship', picture: '🚢' }, { word: 'cake', picture: '🎂' }, { word: 'moon', picture: '🌙' }, { word: 'boat', picture: '⛵' },
    { word: 'duck', picture: '🦆' }, { word: 'rain', picture: '🌧️' }, { word: 'book', picture: '📖' }, { word: 'kite', picture: '🪁' },
  ],
  3: [
    { word: 'rocket', picture: '🚀' }, { word: 'turtle', picture: '🐢' }, { word: 'pencil', picture: '✏️' }, { word: 'garden', picture: '🌷' },
    { word: 'rabbit', picture: '🐰' }, { word: 'planet', picture: '🪐' }, { word: 'castle', picture: '🏰' }, { word: 'dragon', picture: '🐉' },
    { word: 'banana', picture: '🍌' }, { word: 'island', picture: '🏝️' }, { word: 'camera', picture: '📷' }, { word: 'guitar', picture: '🎸' },
  ],
};

export interface Question { question: string; options: string[]; answer: number }
export interface Story { id: string; level: Level; title: string; picture: string; paragraphs: string[]; questions: Question[] }
export const STORIES: Story[] = [
  {
    id: 'red-hat', level: 1, title: 'The Red Hat', picture: '🎩',
    paragraphs: ['Sam has a red hat.', 'The wind takes the hat. Up, up it goes!', 'A dog runs and runs. The dog gets the hat.', 'Sam is glad. "Good dog!" says Sam.'],
    questions: [
      { question: 'What colour is the hat?', options: ['Blue', 'Red', 'Green'], answer: 1 },
      { question: 'What takes the hat?', options: ['The wind', 'A cat', 'The rain'], answer: 0 },
      { question: 'Who gets the hat back?', options: ['A bird', 'Sam', 'A dog'], answer: 2 },
    ],
  },
  {
    id: 'big-pot', level: 1, title: 'Mum and the Big Pot', picture: '🍲',
    paragraphs: ['Mum has a big pot.', 'In go the beans. In go the rice and the corn.', 'Ada can smell it. Yum!', 'We sit and eat. The pot is empty.'],
    questions: [
      { question: 'What does Mum have?', options: ['A big pot', 'A big bag', 'A big box'], answer: 0 },
      { question: 'What goes in the pot first?', options: ['The corn', 'The beans', 'The fish'], answer: 1 },
      { question: 'What is in the pot at the end?', options: ['Rice', 'Soup', 'Nothing, it is empty'], answer: 2 },
    ],
  },
  {
    id: 'lost-kite', level: 2, title: 'The Lost Kite', picture: '🪁',
    paragraphs: [
      'Kofi made a kite from paper and two thin sticks. He painted a yellow sun on it.',
      'On Saturday he ran to the hill. The wind pulled the kite high above the trees.',
      'Then the string snapped! The kite flew away over the river.',
      'Kofi was sad, but his sister had an idea. "Let us make a new one together," she said. This time they made it even bigger.',
    ],
    questions: [
      { question: 'What did Kofi paint on his kite?', options: ['A moon', 'A yellow sun', 'A bird'], answer: 1 },
      { question: 'Why did the kite fly away?', options: ['The string snapped', 'Kofi let go', 'It started to rain'], answer: 0 },
      { question: 'What was the sister’s idea?', options: ['Buy a kite', 'Go home', 'Make a new kite together'], answer: 2 },
    ],
  },
  {
    id: 'garden-surprise', level: 2, title: 'A Garden Surprise', picture: '🌻',
    paragraphs: [
      'Grandpa gave Lina a tiny brown seed. "Plant it, give it water, and wait," he said.',
      'Lina watered the seed every morning. For many days, nothing happened.',
      'Then one day a green shoot pushed up through the soil. It grew taller and taller.',
      'By the end of summer it was a sunflower, taller than Grandpa! Lina laughed and took a photo.',
    ],
    questions: [
      { question: 'Who gave Lina the seed?', options: ['Her teacher', 'Grandpa', 'Her friend'], answer: 1 },
      { question: 'What did Lina do every morning?', options: ['Watered the seed', 'Sang to it', 'Moved it'], answer: 0 },
      { question: 'What did the seed grow into?', options: ['A tomato', 'An apple tree', 'A sunflower'], answer: 2 },
    ],
  },
  {
    id: 'quiet-library', level: 3, title: 'The Quiet Library', picture: '📚',
    paragraphs: [
      'Every Thursday after school, Maya went to the town library. She liked the smell of old pages and the hum of the lights.',
      'One afternoon she found a book with no title on its cover. Inside, the first page said: "Whoever reads this, please finish the story."',
      'The rest of the pages were empty. Maya looked around, but the librarian only smiled and pointed at a pencil on the desk.',
      'So Maya began to write. She wrote about a girl who could talk to rivers. When she looked up, the library was closing, and three other children were waiting to read what she had written.',
    ],
    questions: [
      { question: 'When did Maya go to the library?', options: ['Every Thursday after school', 'On Sunday mornings', 'Only in the holidays'], answer: 0 },
      { question: 'What was strange about the book?', options: ['It was very heavy', 'Its pages were empty after the first one', 'It was written in another language'], answer: 1 },
      { question: 'How do you think Maya felt at the end?', options: ['Bored', 'Angry', 'Proud that others wanted to read her story'], answer: 2 },
    ],
  },
  {
    id: 'storm-night', level: 3, title: 'The Night of the Storm', picture: '⛈️',
    paragraphs: [
      'The storm arrived just after dinner. Thunder rolled over the roof, and the lights flickered and went out.',
      'Tomás was afraid of the dark, but he remembered his uncle’s advice: when something scares you, find a way to help someone else.',
      'He found a torch in the kitchen drawer and went to his little brother’s room. Leo was hiding under the blanket.',
      'Tomás made shadow animals on the wall: a rabbit, a crab and a very silly dog. Soon Leo was laughing, and Tomás noticed he was not afraid any more.',
    ],
    questions: [
      { question: 'What happened to the lights?', options: ['They became brighter', 'They went out', 'They changed colour'], answer: 1 },
      { question: 'What was his uncle’s advice?', options: ['Go to sleep early', 'Find a way to help someone else', 'Hide under a blanket'], answer: 1 },
      { question: 'Why was Tomás not afraid any more?', options: ['Helping Leo took his mind off the dark', 'The storm stopped', 'His parents came home'], answer: 0 },
    ],
  },
];

/** A small seeded random (the same puzzle for the same round, so a test or a reload does not reshuffle). */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function shuffle<T>(list: T[], seed: number): T[] {
  const r = seeded(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j]!, out[i]!]; }
  return out;
}
/** The letters of a word in a new order (never the word itself, unless every letter is the same). */
export function scramble(word: string, seed: number) {
  const letters = [...word];
  for (let k = 0; k < 10; k += 1) { const s = shuffle(letters, seed + k); if (s.join('') !== word) return s; }
  return letters.reverse();
}
/** Spelling answers ignore case, spaces and accents. */
export const sameWord = (a: string, b: string) => a.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase() === b.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** A round of "find the picture": the word, and the right picture among `n` choices from the same level. */
export function pictureRound(level: Level, round: number, n = 3, all: Record<Level, PictureWord[]> = WORDS) {
  const words = all[level];
  const target = words[round % words.length]!;
  const others = shuffle(words.filter((w) => w.word !== target.word), round + 7).slice(0, n - 1);
  return { target, choices: shuffle([target, ...others], round + 13) };
}
/** Stars for a story quiz: one per right answer, and a bonus star for all right. */
export const storyStars = (right: number, total: number) => right + (right === total && total > 0 ? 1 : 0);
