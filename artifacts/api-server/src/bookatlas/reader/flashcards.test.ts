import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_CARDS, ReviewScore, addCards, calculateNextReview, deckView, gradeCard, myDeck, readDeck, removeCard, reviewCard, saveCards } from './flashcards.js';
import { accessFor } from '../../auth/policy.js';

test('flashcards: the specification review intervals (Again 1, Hard 3, Good 7, Easy 14 days)', () => {
  assert.deepEqual([ReviewScore.AGAIN, ReviewScore.HARD, ReviewScore.GOOD, ReviewScore.EASY].map(calculateNextReview), [1, 3, 7, 14]);
  const now = new Date('2026-11-26T10:00:00Z');
  const { added } = addCards([], 'book-a', 2, [{ question: 'What is the central argument?', answer: 'That order comes first.' }], now);
  const card = added[0]!;
  assert.equal(card.due, now.toISOString(), 'a new card is due at once');
  const good = reviewCard(card, ReviewScore.GOOD, now);
  assert.equal(good.due, '2026-12-03T10:00:00.000Z');
  assert.deepEqual([good.difficulty, good.reviews, good.lapses], [3, 1, 0]);
  const again = reviewCard(good, ReviewScore.AGAIN, now);
  assert.equal(again.due, '2026-11-27T10:00:00.000Z');
  assert.equal(again.lapses, 1);
});

test('flashcards: no duplicates per book, a full deck refuses more, saved decks are cleaned', () => {
  const now = new Date('2026-11-26T10:00:00Z');
  const first = addCards([], 'book-a', 0, [{ question: 'What is pi?', answer: 'About 3.14.' }, { question: 'what is PI', answer: 'Same question.' }, { question: '', answer: 'x' }], now);
  assert.equal(first.added.length, 1);
  assert.equal(addCards(first.deck, 'book-b', 0, [{ question: 'What is pi?', answer: 'Another book may ask it.' }], now).added.length, 1);
  const full = Array.from({ length: MAX_CARDS }, (_, i) => ({ ...first.deck[0]!, id: `card-${String(i).padStart(4, '0')}`, question: `Q${i}` }));
  assert.throws(() => addCards(full, 'book-a', 0, [{ question: 'One more?', answer: 'No.' }]), /deck is full/);
  const read = readDeck([first.deck[0], { id: 'x', bookId: 'b', question: 'Q', answer: 'A', createdAt: 'bad', due: 'bad' }, null, 'text']);
  assert.equal(read.length, 1);
});

test('flashcards: the review view puts due cards first and counts retention', () => {
  const now = new Date('2026-11-26T10:00:00Z');
  const { deck } = addCards([], 'book-a', 0, [{ question: 'Q1', answer: 'A1' }, { question: 'Q2', answer: 'A2' }, { question: 'Q3', answer: 'A3' }], new Date('2026-11-20T10:00:00Z'));
  deck[1] = reviewCard(deck[1]!, ReviewScore.EASY, new Date('2026-11-25T10:00:00Z'));
  deck[2] = reviewCard(deck[2]!, ReviewScore.AGAIN, new Date('2026-11-24T10:00:00Z'));
  const v = deckView(deck, now);
  assert.equal(v.total, 3);
  assert.deepEqual(v.due.map((c) => c.question), ['Q1', 'Q3']);
  assert.equal(v.newCount, 1);
  assert.equal(v.retention, 50);
  assert.equal(v.nextDue, '2026-12-09T10:00:00.000Z');
});

test('flashcards: saved for the reader, graded and removed', async () => {
  const user = 'user_flashcards';
  const saved = await saveCards(user, { bookId: 'book-a', chapterIndex: 1, cards: [{ front: 'Who wrote it?', back: 'Ada.' }, { question: 'Why?', answer: 'Because.' }] });
  assert.deepEqual(saved, { added: 2, skipped: 0, total: 2 });
  assert.equal((await saveCards(user, { bookId: 'book-a', cards: [{ question: 'Who wrote it?', answer: 'Ada again.' }] })).skipped, 1);
  const mine = await myDeck(user);
  assert.equal(mine.dueCount, 2);
  const graded = await gradeCard(user, mine.due[0]!.id, { score: 4 });
  assert.equal(graded.nextInDays, 14);
  assert.equal((await myDeck(user)).dueCount, 1);
  await assert.rejects(gradeCard(user, mine.due[0]!.id, { score: 9 }), /Grade the card/);
  await removeCard(user, mine.due[1]!.id);
  assert.equal((await myDeck(user)).total, 1);
  assert.equal((await myDeck(user, 'book-other')).total, 0, 'filtered by book');
  await assert.rejects(saveCards(user, { bookId: '../x', cards: [{ question: 'a', answer: 'b' }] }), /Send the book/);
});

test('flashcards: only signed-in readers', () => {
  assert.equal(accessFor('GET', '/api/reader/flashcards'), 'reader');
  assert.equal(accessFor('POST', '/api/reader/flashcards'), 'reader');
  assert.equal(accessFor('POST', '/api/reader/flashcards/0f8b8f5e-1111-4222-8333-944455556666/review'), 'reader');
  assert.equal(accessFor('DELETE', '/api/reader/flashcards/0f8b8f5e-1111-4222-8333-944455556666'), 'reader');
  assert.equal(accessFor('POST', '/api/reader/ai/flashcards'), 'reader');
  assert.equal(accessFor('PUT', '/api/reader/flashcards'), 'admin');
});
