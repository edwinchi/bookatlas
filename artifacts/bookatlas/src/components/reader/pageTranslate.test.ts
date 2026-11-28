import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchParagraphs, firstLanguage, joinBatch, splitTranslation } from './pageTranslate';

test('read in your language: a page goes in as few requests as fit, and comes back paragraph by paragraph', () => {
  const page = [{ i: 4, text: 'One.' }, { i: 5, text: '  ' }, { i: 6, text: 'x'.repeat(1000) }, { i: 7, text: 'y'.repeat(1000) }, { i: 8, text: 'Two.' }];
  const batches = batchParagraphs(page);
  assert.deepEqual(batches.map((b) => b.map((p) => p.i)), [[4, 6], [7, 8]], 'empty paragraphs skipped, each request under the limit');
  for (const b of batches) assert.ok(joinBatch(b).length <= 1900);
  assert.equal(batchParagraphs([{ i: 0, text: 'z'.repeat(5000) }])[0]![0]!.text.length, 1900, 'one long paragraph is cut to fit');

  assert.deepEqual(splitTranslation('Un.\n\nDeux.', [{ i: 4 }, { i: 8 }]), { 4: 'Un.', 8: 'Deux.' });
  assert.deepEqual(splitTranslation('Un. Deux.', [{ i: 4 }, { i: 8 }]), { 4: 'Un. Deux.', 8: '' }, 'a merged answer is still shown, once');
});

test('read in your language: the first language offered', () => {
  const known = { en: 'English', fr: 'French', nl: 'Dutch' };
  assert.equal(firstLanguage('nl', 'fr-FR', 'en', known), 'nl', 'the reader\'s last choice');
  assert.equal(firstLanguage(null, 'fr-FR', 'en', known), 'fr', 'the device language');
  assert.equal(firstLanguage(null, 'en-GB', 'en', known), 'fr', 'never the book\'s own language');
  assert.equal(firstLanguage('xx', 'de-DE', 'nl', known), 'en');
});
