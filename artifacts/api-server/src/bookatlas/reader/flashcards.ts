import { randomUUID } from 'node:crypto';
import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { readableChapters, type Generate } from './ai.js';
import { ReaderError, getPreferences, saveSettingsKey } from './service.js';

/**
 * Flashcards with spaced repetition (master build plan M8, specification AI-004). A reader keeps a review deck
 * across books; each review is graded Again, Hard, Good or Easy and the card comes back after 1, 3, 7 or 14 days
 * (the specification's simplified model). The deck lives in the reader's settings (no new table: the owner runs
 * migrations), at most 500 cards.
 */
export enum ReviewScore { AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4 }
const DAYS: Record<ReviewScore, number> = { [ReviewScore.AGAIN]: 1, [ReviewScore.HARD]: 3, [ReviewScore.GOOD]: 7, [ReviewScore.EASY]: 14 };
/** The specification's calculateNextReview: days until the card is shown again. */
export const calculateNextReview = (score: ReviewScore) => DAYS[score];

export const FLASHCARDS_KEY = 'flashcards';
export const MAX_CARDS = 500;
export interface Flashcard {
  id: string; bookId: string; chapterIndex: number | null; question: string; answer: string;
  /** The last grade (1 to 4), 0 before the first review: the specification's difficulty. */
  difficulty: number; reviews: number; lapses: number; createdAt: string; due: string; lastReviewedAt: string | null;
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const iso = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
const sameText = (a: string, b: string) => a.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() === b.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** The saved deck, cleaned. */
export function readDeck(raw: unknown): Flashcard[] {
  if (!Array.isArray(raw)) return [];
  const out: Flashcard[] = [];
  for (const v of raw) {
    const c = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const question = clean(c.question, 400), answer = clean(c.answer, 800), createdAt = iso(c.createdAt), due = iso(c.due);
    if (typeof c.id !== 'string' || !/^[\w-]{6,64}$/.test(c.id) || typeof c.bookId !== 'string' || !/^[\w.-]{1,120}$/.test(c.bookId) || !question || !answer || !createdAt || !due) continue;
    const n = (x: unknown, max: number) => (Number.isInteger(x) && (x as number) >= 0 ? Math.min(x as number, max) : 0);
    out.push({
      id: c.id, bookId: c.bookId, chapterIndex: Number.isInteger(c.chapterIndex) && (c.chapterIndex as number) >= 0 ? c.chapterIndex as number : null,
      question, answer, difficulty: n(c.difficulty, 4), reviews: n(c.reviews, 100_000), lapses: n(c.lapses, 100_000), createdAt, due, lastReviewedAt: iso(c.lastReviewedAt),
    });
  }
  return out.slice(-MAX_CARDS);
}

/** New cards join the deck, due now; a card whose question is already in the deck for that book is skipped. */
export function addCards(deck: Flashcard[], bookId: string, chapterIndex: number | null, cards: { question: string; answer: string }[], now = new Date()) {
  const added: Flashcard[] = [];
  for (const c of cards) {
    const question = clean(c.question, 400), answer = clean(c.answer, 800);
    if (!question || !answer) continue;
    if ([...deck, ...added].some((d) => d.bookId === bookId && sameText(d.question, question))) continue;
    added.push({ id: randomUUID(), bookId, chapterIndex, question, answer, difficulty: 0, reviews: 0, lapses: 0, createdAt: now.toISOString(), due: now.toISOString(), lastReviewedAt: null });
  }
  if (deck.length + added.length > MAX_CARDS) throw new ReaderError(`Your review deck is full (${MAX_CARDS} cards). Remove some cards first.`, 409);
  return { deck: [...deck, ...added], added };
}

/** A review: the grade sets the next date (1, 3, 7 or 14 days); Again counts as a lapse. */
export function reviewCard(card: Flashcard, score: ReviewScore, now = new Date()): Flashcard {
  return {
    ...card, difficulty: score, reviews: card.reviews + 1, lapses: card.lapses + (score === ReviewScore.AGAIN ? 1 : 0),
    lastReviewedAt: now.toISOString(), due: new Date(now.getTime() + calculateNextReview(score) * 86_400_000).toISOString(),
  };
}

/** What the review screen needs: due cards first (oldest due first), and counts. */
export function deckView(deck: Flashcard[], now = new Date()) {
  const t = now.toISOString();
  const due = deck.filter((c) => c.due <= t).sort((a, b) => a.due.localeCompare(b.due));
  const reviewed = deck.filter((c) => c.reviews > 0);
  return {
    total: deck.length, dueCount: due.length, newCount: deck.filter((c) => !c.reviews).length,
    // Retention: the share of reviews in the deck's last grades that were not Again.
    retention: reviewed.length ? Math.round((reviewed.filter((c) => c.difficulty > ReviewScore.AGAIN).length / reviewed.length) * 100) : null,
    nextDue: deck.filter((c) => c.due > t).map((c) => c.due).sort()[0] ?? null,
    due, cards: deck,
  };
}

const deckOf = async (userId: string) => readDeck((await getPreferences(userId))?.settings?.[FLASHCARDS_KEY]);

export async function myDeck(userId: string, bookId?: string) {
  const deck = await deckOf(userId);
  return deckView(bookId ? deck.filter((c) => c.bookId === bookId) : deck);
}

export async function saveCards(userId: string, body: Record<string, unknown>) {
  const bookId = typeof body.bookId === 'string' && /^[\w.-]{1,120}$/.test(body.bookId) ? body.bookId : '';
  if (!bookId) throw new ReaderError('Send the book the cards are from.');
  const list = Array.isArray(body.cards) ? body.cards.slice(0, 30) : [];
  const cards = list.map((c) => { const r = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>; return { question: String(r.question ?? r.front ?? ''), answer: String(r.answer ?? r.back ?? '') }; });
  if (!cards.length) throw new ReaderError('Send at least one card.');
  const ci = Number(body.chapterIndex);
  const { deck, added } = addCards(await deckOf(userId), bookId, Number.isInteger(ci) && ci >= 0 ? ci : null, cards);
  if (added.length) await saveSettingsKey(userId, FLASHCARDS_KEY, deck);
  return { added: added.length, skipped: cards.length - added.length, total: deck.length };
}

export async function gradeCard(userId: string, id: string, body: Record<string, unknown>, now = new Date()) {
  const score = Number(body.score);
  if (![1, 2, 3, 4].includes(score)) throw new ReaderError('Grade the card: 1 Again, 2 Hard, 3 Good or 4 Easy.');
  const deck = await deckOf(userId);
  const i = deck.findIndex((c) => c.id === id);
  if (i < 0) throw new ReaderError('Unknown card.', 404);
  deck[i] = reviewCard(deck[i]!, score as ReviewScore, now);
  await saveSettingsKey(userId, FLASHCARDS_KEY, deck);
  return { card: deck[i], nextInDays: calculateNextReview(score as ReviewScore) };
}

export async function removeCard(userId: string, id: string) {
  const deck = await deckOf(userId);
  const next = deck.filter((c) => c.id !== id);
  if (next.length === deck.length) throw new ReaderError('Unknown card.', 404);
  await saveSettingsKey(userId, FLASHCARDS_KEY, next);
  return { removed: true, total: next.length };
}

/** The specification's FlashcardGenerator for a selected passage: two to four cards on what matters, not trivia. */
export async function flashcardsFromPassage(generate: Generate, book: Book, who: Identity, body: Record<string, unknown>) {
  const text = clean(body.text, 3000);
  if (text.length < 20) throw new ReaderError('Select a sentence or more to make flashcards.');
  const { chapters } = await readableChapters(book, who);
  const probe = text.slice(0, 80).toLowerCase();
  const found = chapters.findIndex((c) => c.content.some((p) => p.replace(/\s+/g, ' ').toLowerCase().includes(probe)));
  if (found < 0) throw new ReaderError('Select text from the book you are reading.', 400);
  const raw = await generate({
    jsonMode: true, temperature: 0.2,
    systemInstruction: `You make educational flashcards for a reader of "${book.title}" by ${book.author}. Use only the passage. Write in the language of the passage. Question on the front, answer on the back; keep the concepts; avoid trivial facts; focus on what is worth remembering. Reply with JSON only: {"cards": [{"question": "...", "answer": "1 to 2 sentences"}]} with 2 to 4 cards.`,
    messages: [{ role: 'user', text: `"""${text.replace(/"""/g, '"')}"""` }],
  });
  let parsed: unknown;
  try { const m = (raw ?? '').match(/\{[\s\S]*\}/); parsed = JSON.parse(m ? m[0] : raw ?? ''); } catch { throw new ReaderError('The AI assistant returned unreadable flashcards. Please try again.', 502); }
  const list = parsed && typeof parsed === 'object' && Array.isArray((parsed as { cards?: unknown }).cards) ? (parsed as { cards: unknown[] }).cards : [];
  const cards = list.map((c) => { const r = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>; return { question: clean(r.question, 400), answer: clean(r.answer, 800) }; }).filter((c) => c.question && c.answer).slice(0, 4);
  if (!cards.length) throw new ReaderError('The AI assistant could not make flashcards from this passage. Please try again.', 502);
  return { chapterIndex: found, cards };
}
