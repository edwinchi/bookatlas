/**
 * "Try it now" (owner request 2026-11-26): a link like /?try=map opens a free book in the reader with that tool
 * already open and a one-line tip on what to do, so readers learn where each tool lives by using it.
 */
export const TRY_TOOLS = ['ask', 'summary', 'concepts', 'flashcards', 'quiz', 'map', 'checkpoint', 'explain', 'define', 'translate', 'read-translated', 'aids', 'text', 'listen', 'fast-read'] as const;
export type TryTool = (typeof TRY_TOOLS)[number];
export const parseTryTool = (v: string | null): TryTool | null => (TRY_TOOLS as readonly string[]).includes(v ?? '') ? v as TryTool : null;

/** Where the tool opens: the coach's tabs, the settings, the player or Fast Read. */
export type TryTarget =
  | { kind: 'coach'; tab: 'ask' | 'study' | 'words'; study?: 'summary' | 'key_concepts' | 'flashcards' | 'quiz' | 'map' }
  | { kind: 'settings'; tab: 'text' | 'aids' }
  | { kind: 'listen' } | { kind: 'fast-read' } | { kind: 'translate-page' };

export const TRY_TARGET: Record<TryTool, TryTarget> = {
  ask: { kind: 'coach', tab: 'ask' },
  summary: { kind: 'coach', tab: 'study', study: 'summary' },
  concepts: { kind: 'coach', tab: 'study', study: 'key_concepts' },
  flashcards: { kind: 'coach', tab: 'study', study: 'flashcards' },
  quiz: { kind: 'coach', tab: 'study', study: 'quiz' },
  map: { kind: 'coach', tab: 'study', study: 'map' },
  checkpoint: { kind: 'coach', tab: 'study' },
  explain: { kind: 'coach', tab: 'words' },
  define: { kind: 'coach', tab: 'words' },
  translate: { kind: 'coach', tab: 'words' },
  'read-translated': { kind: 'translate-page' },
  aids: { kind: 'settings', tab: 'aids' },
  text: { kind: 'settings', tab: 'text' },
  listen: { kind: 'listen' },
  'fast-read': { kind: 'fast-read' },
};

/** The tip shown in the reader when it opens this way. */
export const TRY_HINT: Record<TryTool, string> = {
  ask: 'Type a question about the book; the answer links to the passages it used. Next time, open the coach with the cap icon at the top.',
  summary: 'Pick a chapter and a length, then Make. Next time: cap icon › Study › Summary.',
  concepts: 'Pick a chapter and choose Make key concepts. Next time: cap icon › Study › Key concepts.',
  flashcards: 'Make flashcards for a chapter, then Save to my review deck. Next time: cap icon › Study › Flashcards.',
  quiz: 'Make a quiz for a chapter and test yourself. Next time: cap icon › Study › Quiz.',
  map: 'Make the knowledge map, then tap an idea to see its links. Next time: cap icon › Study › Map.',
  checkpoint: 'Tap Check my understanding for four quick questions. Checkpoints also come by themselves at the end of a chapter.',
  explain: 'Select a sentence in the book, then tap Explain in the bar that appears; choose a child, student, professional or expert.',
  define: 'Select a word in the book, then tap Define. It is also saved under My words.',
  translate: 'Select a passage in the book, then tap Translate and choose a language.',
  'read-translated': 'Choose your language at the top of the panel; it follows the page as you read. Next time: the language icon at the top (on a phone, the ⋮ menu).',
  aids: 'Turn on what helps: bold word starts, focus modes, zen, the reading guide and checkpoints. Next time: the T button at the top › Aids.',
  text: 'Choose the font, size and spacing; the dyslexia-friendly and clear fonts are here. Next time: the T button at the top › Text.',
  listen: 'The book is read aloud with each word lit up. Next time: the headphones button at the top.',
  'fast-read': 'Press play: words appear one at a time at your speed. Next time: the lightning button at the top.',
};
