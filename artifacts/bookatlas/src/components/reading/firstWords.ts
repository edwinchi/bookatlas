import { shuffle, type PictureWord } from './youngReaders';

/**
 * First words (Reading Intelligence phase 3, owner request 2026-11-25), for the youngest readers (about 0–4):
 * picture words in six groups, little picture books read aloud, and a game to find the picture that was said.
 * All texts were written for BooksAtlas.
 */

export interface WordGroup { id: string; name: string; icon: string; words: PictureWord[] }
export const FIRST_WORDS: WordGroup[] = [
  { id: 'animals', name: 'Animals', icon: '🐾', words: [
    { word: 'dog', picture: '🐶' }, { word: 'cat', picture: '🐱' }, { word: 'cow', picture: '🐮' }, { word: 'duck', picture: '🦆' },
    { word: 'lion', picture: '🦁' }, { word: 'fish', picture: '🐟' }, { word: 'bird', picture: '🐦' }, { word: 'elephant', picture: '🐘' },
  ] },
  { id: 'colours', name: 'Colours', icon: '🎨', words: [
    { word: 'red', picture: '🟥' }, { word: 'blue', picture: '🟦' }, { word: 'yellow', picture: '🟨' }, { word: 'green', picture: '🟩' },
    { word: 'orange', picture: '🟧' }, { word: 'purple', picture: '🟪' }, { word: 'brown', picture: '🟫' }, { word: 'black', picture: '⬛' },
  ] },
  { id: 'food', name: 'Food', icon: '🍎', words: [
    { word: 'apple', picture: '🍎' }, { word: 'banana', picture: '🍌' }, { word: 'bread', picture: '🍞' }, { word: 'milk', picture: '🥛' },
    { word: 'egg', picture: '🥚' }, { word: 'rice', picture: '🍚' }, { word: 'carrot', picture: '🥕' }, { word: 'orange', picture: '🍊' },
  ] },
  { id: 'family', name: 'Family', icon: '👪', words: [
    { word: 'mum', picture: '👩' }, { word: 'dad', picture: '👨' }, { word: 'baby', picture: '👶' }, { word: 'grandma', picture: '👵' },
    { word: 'grandpa', picture: '👴' }, { word: 'sister', picture: '👧' }, { word: 'brother', picture: '👦' }, { word: 'family', picture: '👪' },
  ] },
  { id: 'nature', name: 'Nature', icon: '🌳', words: [
    { word: 'sun', picture: '☀️' }, { word: 'moon', picture: '🌙' }, { word: 'star', picture: '⭐' }, { word: 'tree', picture: '🌳' },
    { word: 'flower', picture: '🌸' }, { word: 'rain', picture: '🌧️' }, { word: 'sea', picture: '🌊' }, { word: 'mountain', picture: '⛰️' },
  ] },
  { id: 'vehicles', name: 'Vehicles', icon: '🚗', words: [
    { word: 'car', picture: '🚗' }, { word: 'bus', picture: '🚌' }, { word: 'train', picture: '🚆' }, { word: 'boat', picture: '⛵' },
    { word: 'plane', picture: '✈️' }, { word: 'bike', picture: '🚲' }, { word: 'tractor', picture: '🚜' }, { word: 'rocket', picture: '🚀' },
  ] },
  // Shapes (owner request 2026-11-26): each shape drawn as its geometry symbol.
  { id: 'shapes', name: 'Shapes', icon: '🔷', words: [
    { word: 'circle', picture: '●' }, { word: 'square', picture: '■' }, { word: 'triangle', picture: '▲' }, { word: 'rectangle', picture: '▬' },
    { word: 'oval', picture: '⬬' }, { word: 'diamond', picture: '◆' }, { word: 'star', picture: '★' }, { word: 'heart', picture: '♥' },
    { word: 'pentagon', picture: '⬟' }, { word: 'hexagon', picture: '⬢' }, { word: 'octagon', picture: '⯃' }, { word: 'cross', picture: '✚' },
  ] },
];
export const ALL_FIRST_WORDS = FIRST_WORDS.flatMap((g) => g.words.map((w) => ({ ...w, group: g.id })));
export const wordKey = (group: string, word: string) => `${group}:${word}`;

export interface PicturePage { picture: string; text: string }
export interface PictureBook { id: string; title: string; cover: string; pages: PicturePage[] }
export const PICTURE_BOOKS: PictureBook[] = [
  { id: 'good-night', title: 'Good Night, Moon and Stars', cover: '🌙', pages: [
    { picture: '☀️', text: 'The sun goes down.' },
    { picture: '🌙', text: 'Hello, moon!' },
    { picture: '⭐', text: 'One little star. Two little stars.' },
    { picture: '🦉', text: 'The owl says hoo, hoo.' },
    { picture: '🛏️', text: 'Into bed we go.' },
    { picture: '😴', text: 'Good night!' },
  ] },
  { id: 'at-the-farm', title: 'At the Farm', cover: '🚜', pages: [
    { picture: '🐮', text: 'The cow says moo.' },
    { picture: '🐷', text: 'The pig says oink.' },
    { picture: '🐔', text: 'The hen says cluck.' },
    { picture: '🐑', text: 'The sheep says baa.' },
    { picture: '🚜', text: 'The tractor goes brrm!' },
    { picture: '👋', text: 'Bye-bye, farm!' },
  ] },
  { id: 'colours-everywhere', title: 'Colours Everywhere', cover: '🌈', pages: [
    { picture: '🍎', text: 'A red apple.' },
    { picture: '🍌', text: 'A yellow banana.' },
    { picture: '🐸', text: 'A green frog.' },
    { picture: '🐳', text: 'A blue whale.' },
    { picture: '🍇', text: 'Purple grapes.' },
    { picture: '🌈', text: 'All the colours together!' },
  ] },
  { id: 'shapes-around', title: 'Shapes All Around', cover: '🔷', pages: [
    { picture: '●', text: 'A ball is a circle.' },
    { picture: '■', text: 'A window is a square.' },
    { picture: '▲', text: 'A slice of pizza is a triangle.' },
    { picture: '▬', text: 'A door is a rectangle.' },
    { picture: '◆', text: 'A kite is a diamond.' },
    { picture: '★', text: 'Shapes are everywhere!' },
  ] },
];

/**
 * A round of "Find it": the word said, and four pictures to choose from. In a group, or from all words (the other
 * pictures then come from other groups, which is easier for the very young).
 */
export function findRound(round: number, group: string | null, groups: WordGroup[] = FIRST_WORDS) {
  const pool = group ? groups.find((g) => g.id === group)?.words ?? [] : groups.flatMap((g) => g.words);
  const order = shuffle(pool, 101 + (group ? group.length : 0));
  const target = order[round % order.length]!;
  const others = shuffle(pool.filter((w) => w.word !== target.word && w.picture !== target.picture), round * 7 + 3).slice(0, 3);
  return { target, choices: shuffle([target, ...others], round * 13 + 5) };
}

/** What the youngest reader has done on this device: words heard, rounds found, listening time. */
export interface FirstWordsProgress { heard: string[]; found: number; tries: number; listenSeconds: number }
export const emptyFirstProgress = (): FirstWordsProgress => ({ heard: [], found: 0, tries: 0, listenSeconds: 0 });
export function readFirstProgress(raw: unknown): FirstWordsProgress {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<FirstWordsProgress>;
  const keys = new Set(FIRST_WORDS.flatMap((g) => g.words.map((w) => wordKey(g.id, w.word))));
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  const found = n(v.found), tries = Math.max(n(v.tries), found);
  return { heard: Array.isArray(v.heard) ? [...new Set(v.heard.filter((k): k is string => typeof k === 'string' && keys.has(k)))] : [], found, tries, listenSeconds: n(v.listenSeconds) };
}
export const recognition = (p: FirstWordsProgress) => (p.tries ? Math.round((p.found / p.tries) * 100) : null);
