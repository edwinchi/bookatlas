import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_READERS, bookInsights } from './authorInsights.js';
import { accessFor } from '../../auth/policy.js';

const now = new Date('2026-11-26T12:00:00Z');
const prog = (user: string, chapter: number, percent: number) => ({ user_id: user, chapter_index: chapter, progress_percent: percent, updated_at: now.toISOString() });
const sess = (user: string, day: string, seconds: number, words: number) => ({ user_id: user, started_at: `${day}T10:00:00Z`, seconds, words });
const hl = (user: string, ch: number, p: number, excerpt = 'A line readers love.') => ({ user_id: user, kind: 'highlight' as const, chapter_index: ch, paragraph_index: p, excerpt, hidden: false });

test('author insights: nothing before 5 readers, and the author’s own reading never counts', () => {
  const few = bookInsights({ progress: [prog('a', 1, 20), prog('b', 2, 40), prog('c', 0, 5), prog('d', 3, 70)], sessions: [], highlights: [] }, ['One', 'Two', 'Three', 'Four'], 'author');
  assert.deepEqual(few, { readers: 4, enoughReaders: false });
  const withAuthor = bookInsights({ progress: [prog('a', 1, 20), prog('b', 2, 40), prog('c', 0, 5), prog('d', 3, 70), prog('author', 3, 100)], sessions: [], highlights: [] }, [], 'author');
  assert.equal(withAuthor.enoughReaders, false, 'the author is not a fifth reader');
  assert.equal(MIN_READERS, 5);
});

test('author insights: completion, where readers stop, time and the most highlighted passages', () => {
  const r = bookInsights({
    progress: [prog('a', 0, 5), prog('b', 1, 30), prog('c', 1, 35), prog('d', 3, 100), prog('e', 3, 99), prog('f', 2, 60)],
    sessions: [sess('a', '2026-11-25', 600, 2500), sess('b', '2026-11-26', 1200, 5000), sess('d', '2026-10-01', 1800, 7000), sess('author', '2026-11-26', 9999, 99)],
    highlights: [hl('a', 1, 4), hl('b', 1, 4), hl('c', 1, 4, 'A line readers love, longer.'), hl('d', 2, 0), hl('e', 2, 0), hl('author', 2, 0), hl('f', 3, 1)],
  }, ['Opening', 'The river', 'The flood', 'After'], 'author', now);
  assert.equal(r.readers, 6);
  assert.deepEqual([r.finished, r.completionRate, r.medianProgress], [2, 33, 48]);
  assert.deepEqual(r.chapters!.map((c) => c.reached), [100, 83, 50, 33]);
  assert.deepEqual(r.chapters!.map((c) => c.stoppedHere), [1, 2, 1, 0]);
  assert.deepEqual(r.biggestDrop, { index: 2, title: 'The flood', drop: 33 });
  assert.deepEqual([r.minutesRead, r.minutesPerReader, r.wordsPerMinute], [60, 10, 242]);
  assert.equal(r.activeLast30, 2);
  assert.equal(r.daily!.length, 30);
  assert.equal(r.daily!.at(-1)!.readers, 1);
  // Only the passage that 3 different readers highlighted; the author's highlight does not make the second one count.
  assert.deepEqual(r.passages, [{ chapterIndex: 1, paragraphIndex: 4, excerpt: 'A line readers love, longer.', readers: 3 }]);
});

test('author insights: only for signed-in authors', () => {
  assert.equal(accessFor('GET', '/api/author/insights'), 'reader');
  assert.equal(accessFor('POST', '/api/author/insights'), 'admin');
});
