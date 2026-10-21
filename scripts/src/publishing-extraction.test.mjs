import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSource } from '../../artifacts/api-server/src/bookatlas/publishing/extraction.ts';

const document = { fileName: 'synthetic.pdf', mimeType: 'application/pdf',
  bytes: Buffer.from('synthetic-test-bytes'), sha256: 'synthetic-hash', pageCount: 2 };
const fake = pages => ({ json: async () => ({ pages }) });

test('plain transcripts are preserved without requesting OCR', async () => {
  const source = { ...document, text: 'Complete source\n\nNo truncated endings.' };
  const result = await extractSource({ json: async () => { throw new Error('Unexpected provider call'); } }, source);
  assert.equal(result.text, source.text);
});
test('ordered document pages and explicitly blank pages preserve source coverage', async () => {
  const result = await extractSource(fake([
    { number: 1, text: 'Full first page.', readability: 'text' },
    { number: 2, text: '', readability: 'blank' },
  ]), document);
  assert.equal(result.pages.length, 2);
  assert.equal(result.text.trim(), 'Full first page.');
});
test('missing, duplicated or out-of-order page extraction is rejected', async () => {
  for (const numbers of [[1], [1, 1], [2, 1]]) {
    await assert.rejects(extractSource(fake(numbers.map(number => ({
      number, text: 'Synthetic page.', readability: 'text',
    }))), document), /every page/);
  }
});
test('unreadable or empty claimed-text pages fail instead of silently losing content', async () => {
  for (const page of [
    { number: 2, text: '', readability: 'unreadable' },
    { number: 2, text: '', readability: 'text' },
  ]) {
    await assert.rejects(extractSource(fake([
      { number: 1, text: 'Readable first page.', readability: 'text' }, page,
    ]), document), /could not be read/);
  }
});
