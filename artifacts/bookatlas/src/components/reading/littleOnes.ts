/**
 * Little ones: a reading program for babies and toddlers, 0 months to 3 years (owner request 2026-11-26; the
 * specification's "Baby Reader" module). Six stages by age, each with a short daily plan for a parent or carer:
 * high-contrast cards, rhymes and lullabies with actions, first words, picture books and, later, short stories.
 * The grown-up does the reading; the screen is a short prompt. All texts were written for BooksAtlas.
 * Pure data and helpers, tested in littleOnes.test.ts.
 */

export type StageId = 'newborn' | 'reaching' | 'babbling' | 'first-words' | 'word-burst' | 'storyteller';

/** Where an activity happens: here (cards, rhymes), in Young readers (words, books, games, stories), or off-screen. */
export type Activity =
  | { id: string; kind: 'contrast'; title: string; how: string; minutes: number; colour: boolean }
  | { id: string; kind: 'rhyme'; title: string; how: string; minutes: number; rhyme: string }
  | { id: string; kind: 'words'; title: string; how: string; minutes: number; group: string }
  | { id: string; kind: 'book'; title: string; how: string; minutes: number; book: string }
  | { id: string; kind: 'find'; title: string; how: string; minutes: number }
  | { id: string; kind: 'stories'; title: string; how: string; minutes: number }
  | { id: string; kind: 'sounds'; title: string; how: string; minutes: number }
  | { id: string; kind: 'talk'; title: string; how: string; minutes: number }
  | { id: string; kind: 'breathe'; title: string; how: string; minutes: number };

export interface Stage {
  id: StageId; from: number; to: number; name: string; ages: string; headline: string; why: string;
  minutes: string; activities: Activity[]; tips: string[]; notice: string[];
}

export const STAGES: Stage[] = [
  {
    id: 'newborn', from: 0, to: 3, name: 'Listening and looking', ages: '0–3 months',
    headline: 'Your voice is the first book.',
    why: 'Newborns already know the voice they heard before birth. Hearing it often, and looking at bold black-and-white shapes held close, helps the first links for language and attention to grow.',
    minutes: 'A few minutes, several times a day',
    activities: [
      { id: 'nb-contrast', kind: 'contrast', title: 'Black and white cards', how: 'Hold the screen 20 to 30 cm from your baby’s face. Show one card at a time and talk about it. Stop when your baby looks away.', minutes: 2, colour: false },
      { id: 'nb-tummy', kind: 'rhyme', title: 'Tummy time rhyme', how: 'During tummy time, get down to your baby’s eye level and say the rhyme slowly.', minutes: 2, rhyme: 'up-goes-the-head' },
      { id: 'nb-lullaby', kind: 'rhyme', title: 'A lullaby', how: 'Sing or say it softly at sleep time. Your voice matters more than the tune.', minutes: 2, rhyme: 'moon-is-here' },
      { id: 'nb-talk', kind: 'talk', title: 'Talk through the day', how: 'Tell your baby what you are doing during changes, feeds and baths, in a calm, warm voice. Pause as if waiting for an answer.', minutes: 5 },
    ],
    tips: ['Short and often is best: one or two minutes at a time.', 'Hold faces and pictures 20 to 30 cm away, where a newborn sees most clearly.', 'If your baby turns away or fusses, they have had enough for now. Try again later.'],
    notice: ['Turns towards your voice', 'Looks at your face or a bold shape for a few seconds', 'Calms when you talk or sing'],
  },
  {
    id: 'reaching', from: 3, to: 6, name: 'Reaching and cooing', ages: '3–6 months',
    headline: 'Every coo is a turn in a conversation.',
    why: 'Babies now coo, laugh and reach. When you answer their sounds and wait for the next one, they learn that talking goes back and forth, which is the root of reading together later.',
    minutes: 'About 10 minutes a day, in short moments',
    activities: [
      { id: 'rc-contrast', kind: 'contrast', title: 'Bold cards with red', how: 'Red is one of the first colours babies see well. Name each shape and let your baby reach for the screen.', minutes: 2, colour: true },
      { id: 'rc-toes', kind: 'rhyme', title: 'Little toes', how: 'Touch toes, knees, tummy and nose as you say each line.', minutes: 2, rhyme: 'little-toes' },
      { id: 'rc-boat', kind: 'rhyme', title: 'Rock the little boat', how: 'Hold your baby safely and rock gently from side to side with the words.', minutes: 2, rhyme: 'little-boat' },
      { id: 'rc-colours', kind: 'book', title: 'A colours picture book', how: 'Read one page at a time and point at the picture.', minutes: 2, book: 'colours-everywhere' },
      { id: 'rc-talk', kind: 'talk', title: 'Copy the coos', how: 'When your baby makes a sound, copy it, then wait. Smile when they answer.', minutes: 3 },
    ],
    tips: ['Let your baby touch and hold board books, and chew them too: that is how babies explore.', 'Read the same few things again and again. Babies love what they know.', 'Change your voice for different animals and people.'],
    notice: ['Coos and laughs back when you talk', 'Reaches for faces, toys and books', 'Watches your mouth when you speak'],
  },
  {
    id: 'babbling', from: 6, to: 12, name: 'Babbling and naming', ages: '6–12 months',
    headline: 'Name the world, one thing at a time.',
    why: 'Babbling (“ba-ba”, “da-da”) is practice for words. Babies start to understand names long before they can say them, so naming what they look at builds the words they will use soon.',
    minutes: 'About 10 to 15 minutes a day',
    activities: [
      { id: 'bb-farm', kind: 'book', title: 'At the farm', how: 'Make each animal sound and wait to see if your baby tries one too.', minutes: 3, book: 'at-the-farm' },
      { id: 'bb-animals', kind: 'words', title: 'Animal words', how: 'Tap a picture, hear the word, and say it again yourself.', minutes: 3, group: 'animals' },
      { id: 'bb-peekaboo', kind: 'rhyme', title: 'Where is the sun?', how: 'Hide your face behind your hands and pop out on “peekaboo”.', minutes: 2, rhyme: 'where-is-the-sun' },
      { id: 'bb-clap', kind: 'rhyme', title: 'Clap, clap, tap', how: 'Help your baby clap and tap along.', minutes: 2, rhyme: 'clap-clap-tap' },
      { id: 'bb-talk', kind: 'talk', title: 'Point and name', how: 'Point at things on a walk or at home and name them: “Dog! A big dog.” Follow what your baby looks at.', minutes: 5 },
    ],
    tips: ['Follow your baby’s gaze: name what they are already looking at.', 'Use real words, not only baby words, and keep sentences short.', 'Bath time and meal times are perfect for rhymes.'],
    notice: ['Babbles strings of sounds like “ba-ba-ba”', 'Turns when you say their name', 'Looks at a thing when you name it'],
  },
  {
    id: 'first-words', from: 12, to: 18, name: 'First words', ages: '12–18 months',
    headline: 'Point, name, celebrate.',
    why: 'Most children say their first words around now and understand many more. Pointing together at pictures and naming them is one of the strongest ways to grow those words.',
    minutes: 'About 15 minutes a day',
    activities: [
      { id: 'fw-food', kind: 'words', title: 'Food words', how: 'Tap a picture and say the word. At meal times, name the real food too.', minutes: 3, group: 'food' },
      { id: 'fw-family', kind: 'words', title: 'Family words', how: 'Say the names of the people your child knows as you look at each picture.', minutes: 2, group: 'family' },
      { id: 'fw-moo', kind: 'rhyme', title: 'Who says moo?', how: 'Pause before each animal sound and let your child fill it in.', minutes: 2, rhyme: 'who-says-moo' },
      { id: 'fw-night', kind: 'book', title: 'Good night, moon and stars', how: 'A calm book for bedtime. Point at the moon and the stars.', minutes: 3, book: 'good-night' },
      { id: 'fw-talk', kind: 'talk', title: '“Where is…?”', how: 'Ask “Where is the ball?” and cheer when your child points or looks. Then name it again.', minutes: 5 },
    ],
    tips: ['When your child says part of a word, say the whole word back warmly (“ba!” → “Yes, ball!”).', 'Let your child turn the pages and choose the book.', 'Keep a short bedtime story every night: routines help children feel safe.'],
    notice: ['Says a few words, even if not clearly', 'Points at things to show you', 'Follows simple requests like “give me the cup”'],
  },
  {
    id: 'word-burst', from: 18, to: 24, name: 'The word burst', ages: '18–24 months',
    headline: 'Two words become a sentence.',
    why: 'Many children learn new words quickly now and start joining two together (“car go”). Games that ask them to find a picture, and books with shapes and things that move, feed this word burst.',
    minutes: 'About 15 to 20 minutes a day',
    activities: [
      { id: 'wb-find', kind: 'find', title: 'Find it game', how: 'Listen to the word together and let your child tap the right picture. Praise every try.', minutes: 3 },
      { id: 'wb-vehicles', kind: 'words', title: 'Things that go', how: 'Make the sound of each one: brrm, choo-choo, whoosh.', minutes: 2, group: 'vehicles' },
      { id: 'wb-shapes', kind: 'book', title: 'Shapes all around', how: 'After each page, find the same shape in the room together.', minutes: 3, book: 'shapes-around' },
      { id: 'wb-steps', kind: 'rhyme', title: 'Five little steps', how: 'Walk, jump and turn together as you count.', minutes: 2, rhyme: 'five-little-steps' },
      { id: 'wb-sleepy', kind: 'rhyme', title: 'Sleepy feet', how: 'Say it more and more slowly at bedtime, with a big yawn.', minutes: 2, rhyme: 'sleepy-feet' },
      { id: 'wb-talk', kind: 'talk', title: 'Add one word', how: 'When your child says “car go”, answer with a little more: “Yes, the red car goes fast!”', minutes: 5 },
    ],
    tips: ['Add one or two words to what your child says, without correcting them.', 'Offer choices: “The duck book or the bus book?”', 'Read the same favourite book many times; leave out a word and let your child say it.'],
    notice: ['Uses many single words and starts to join two', 'Points at pictures when you name them', 'Enjoys simple pretend play, like feeding a teddy'],
  },
  {
    id: 'storyteller', from: 24, to: 37, name: 'Little storyteller', ages: '2–3 years',
    headline: 'What happens next?',
    why: 'Children now enjoy short stories, ask lots of questions and can finish lines they know. Talking about stories (“Why is he sad?”) builds understanding, the heart of reading.',
    minutes: 'About 20 minutes a day, often at bedtime',
    activities: [
      { id: 'st-stories', kind: 'stories', title: 'A short story', how: 'Choose a Level 1 story. Let it read aloud, then ask one question about it together.', minutes: 5 },
      { id: 'st-shapes', kind: 'words', title: 'Shapes', how: 'Name each shape, then look for it at home: the round clock, the square window.', minutes: 2, group: 'shapes' },
      { id: 'st-colours', kind: 'rhyme', title: 'Red and blue', how: 'Point at something of each colour as you say the line.', minutes: 2, rhyme: 'red-and-blue' },
      { id: 'st-chant', kind: 'rhyme', title: 'Round, square, point', how: 'Draw each shape in the air with your finger.', minutes: 2, rhyme: 'round-square-point' },
      { id: 'st-breathe', kind: 'breathe', title: 'Bunny breaths before bed', how: 'Sit close and breathe together: three little sniffs in through the nose like a bunny, then one long, slow breath out. Do it three times, then start the bedtime story.', minutes: 2 },
      { id: 'st-sounds', kind: 'sounds', title: 'The sound of a letter', how: 'Try just the letter of your child’s name and one or two more. No pressure: this is play.', minutes: 2 },
      { id: 'st-talk', kind: 'talk', title: 'Tell it back', how: 'After a story, ask your child to tell you what happened, and what they would do.', minutes: 5 },
    ],
    tips: ['Ask open questions: “What do you think happens next?”', 'Let your child “read” a familiar book to you from the pictures.', 'Visit a library together and let your child choose.'],
    notice: ['Uses short sentences of two or three words or more', 'Asks “what” and “why” questions', 'Joins in with rhymes and finishes familiar lines'],
  },
];

/** Rhymes and lullabies with an action for the grown-up on each line. */
export interface Rhyme { id: string; title: string; kind: 'rhyme' | 'lullaby'; lines: { text: string; action?: string }[] }
export const RHYMES: Rhyme[] = [
  { id: 'up-goes-the-head', title: 'Up Goes the Head', kind: 'rhyme', lines: [
    { text: 'Up goes the head, look at me!', action: 'Lie face to face with your baby.' },
    { text: 'What can my clever baby see?' },
    { text: 'A smile, a toy, a friendly face,', action: 'Smile and hold up a toy.' },
    { text: 'you are the strongest in the place!', action: 'Clap gently.' },
  ] },
  { id: 'moon-is-here', title: 'Hush Now, the Moon Is Here', kind: 'lullaby', lines: [
    { text: 'Hush now, the moon is here,', action: 'Rock slowly.' },
    { text: 'soft and silver, round and clear.' },
    { text: 'Close your eyes, the stars will keep', action: 'Stroke the forehead softly.' },
    { text: 'a little light while you sleep.' },
  ] },
  { id: 'little-toes', title: 'Little Toes', kind: 'rhyme', lines: [
    { text: 'One little toe, two little toes,', action: 'Touch one toe, then another.' },
    { text: 'wiggle them, wiggle them, there they go!', action: 'Wiggle the toes.' },
    { text: 'Up to the knees and round the tummy,', action: 'Walk your fingers up and circle the tummy.' },
    { text: 'a kiss on the nose for my little honey.', action: 'Kiss or tap the nose.' },
  ] },
  { id: 'little-boat', title: 'Rock the Little Boat', kind: 'rhyme', lines: [
    { text: 'Rock, rock, the little boat,', action: 'Rock gently side to side.' },
    { text: 'on the water, see it float.' },
    { text: 'Up the wave and down the wave,', action: 'Lift a little, then lower.' },
    { text: 'home we come, my sailor brave.', action: 'A cuddle.' },
  ] },
  { id: 'where-is-the-sun', title: 'Where Is the Sun?', kind: 'rhyme', lines: [
    { text: 'Where is the sun? Behind the cloud!', action: 'Cover your face with your hands.' },
    { text: 'Peekaboo, sun! Let’s laugh out loud.', action: 'Open your hands and smile.' },
    { text: 'Where is my baby? Behind my hands!', action: 'Cover your eyes again.' },
    { text: 'Peekaboo, baby! There you stand!', action: 'Peekaboo!' },
  ] },
  { id: 'clap-clap-tap', title: 'Clap, Clap, Tap', kind: 'rhyme', lines: [
    { text: 'Clap, clap, clap your hands,', action: 'Clap together.' },
    { text: 'tap, tap, tap your knees,', action: 'Tap knees.' },
    { text: 'stamp, stamp, stamp your feet,', action: 'Stamp or wiggle the feet.' },
    { text: 'and now a great big sneeze! Achoo!', action: 'A big pretend sneeze.' },
  ] },
  { id: 'bubbles-in-the-bath', title: 'Bubbles in the Bath', kind: 'rhyme', lines: [
    { text: 'Bubbles, bubbles, one, two, three,', action: 'Point at bubbles, or pretend.' },
    { text: 'floating up for you and me.', action: 'Look up.' },
    { text: 'Pop goes one and pop goes two,', action: 'Pop with a finger.' },
    { text: 'pop goes three, and splash for you!', action: 'A little splash.' },
  ] },
  { id: 'who-says-moo', title: 'Who Says Moo?', kind: 'rhyme', lines: [
    { text: 'Who says moo? The cow says moo!', action: 'Wait before “moo” for your child to try.' },
    { text: 'Who says quack? The duck does too!' },
    { text: 'Who says baa? The sheep on the hill.' },
    { text: 'Who says shh? The baby, still.', action: 'Finger on lips, whisper.' },
  ] },
  { id: 'five-little-steps', title: 'Five Little Steps', kind: 'rhyme', lines: [
    { text: 'One step, two steps, walking slow,', action: 'Walk slowly together, counting.' },
    { text: 'three steps, four steps, off we go,' },
    { text: 'five steps, jump! Now turn around,', action: 'Jump, then turn.' },
    { text: 'sit down softly on the ground.', action: 'Sit down together.' },
  ] },
  { id: 'sleepy-feet', title: 'Sleepy Feet', kind: 'lullaby', lines: [
    { text: 'Sleepy feet and sleepy hands,', action: 'Hold the feet, then the hands.' },
    { text: 'sleepy sheep in sleepy lands.' },
    { text: 'Yawning lion, yawning bear,', action: 'A big slow yawn.' },
    { text: 'yawning baby in the chair.' },
    { text: 'Eyes go down and down they creep,', action: 'Close your eyes slowly.' },
    { text: 'everybody’s fast asleep.' },
  ] },
  { id: 'red-and-blue', title: 'Red and Blue', kind: 'rhyme', lines: [
    { text: 'Red is the apple, crunchy and sweet,', action: 'Point at something red.' },
    { text: 'blue is the sky above the street,', action: 'Point up.' },
    { text: 'yellow the sun that says hello,', action: 'Wave.' },
    { text: 'green is the grass where daisies grow.', action: 'Point at something green.' },
  ] },
  { id: 'round-square-point', title: 'Round, Square, Point', kind: 'rhyme', lines: [
    { text: 'A circle is round just like a ball,', action: 'Draw a circle in the air.' },
    { text: 'a square has four sides, straight and tall,', action: 'Draw a square.' },
    { text: 'a triangle points up to the sky,', action: 'Draw a triangle, pointing up.' },
    { text: 'three little corners, way up high!', action: 'Count three corners.' },
  ] },
];

/** High-contrast cards: simple geometric patterns, black and white (and red from 3 months). */
export const CONTRAST_PATTERNS = ['bullseye', 'stripes', 'checker', 'face', 'zigzag', 'dots', 'triangle', 'star', 'diamond', 'cross', 'circle', 'grid'] as const;
export type ContrastPattern = (typeof CONTRAST_PATTERNS)[number];
export const PATTERN_NAMES: Record<ContrastPattern, string> = {
  bullseye: 'Circles in circles', stripes: 'Stripes', checker: 'Squares', face: 'A face', zigzag: 'Zigzag', dots: 'Dots',
  triangle: 'A triangle', star: 'A star', diamond: 'A diamond', cross: 'A cross', circle: 'A big circle', grid: 'Lines',
};

// ------------------------------------------------------------------------------------------- age and progress

/** Whole months between a birth month ("2026-03") and today; null for no or an impossible date. */
export function monthsOld(birth: string | null, now = new Date()): number | null {
  const m = birth ? /^(\d{4})-(\d{2})$/.exec(birth) : null;
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
  return months >= 0 && months <= 120 ? months : null;
}

/** The stage for an age in months; past three years, null (time for Young readers). */
export function stageFor(months: number): Stage | null {
  return STAGES.find((s) => months >= s.from && months < s.to) ?? null;
}

export const activityMinutes = (s: Stage) => s.activities.reduce((n, a) => n + a.minutes, 0);

/** Where a Young readers activity opens (the page reads these). */
export function activityLink(a: Activity): string | null {
  const base = 'reading-intelligence/young-readers';
  switch (a.kind) {
    case 'words': return `${base}?tab=first&first=words&group=${a.group}`;
    case 'book': return `${base}?tab=first&first=books&book=${a.book}`;
    case 'find': return `${base}?tab=first&first=find`;
    case 'stories': return `${base}?tab=stories&level=1`;
    case 'sounds': return `${base}?tab=sounds`;
    case 'breathe': return `${base}?tab=focus#breathing`;
    default: return null;
  }
}

/** What a child has done, kept on this device for each family profile. */
export interface LittleProgress { birth: string | null; stage: StageId | null; done: Record<string, string[]> }
export const emptyLittle = (): LittleProgress => ({ birth: null, stage: null, done: {} });
export function readLittle(raw: unknown): LittleProgress {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const ids = new Set(STAGES.flatMap((s) => s.activities.map((a) => a.id)));
  const done: Record<string, string[]> = {};
  if (v.done && typeof v.done === 'object') {
    for (const [day, list] of Object.entries(v.done as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(list)) continue;
      const kept = [...new Set(list.filter((x): x is string => typeof x === 'string' && ids.has(x)))];
      if (kept.length) done[day] = kept;
    }
  }
  // Keep the last 60 days.
  const days = Object.keys(done).sort().slice(-60);
  return {
    birth: typeof v.birth === 'string' && monthsOld(v.birth) !== null ? v.birth : null,
    stage: STAGES.some((s) => s.id === v.stage) ? v.stage as StageId : null,
    done: Object.fromEntries(days.map((d) => [d, done[d]!])),
  };
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The last seven days (oldest first), each with whether anything was done. */
export function lastWeek(p: LittleProgress, now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const key = dayKey(d);
    return { day: key, weekday: d.toLocaleDateString(undefined, { weekday: 'narrow' }), done: (p.done[key]?.length ?? 0) > 0 };
  });
}

export function toggleDone(p: LittleProgress, activityId: string, now = new Date()): LittleProgress {
  const key = dayKey(now);
  const today = p.done[key] ?? [];
  const next = today.includes(activityId) ? today.filter((x) => x !== activityId) : [...today, activityId];
  const done = { ...p.done, [key]: next };
  if (!next.length) delete done[key];
  return { ...p, done };
}

// ------------------------------------------------------------------------------------------- other languages

/** The page's own words (buttons, headings, notes); `{n}` and `{name}` are filled in. */
export const LITTLE_UI = {
  intro: 'A reading program for babies and toddlers, from birth to 3 years. A few minutes a day with your voice, rhymes, pictures and, later, short stories. Free, no account needed.',
  birthOf: '{name}’s birth month', birthYours: 'Your child’s birth month', month: 'Month', year: 'Year',
  orPick: 'Or pick a stage below.', overThree: 'Over 3 years: Young readers is the next step.', openYoung: 'Open Young readers',
  monthsOld: '{n} months old', monthOld: '1 month old', now: 'now', stageLabel: 'Stage',
  today: 'Today:', inAll: 'about {n} minutes in all', weekLabel: 'Days with reading this week',
  noScreen: 'no screen', min: 'min', showCards: 'Show the cards', openRhyme: 'Open the rhyme', open: 'Open', doneToday: 'Done today', weDid: 'We did this',
  tips: 'Tips for this stage', notice: 'Things you may notice',
  noticeNote: 'Every child grows at their own pace; this is not a checklist. If you have questions about your child’s development, ask your doctor, nurse or health visitor.',
  screens: 'About screens',
  screensText: 'For babies and toddlers, the best “screen” is your face. Use the cards and pictures here together, for a minute or two at a time, and talk about them. Most of each day’s plan works with no screen at all: rhymes, talking and real books.',
  holdHint: 'Hold 20 to 30 cm from your baby. Talk about the shape. Stop when your baby looks away.', cardOf: '{n} of {total}', nextCard: 'Next card', previousCard: 'Previous card', close: 'Close',
  lullaby: 'Lullaby', rhymeActions: 'Rhyme with actions', sayIt: 'Say or sing it yourself: your voice is what your child loves most. The actions are for you.',
  hearOnce: 'Hear it once', stop: 'Stop', language: 'Language',
};
export type LittleUi = typeof LITTLE_UI;

export interface LittleTranslation {
  ui: LittleUi;
  patterns: Record<ContrastPattern, string>;
  stages: Record<StageId, { name: string; ages: string; headline: string; why: string; minutes: string; tips: string[]; notice: string[]; activities: Record<string, { title: string; how: string }> }>;
  rhymes: Record<string, { title: string; lines: { text: string; action?: string }[] }>;
}

export interface LittleContent { ui: LittleUi; patterns: Record<ContrastPattern, string>; stages: Stage[]; rhymes: Rhyme[] }
export const LITTLE_EN: LittleContent = { ui: LITTLE_UI, patterns: PATTERN_NAMES, stages: STAGES, rhymes: RHYMES };

/** The English program with a translation's words put in; ids, kinds, minutes and links stay the same. */
export function buildLittle(t: LittleTranslation): LittleContent {
  return {
    ui: t.ui, patterns: t.patterns,
    stages: STAGES.map((s) => {
      const x = t.stages[s.id];
      return { ...s, name: x.name, ages: x.ages, headline: x.headline, why: x.why, minutes: x.minutes, tips: x.tips, notice: x.notice,
        activities: s.activities.map((a) => ({ ...a, title: x.activities[a.id]?.title ?? a.title, how: x.activities[a.id]?.how ?? a.how })) };
    }),
    rhymes: RHYMES.map((r) => ({ ...r, title: t.rhymes[r.id]?.title ?? r.title, lines: t.rhymes[r.id]?.lines ?? r.lines })),
  };
}

/** Fills `{n}`, `{total}` and `{name}` in a page string. */
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

const littleLoaders: Record<'fr' | 'es' | 'pt' | 'nl', () => Promise<{ default: LittleTranslation }>> = {
  fr: () => import('./young/little/fr'), es: () => import('./young/little/es'), pt: () => import('./young/little/pt'), nl: () => import('./young/little/nl'),
};
/** The program in a language (English when there is no translation). */
export async function loadLittle(lang: string): Promise<LittleContent> {
  const load = littleLoaders[lang as keyof typeof littleLoaders];
  return load ? buildLittle((await load()).default) : LITTLE_EN;
}
