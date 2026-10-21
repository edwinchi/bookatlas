import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { crc32, deflateSync } from 'node:zlib';
import { validateSource, decodeBase64 } from '../../artifacts/api-server/src/bookatlas/publishing/source.ts';
import { buildEpub } from '../../artifacts/api-server/src/bookatlas/publishing/epub.ts';
import { inspectWav, wrapPcm16LE, decodeStudioWav } from '../../artifacts/api-server/src/bookatlas/publishing/audio.ts';
import { reserveBudget, tokenCostUpperBound } from '../../artifacts/api-server/src/bookatlas/publishing/budget.ts';

const require = createRequire(new URL('../../artifacts/api-server/package.json', import.meta.url));
const { PDFDocument } = require('pdf-lib');
const { unzipSync, strFromU8 } = require('fflate');
const upload = (fileName, bytes, mimeType) => ({ fileName, base64: Buffer.from(bytes).toString('base64'), mimeType });

function png() {
  const chunk = (kind, data) => {
    const output = Buffer.alloc(data.length + 12);
    output.writeUInt32BE(data.length);
    output.write(kind, 4);
    data.copy(output, 8);
    output.writeUInt32BE(crc32(output.subarray(4, output.length - 4)), output.length - 4);
    return output;
  };
  const dimensions = Buffer.alloc(13);
  dimensions.writeUInt32BE(1, 0);
  dimensions.writeUInt32BE(1, 4);
  dimensions[8] = 8;
  dimensions[9] = 2;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', dimensions),
    chunk('IDAT', deflateSync(Buffer.from([0, 255, 255, 255]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

test('text extraction preparation preserves the complete UTF-8 transcript and hash', async () => {
  const text = 'An audio transcript.\n\n' + '日本語 and café. 🌍\n'.repeat(1000);
  const result = await validateSource(upload('transcript.txt', Buffer.from(text), 'text/plain'));
  assert.equal(result.text, text);
  assert.equal(result.bytes.toString(), text);
  assert.match(result.sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.mimeType, 'text/plain');
});

test('uploads reject paths, unsupported types, type mismatches and binary text', async () => {
  for (const input of [
    upload('../source.txt', 'hello'),
    upload('recording.mp3', 'audio'),
    upload('source.txt', 'hello', 'application/pdf'),
    upload('source.txt', Buffer.from([0xff,0xfe])),
    upload('source.txt', Buffer.from([0,65])),
    upload('empty.md', ' \n'),
  ]) await assert.rejects(validateSource(input));
});

test('base64 decoding rejects ignored junk, noncanonical encodings and over-limit bytes', () => {
  for (const payload of ['aGVsbG8', 'aGVsbG8=??', 'AB==', 'data:text/plain;base64,aGk=']) {
    assert.throws(() => decodeBase64(payload, 100));
  }
  assert.throws(() => decodeBase64(Buffer.alloc(101).toString('base64'), 100));
});

test('PDF validation reads actual page count and rejects corrupt or oversized documents', async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.addPage();
  const result = await validateSource(upload('source.pdf', await pdf.save()));
  assert.equal(result.pageCount, 2);
  assert.equal(result.text, undefined); // No filename or pretend extracted content.
  await assert.rejects(validateSource(upload('source.pdf', '%PDF-invalid')));
  for (let i = 0; i < 19; i++) pdf.addPage();
  await assert.rejects(validateSource(upload('source.pdf', await pdf.save())), /1–20/);
});

test('PNG uploads validate real chunks and reject corrupted image bytes', async () => {
  const bytes = png();
  assert.equal((await validateSource(upload('source.png', bytes))).mimeType, 'image/png');
  const corrupt = Buffer.from(bytes);
  corrupt[corrupt.length - 16] ^= 1;
  await assert.rejects(validateSource(upload('source.png', corrupt)));
  await assert.rejects(validateSource(upload('source.png', bytes.subarray(0, -1))));
});

test('oversized source text is rejected instead of silently truncated', async () => {
  await assert.rejects(validateSource(upload('source.md', Buffer.alloc(256 * 1024 + 1, 65))), /256 KiB/);
});

const manuscript = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'A <Complete> Book & 🌍',
  author: 'Synthetic Author',
  language: 'en',
  description: 'Fixture for format checks, not a published book.',
  chapters: [
    { title: 'Beginning & Context', text: 'First paragraph.\n\n<script>alert("not executable")</script>\nA new line.' },
    { title: 'Conclusion', text: 'The complete final chapter.' },
  ],
};

test('EPUB archive has the required first uncompressed mimetype and complete navigation/spine', () => {
  const { bytes, wordCount, estimatedReadingMinutes } = buildEpub(manuscript, new Date('2026-10-21T00:00:00Z'));
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  assert.equal(bytes.readUInt16LE(8), 0);
  const fileNameLength = bytes.readUInt16LE(26);
  assert.equal(bytes.toString('utf8', 30, 30 + fileNameLength), 'mimetype');
  const entries = unzipSync(bytes);
  assert.equal(strFromU8(entries.mimetype), 'application/epub+zip');
  const opf = strFromU8(entries['EPUB/package.opf']);
  const nav = strFromU8(entries['EPUB/nav.xhtml']);
  for (let i = 1; i <= manuscript.chapters.length; i++) {
    assert.ok(entries[`EPUB/chapter-${i}.xhtml`]);
    assert.match(opf, new RegExp(`idref="chapter-${i}"`));
    assert.match(nav, new RegExp(`href="chapter-${i}.xhtml"`));
  }
  assert.match(opf, /A &lt;Complete&gt; Book &amp; 🌍/);
  assert.match(opf, /2026-10-21T00:00:00Z/);
  assert.ok(wordCount > 0 && estimatedReadingMinutes > 0);
  assert.doesNotMatch(opf, /isbn|rating/i);
});

test('EPUB escapes active markup and includes a local cover and all chapter text', () => {
  const { bytes } = buildEpub(manuscript, new Date());
  const entries = unzipSync(bytes);
  const chapter = strFromU8(entries['EPUB/chapter-1.xhtml']);
  assert.doesNotMatch(chapter, /<script>/);
  assert.match(chapter, /&lt;script&gt;/);
  assert.match(chapter, /A new line\./);
  assert.ok(entries['EPUB/cover.svg']);
  assert.match(strFromU8(entries['EPUB/chapter-2.xhtml']), /complete final chapter/);
});

test('EPUB refuses incomplete manuscripts instead of packaging sample-only placeholders', () => {
  for (const book of [
    { ...manuscript, chapters: [] },
    { ...manuscript, chapters: [{ title: 'Missing content', text: '' }] },
    { ...manuscript, id: 'not-a-real-uuid' },
  ]) assert.throws(() => buildEpub(book, new Date()));
});

test('audio duration comes from actual PCM samples and is preserved through base64 WAV decoding', () => {
  const pcm = Buffer.alloc(24_000 * 2);
  for (let offset = 0; offset < pcm.length; offset += 2) pcm.writeInt16LE((offset % 100) * 100, offset);
  const bytes = wrapPcm16LE(pcm, 24_000);
  const metadata = inspectWav(bytes);
  assert.equal(metadata.durationSeconds, 1);
  assert.equal(metadata.sampleRate, 24_000);
  assert.equal(metadata.channels, 1);
  assert.equal(decodeStudioWav(bytes.toString('base64'), 'audio/wav').durationSeconds, 1);
});

test('WAV parser handles extra RIFF chunks instead of assuming a fixed audio offset', () => {
  const original = wrapPcm16LE(Buffer.alloc(48_000, 1), 24_000);
  const extra = Buffer.alloc(12);
  extra.write('JUNK'); extra.writeUInt32LE(4, 4);
  const bytes = Buffer.concat([original.subarray(0, 36), extra, original.subarray(36)]);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  assert.equal(inspectWav(bytes).durationSeconds, 1);
});

test('audio refuses truncated bytes, inconsistent headers and unknown raw PCM formats', () => {
  const wav = wrapPcm16LE(Buffer.alloc(48_000, 1), 24_000);
  assert.throws(() => inspectWav(wav.subarray(0, -1)));
  const corrupt = Buffer.from(wav);
  corrupt.writeUInt32LE(1, 28);
  assert.throws(() => inspectWav(corrupt));
  assert.throws(() => decodeStudioWav(wav.toString('base64'), 'audio/L16;rate=24000'));
  assert.throws(() => wrapPcm16LE(Buffer.alloc(3), 24_000));
});

test('cost bounds round up in integer microdollars and include the safety margin', () => {
  assert.equal(tokenCostUpperBound(1000, 1000, {
    inputMicrosPerMillionTokens: 1_500_000,
    outputMicrosPerMillionTokens: 7_500_000,
    safetyPercent: 25,
  }), 11_250);
  assert.equal(tokenCostUpperBound(1, 0, {
    inputMicrosPerMillionTokens: 1,
    outputMicrosPerMillionTokens: 0,
    safetyPercent: 0,
  }), 1);
  assert.throws(() => tokenCostUpperBound(-1, 0, {
    inputMicrosPerMillionTokens: 1, outputMicrosPerMillionTokens: 1, safetyPercent: 0,
  }));
});

test('budget reservations enforce the one-dollar limit without mutating or refunding prior state', () => {
  const original = { limitMicros: 1_000_000, reservedMicros: 0, reservations: {} };
  const first = reserveBudget(original, 'extract-attempt-1', 600_000);
  assert.equal(original.reservedMicros, 0);
  assert.equal(first.reservedMicros, 600_000);
  assert.throws(() => reserveBudget(first, 'extract-attempt-1', 1));
  assert.throws(() => reserveBudget(first, 'retry-attempt-2', 400_001));
  const final = reserveBudget(first, 'chapter-attempt-1', 400_000);
  assert.equal(final.reservedMicros, 1_000_000);
  assert.throws(() => reserveBudget(final, 'narration-attempt-1', 1));
  assert.throws(() => reserveBudget({ ...first, reservedMicros: 1 }, 'next', 1));
});
