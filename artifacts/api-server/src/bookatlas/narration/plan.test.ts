import test from 'node:test';
import assert from 'node:assert/strict';
import { inPreview, narrationEstimate, narrationPrice, planSegments, segmentText, wordCount } from './plan.js';
import { pcm16ToMp3, pcmSeconds, toPcm16 } from './mp3.js';

const para = (n: number) => `<p>${'word '.repeat(n).trim()}.</p>`;

test('the add-on price: €24.99 up to 80,000 words, then €2.99 per extra 10,000', () => {
  assert.equal(narrationPrice(55_752), 2499);
  assert.equal(narrationPrice(80_000), 2499);
  assert.equal(narrationPrice(80_001), 2798);
  assert.equal(narrationPrice(101_000), 2499 + 3 * 299);
});

test('the Gemini cost estimate for a 55,000-word book is about US$10, about 6 hours', () => {
  const e = narrationEstimate(55_000);
  assert.ok(e.seconds > 6 * 3600 - 600 && e.seconds < 6 * 3600 + 600);
  assert.ok(e.micros > 9_500_000 && e.micros < 10_500_000, `${e.micros}`);
  assert.equal(e.reserveMicros, Math.ceil(e.micros * 1.5));
});

test('segments are whole paragraphs from one chapter, about 1,200 characters, and cover every paragraph once', () => {
  const chapters = [
    { title: 'Dedication', content: [para(5)] },
    { title: 'One', content: [para(100), para(100), para(100), '<p> </p>', para(400)] },
    { title: 'Two', content: [para(50)] },
  ];
  const segs = planSegments(chapters);
  assert.ok(segs.every((s) => s.chars <= 1_200 || s.from === s.to), 'within the size, unless one paragraph is longer');
  const covered = segs.flatMap((s) => Array.from({ length: s.to - s.from + 1 }, (_, i) => `${s.chapter}:${s.from + i}`));
  assert.equal(new Set(covered).size, covered.length, 'no paragraph twice');
  for (const [ci, c] of chapters.entries()) c.content.forEach((p, pi) => { if (p.replace(/<[^>]+>|\s/g, '')) assert.ok(covered.includes(`${ci}:${pi}`), `${ci}:${pi} narrated`); });
  assert.match(segmentText(chapters, segs.find((s) => s.chapter === 1)!), /^One\.\n\nword/, 'a chapter starts with its title');
  assert.equal(wordCount(chapters), 5 + 300 + 400 + 50);
  const preview = [chapters[0]!, { ...chapters[1]!, content: chapters[1]!.content.slice(0, 2) }];
  assert.deepEqual(segs.map((s) => inPreview(s, preview)), segs.map((s) => s.chapter === 0 || (s.chapter === 1 && s.to < 2)));
});

test('Gemini PCM becomes a compact MP3', () => {
  const rate = 24_000, seconds = 2;
  const pcm = new Uint8Array(rate * seconds * 2);
  const view = new DataView(pcm.buffer);
  for (let i = 0; i < rate * seconds; i += 1) view.setInt16(i * 2, Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 8000), true);
  const { pcm: raw, sampleRate } = toPcm16(pcm, 'audio/L16;codec=pcm;rate=24000');
  assert.equal(pcmSeconds(raw, sampleRate), 2);
  const mp3 = pcm16ToMp3(raw, sampleRate);
  assert.ok(mp3[0] === 0xff && (mp3[1]! & 0xe0) === 0xe0, 'starts with an MPEG frame');
  assert.ok(mp3.length > 10_000 && mp3.length < 22_000, `${mp3.length} bytes for 2 s at 64 kbps`);
});
