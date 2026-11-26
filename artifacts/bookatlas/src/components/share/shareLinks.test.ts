import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS, bookShareUrl, channelUrl, quoteForCopy, quoteText, shareMessage, wrapLines } from './shareLinks';

const book = { id: 'atlas-ebook-1234abcd', title: 'The Nile & Us', author: 'Ada Writer' };

test('share: book links, messages and every channel', () => {
  assert.equal(bookShareUrl(book.id), 'https://booksatlas.app/books/atlas-ebook-1234abcd?via=share');
  assert.equal(bookShareUrl(book.id, 'quote'), 'https://booksatlas.app/books/atlas-ebook-1234abcd?via=quote');
  assert.match(shareMessage(book, 'reading'), /I’m reading “The Nile & Us” by Ada Writer/);
  assert.match(shareMessage(book, 'author'), /My book “The Nile & Us”/);
  const url = bookShareUrl(book.id);
  const text = shareMessage(book, 'reading');
  for (const c of CHANNELS) {
    const link = channelUrl(c.id, text, url);
    assert.ok(link.includes(encodeURIComponent(url)) || c.id === 'whatsapp' || c.id === 'email', c.id);
    assert.ok(!link.includes(' '), `${c.id}: no raw spaces`);
  }
  assert.equal(channelUrl('whatsapp', 'Hi & bye', url), `https://wa.me/?text=${encodeURIComponent(`Hi & bye ${url}`)}`);
  assert.ok(channelUrl('email', 'Hi', url).startsWith('mailto:?subject='));
});

test('share: quotes are trimmed at a word, cleaned and credited', () => {
  assert.equal(quoteText('  “The river   rose.”  '), 'The river rose.');
  const long = 'word '.repeat(100);
  const q = quoteText(long, 50);
  assert.ok(q.length <= 50 && q.endsWith('…') && !q.includes('wor…'));
  assert.equal(quoteForCopy('"A line."', book, 'https://x'), '“A line.”\n— The Nile & Us, Ada Writer\nhttps://x');
});

test('share: quote lines wrap to the card width', () => {
  const measure = (s: string) => s.length * 10;
  assert.deepEqual(wrapLines('one two three four five', 100, measure), ['one two', 'three four', 'five']);
  assert.deepEqual(wrapLines('unbreakablewordthatislong', 50, measure), ['unbreakablewordthatislong'], 'a long word stays whole');
});
