import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPlaces, listenFrom, partForParagraph, recentBooks, resumeSecond, startPlace, withPlace } from './resumePlace';

test('resume: places are kept per book, cleaned, at most 300 books', () => {
  let all = withPlace({}, 'book-a', { chapter: 3, paragraph: 12, audio: { n: 7, t: 41.5 } }, new Date('2026-11-26T10:00:00Z'));
  all = withPlace(all, 'book-b', { chapter: 0, paragraph: 4 }, new Date('2026-11-26T11:00:00Z'));
  assert.deepEqual(all['book-a'], { chapter: 3, paragraph: 12, audio: { n: 7, t: 41.5 }, at: '2026-11-26T10:00:00.000Z' });
  assert.deepEqual(Object.keys(cleanPlaces({ ...all, '../x': { chapter: 1, paragraph: 1, at: 'x' }, bad: { chapter: -1, paragraph: 0, at: 'x' } })), ['book-a', 'book-b']);
  let many = {};
  for (let i = 0; i < 320; i += 1) many = withPlace(many, `b${i}`, { chapter: 0, paragraph: i }, new Date(Date.UTC(2026, 0, 1, 0, i)));
  assert.equal(Object.keys(many).length, 300);
  assert.ok(!('b0' in many) && 'b319' in many, 'the oldest go first');
});

test('resume: where to start, and where to resume listening', () => {
  const saved = { chapter: 2, paragraph: 9, at: 'x', audio: { n: 5, t: 30 } };
  assert.deepEqual(startPlace({ chapter: 0, paragraph: 0 }, saved, 10), { chapter: 2, paragraph: 9 }, 'a new or guest open uses this device');
  assert.deepEqual(startPlace({ chapter: 4, paragraph: 1 }, saved, 10), { chapter: 4, paragraph: 1 }, 'the account/library place wins');
  assert.deepEqual(startPlace({ chapter: 0, paragraph: 0 }, { ...saved, chapter: 12 }, 5), { chapter: 4, paragraph: 0 }, 'kept inside the book');
  assert.deepEqual(startPlace({ chapter: 0, paragraph: 0 }, null, 5), { chapter: 0, paragraph: 0 });
  const segs = [{ chapter: 0, from: 0, to: 5 }, { chapter: 1, from: 0, to: 4 }, { chapter: 1, from: 5, to: 11 }, { chapter: 2, from: 0, to: 8 }];
  assert.equal(partForParagraph(segs, 1, 7), 2, 'the part that reads the paragraph');
  assert.equal(partForParagraph(segs, 1, 0), 1);
  assert.equal(partForParagraph(segs, 3, 0), -1, 'no narration there');
  assert.equal(resumeSecond(saved, 5, 9, 12), 28, 'the saved second, with a little run-up');
  assert.equal(resumeSecond(saved, 5, 10, 12), 11.7, 'read on since: the paragraph start');
  assert.equal(resumeSecond(null, 5, 9, null), 0);
});

test('resume: listening picks up at the paragraph last spoken while the reader is on its page', () => {
  const saved = { chapter: 2, paragraph: 8, at: 'x', audio: { n: 5, t: 30, p: 11 } };
  assert.equal(listenFrom(saved, 2, 8), 11, 'spoken lower on the same page');
  assert.equal(listenFrom(saved, 2, 12), 12, 'paged past it');
  assert.equal(listenFrom(saved, 2, 0), 0, 'went far back');
  assert.equal(listenFrom(saved, 3, 0), 0, 'another chapter');
  assert.equal(listenFrom({ ...saved, audio: { n: 5, t: 30 } }, 2, 8), 8);
  assert.equal(resumeSecond(saved, 5, 11, 4), 28);
  assert.deepEqual(cleanPlaces({ b: saved }).b?.audio, { n: 5, t: 30, p: 11 });
});

test('resume: the Continue row lists started, unfinished books, newest first, with safe covers', () => {
  const book = (title: string, pct: number, cover = 'https://cdn.example/c.jpg') => ({ title, author: 'A. Writer', cover, pct });
  let all = withPlace({}, 'new', { chapter: 0, paragraph: 0, book: book('Not started', 0) }, new Date('2026-11-27T08:00:00Z'));
  all = withPlace(all, 'old', { chapter: 2, paragraph: 3, book: book('Older', 40) }, new Date('2026-11-27T09:00:00Z'));
  all = withPlace(all, 'done', { chapter: 9, paragraph: 50, book: book('Finished', 100) }, new Date('2026-11-27T10:00:00Z'));
  all = withPlace(all, 'heard', { chapter: 0, paragraph: 0, audio: { n: 1, t: 20 }, book: book('Listened', 3, 'data:image/png;base64,AAAA') }, new Date('2026-11-27T11:00:00Z'));
  all = withPlace(all, 'bare', { chapter: 1, paragraph: 1 }, new Date('2026-11-27T12:00:00Z'));
  const clean = cleanPlaces(JSON.parse(JSON.stringify(all)));
  const row = recentBooks(clean);
  assert.deepEqual(row.map((b) => b.id), ['heard', 'old']);
  assert.equal(row[0]!.cover, '', 'inline covers are not kept');
  assert.equal(row[0]!.listening, true);
  assert.equal(row[1]!.cover, 'https://cdn.example/c.jpg');
  assert.equal(cleanPlaces({ x: { chapter: 1, paragraph: 1, at: 't', book: { title: '', pct: 5 } } }).x!.book, undefined, 'a book needs a title');
});
