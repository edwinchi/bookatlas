import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx';
import { buildEpub } from './epubBuilder.js';
import { fromDocx } from './fromDocx.js';
import { blocksOf, chromeFilter, linesOf, type PageText } from './pdfLayout.js';
import { splitChapters, toXhtml } from './structure.js';
import { contentBox } from './fromPdf.js';
import { prepareEpub } from '../../../../../api-server/src/bookatlas/ebookPrep/engine.js';

// A real 1×1 PNG: enough for the converter; the pipeline reports its size, as it would for any small cover.
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
const META = { title: 'The Test Scroll', author: 'Ada Writer', language: 'English', copyrightHolder: 'Ada Writer', copyrightYear: 2026, description: 'A test book. '.repeat(20) };
const INTAKE = {
  ...META, subtitle: '', categories: ['Spiritual Healing & Alignment'], keywords: ['test'], ebookIsbn: '', price: 4.99,
  rightsConfirmed: true, aiContent: 'none' as const, wantsPrint: false,
};
const toArrayBuffer = (b: Uint8Array | Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const body = (n: number) => Array.from({ length: n }, (_, i) => new Paragraph(`Paragraph ${i + 1} of a chapter that has enough words to read like a real book page.`));

async function wordFile(copyrightYear = 2026) {
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ children: [new ImageRun({ type: 'png', data: PNG, transformation: { width: 100, height: 160 } })] }),
    new Paragraph({ children: [new TextRun({ text: 'THE TEST SCROLL', bold: true })] }),
    new Paragraph(`Copyright © ${copyrightYear} Ada Writer. All rights reserved.`),
    new Paragraph({ text: 'Table of Contents', heading: HeadingLevel.HEADING_2 }),
    new Paragraph('Chapter One ........ 3'),
    new Paragraph({ text: 'PART ONE: The Scroll', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: 'The First Chapter', heading: HeadingLevel.HEADING_2 }), ...body(6),
    new Paragraph({ text: 'The Second Chapter', heading: HeadingLevel.HEADING_2 }), ...body(6),
    new Paragraph({ text: 'A section inside it', heading: HeadingLevel.HEADING_3 }), ...body(3),
  ] }] });
  return toArrayBuffer(await Packer.toBuffer(doc));
}

test('a Word manuscript becomes an EPUB the pipeline accepts: cover from the first picture, chapters from headings', async () => {
  const progress: number[] = [];
  const m = await fromDocx(await wordFile(), 2026, (f) => progress.push(f));
  assert.ok(m.cover, 'the first picture before any text is the cover');
  assert.equal(m.images.length, 0, 'the cover is not also an inline picture');
  assert.deepEqual(m.chapters.filter((c) => c.title).map((c) => `${c.level} ${c.title}`), ['1 PART ONE: The Scroll', '2 The First Chapter', '2 The Second Chapter']);
  assert.ok(m.chapters[2]!.xhtml.includes('<h3>A section inside it</h3>') || m.chapters[3]!.xhtml.includes('<h3>A section inside it</h3>'), 'deeper headings stay inside their chapter');
  assert.equal(m.report.hasCopyrightPage, true);
  assert.equal(m.report.copyrightYearInBook, 2026);
  assert.ok(m.report.notes.some((n) => /table of contents was replaced/.test(n)), 'the typed contents list is replaced');
  assert.ok(progress.length >= 3 && progress.every((p, i) => i === 0 || p >= progress[i - 1]!), 'progress only moves forward');

  const epub = buildEpub({ meta: META, chapters: m.chapters, images: m.images, cover: m.cover, addCopyrightPage: !m.report.hasCopyrightPage, modified: new Date('2026-11-14T12:00:00Z'), uuid: '00000000-0000-4000-8000-000000000000' });
  const files = unzipSync(epub);
  assert.equal(Object.keys(files)[0], 'mimetype', 'mimetype comes first');
  assert.equal(strFromU8(files.mimetype!), 'application/epub+zip');
  const opf = strFromU8(files['OEBPS/content.opf']!);
  assert.match(opf, /properties="cover-image"/);
  assert.match(opf, /<dc:title>The Test Scroll<\/dc:title>/);
  assert.match(opf, /<dc:language>en<\/dc:language>/);
  assert.ok(!files['OEBPS/copyright.xhtml'], 'the book has its own copyright page, so none is added');
  const nav = strFromU8(files['OEBPS/nav.xhtml']!);
  assert.match(nav, /<li><a href="ch\d+\.xhtml">PART ONE: The Scroll<\/a><ol><li><a href="ch\d+\.xhtml">The First Chapter<\/a><\/li>/, 'chapters nest under their part');

  const prep = prepareEpub(epub, INTAKE);
  const errors = prep.report.findings.filter((f) => f.severity === 'error').map((f) => f.rule);
  assert.deepEqual(errors.filter((r) => r !== 'cover-size'), [], 'only the tiny test cover is reported');
  assert.equal(prep.report.epubVersion, '3.0');
});

test('a copyright year that differs from the form is reported; a missing copyright page is added', async () => {
  const m = await fromDocx(await wordFile(2024), 2026, () => undefined);
  assert.ok(m.report.notes.some((n) => /says 2024, but the form says 2026/.test(n)));
  const plain = await fromDocx(toArrayBuffer(await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph({ text: 'Only Chapter', heading: HeadingLevel.HEADING_1 }), ...body(3)] }] }))), 2026, () => undefined);
  assert.equal(plain.report.hasCopyrightPage, false);
  assert.equal(plain.cover, undefined);
  assert.ok(plain.report.notes.some((n) => /No cover was found/.test(n)));
  const epub = unzipSync(buildEpub({ meta: META, chapters: plain.chapters, addCopyrightPage: true }));
  assert.match(strFromU8(epub['OEBPS/copyright.xhtml']!), /Copyright © 2026 Ada Writer/);
});

test('HTML becomes well-formed XHTML; internal Word links keep their text; the typed contents are dropped', () => {
  assert.equal(toXhtml('<p>A<br>B <img src="images/a.png" alt="x"> &nbsp; Tom & Jerry <a href="#_Toc1">see</a><a id="_Toc2"></a></p><p></p>'),
    '<p>A<br/>B <img src="images/a.png" alt="x"/> &#160; Tom &amp; Jerry see</p>');
  const split = splitChapters('<p>Title page</p><h2>Contents</h2><p>One .... 3</p><h1>One</h1><p>x</p><h2>Two &amp; Three</h2><p>y</p>');
  assert.equal(split.front, '<p>Title page</p>');
  assert.equal(split.droppedContents, true);
  assert.deepEqual(split.chapters.map((c) => [c.level, c.title]), [[1, 'One'], [2, 'Two & Three']]);
});

test('PDF reading order: page numbers and running heads go, wrapped headings join, hyphenated words rejoin', () => {
  const H = 800;
  const page = (n: number, extra: PageText['items']): PageText => ({ width: 600, height: H, images: 0, items: [
    { str: 'THE TEST SCROLL', x: 250, y: H - 30, width: 100, size: 9 },
    { str: String(n), x: 295, y: 30, width: 10, size: 9 },
    ...extra,
  ] });
  const bodyLine = (y: number, str: string, x = 72) => ({ str, x, y, width: str.length * 5.2, size: 11 });
  const long = 'This line of the paragraph is long enough to fill the measure of the page from margin to';
  const pages = [
    page(1, [
      { str: 'PART THREE: The Science of', x: 120, y: 700, width: 360, size: 22 },
      { str: 'Sovereignty', x: 230, y: 672, width: 140, size: 22 },
      bodyLine(620, long), bodyLine(606, 'margin, and the next one con-'), bodyLine(592, 'tinues it until the sentence ends.'),
      bodyLine(560, long), bodyLine(546, 'Second paragraph ends here.'),
      { str: 'Welcome home.', x: 230, y: 500, width: 140, size: 18 },
    ]),
    page(2, [bodyLine(620, long), bodyLine(606, 'margin on the second page.')]),
    page(3, [bodyLine(620, long)]),
  ];
  const all = pages.map((p, i) => ({ page: p, lines: linesOf(p, i + 1) }));
  const keep = chromeFilter(all);
  const blocks = blocksOf(all.flatMap(({ page: p, lines }) => lines.filter((l) => keep(l, p))));
  assert.deepEqual(blocks[0], { kind: 'h1', text: 'PART THREE: The Science of Sovereignty', page: 1 }, 'a heading that wraps stays one heading');
  assert.match(blocks[1]!.text, /the next one continues it until the sentence ends\.$/, 'hyphenated words rejoin');
  assert.equal(blocks[2]!.text.endsWith('Second paragraph ends here.'), true, 'a wide gap starts a new paragraph');
  assert.equal(blocks.find((b) => b.text === 'Welcome home.')?.kind, 'p', 'large type ending a sentence is not a heading');
  assert.ok(blocks.every((b) => !/THE TEST SCROLL|^\d+$/.test(b.text)), 'running heads and page numbers are removed');
});

test('a cover printed on a larger white page is trimmed to the artwork', () => {
  const w = 100, h = 140;
  const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 20; y < 120; y += 1) for (let x = 15; x < 85; x += 1) { const i = (y * w + x) * 4; rgba[i] = 20; rgba[i + 1] = 30; rgba[i + 2] = 90; }
  rgba[(5 * w + 5) * 4] = 0; // a speck of dust in the margin does not count
  assert.deepEqual(contentBox(rgba, w, h), { x: 15, y: 20, width: 70, height: 100 });
});
