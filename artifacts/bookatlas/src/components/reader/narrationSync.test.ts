import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAUSE_CHUNK, PAUSE_PARAGRAPH, narrationTimeline, narratorChunks, wordAt } from './narrationSync';

test('narration sync: chunks follow the narrator (sentences grouped up to 350 characters)', () => {
  assert.deepEqual(narratorChunks('One. Two? Three!'), ['One. Two? Three!']);
  const long = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} is here.`).join(' ');
  assert.ok(narratorChunks(long).length >= 2);
  assert.ok(narratorChunks(long).every((c) => c.length <= 350));
});

test('narration sync: every printed word gets a moment, in order, inside the audio', () => {
  const paras = [{ p: 3, text: 'The cat sat. It was warm.' }, { p: 4, text: 'Then it slept.' }];
  const tl = narrationTimeline(paras, 'Chapter One', 10);
  assert.deepEqual(tl.map((w) => paras.find((x) => x.p === w.p)!.text.slice(w.w0, w.w1)), ['The', 'cat', 'sat.', 'It', 'was', 'warm.', 'Then', 'it', 'slept.']);
  for (let i = 1; i < tl.length; i += 1) assert.ok(tl[i]!.t0 >= tl[i - 1]!.t1 - 1e-9);
  assert.ok(tl[0]!.t0 > 0, 'the chapter title is spoken first');
  assert.ok(tl[tl.length - 1]!.t1 <= 10 + 1e-9);
  // The pauses are in the timeline: the gap between paragraphs is the paragraph pause.
  const end = tl.find((w) => w.p === 3 && paras[0]!.text.slice(w.w0, w.w1) === 'warm.')!;
  const next = tl.find((w) => w.p === 4)!;
  assert.ok(Math.abs(next.t0 - end.t1 - (PAUSE_CHUNK + PAUSE_PARAGRAPH)) < 1e-6);
  // Sentences: "It" lies in the second sentence.
  const it = tl[3]!;
  assert.equal(paras[0]!.text.slice(it.s0, it.s1), 'It was warm.');
});

test('narration sync: the word at a time, and empty cases', () => {
  const tl = narrationTimeline([{ p: 0, text: 'Alpha beta gamma.' }], null, 3);
  assert.equal(wordAt(tl, 0)!.w0, 0);
  assert.equal(wordAt(tl, 2.9)!.w0, 11);
  assert.equal(wordAt(tl, 999)!.w0, 11);
  assert.deepEqual(narrationTimeline([{ p: 0, text: 'x' }], null, 0), []);
  assert.equal(wordAt([], 1), null);
});
