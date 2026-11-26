import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, picturesOf, queuePending, textBytes, type Pending } from './offlineBooks';

test('offline books: pictures, size and the queue', () => {
  const chapters = [
    { title: 'One', content: ['abc', 'de'], figures: [{ src: 'img-0001.jpg', alt: '', after: 0 }] },
    { title: 'Two', content: ['f'], figures: [{ src: 'img-0001.jpg', alt: '', after: 0 }, { src: 'img-0002.png', alt: '', after: 0 }] },
  ] as never;
  assert.deepEqual(picturesOf(chapters), ['img-0001.jpg', 'img-0002.png']);
  assert.equal(textBytes(chapters), (3 + 5 + 3 + 1) * 2);
  assert.equal(formatBytes(900), '900 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(3.5 * 1024 * 1024), '3.5 MB');

  const p = (bookId: string, chapter: number): Pending => ({ kind: 'progress', bookId, body: { chapterIndex: chapter }, at: '2026-11-26T10:00:00Z' });
  const s = (bookId: string, seconds: number): Pending => ({ kind: 'session', bookId, body: { seconds }, at: '2026-11-26T10:00:00Z' });
  let q: Pending[] = [];
  q = queuePending(q, p('a', 1));
  q = queuePending(q, s('a', 60));
  q = queuePending(q, p('a', 4));
  q = queuePending(q, p('b', 2));
  q = queuePending(q, s('a', 120));
  assert.deepEqual(q.map((x) => `${x.kind}:${x.bookId}`), ['session:a', 'progress:a', 'progress:b', 'session:a'], 'one position per book, every session');
  assert.equal((q[1]!.body as { chapterIndex: number }).chapterIndex, 4, 'the latest position');
  let big: Pending[] = [];
  for (let i = 0; i < 250; i += 1) big = queuePending(big, s('a', i));
  assert.equal(big.length, 200);
});
