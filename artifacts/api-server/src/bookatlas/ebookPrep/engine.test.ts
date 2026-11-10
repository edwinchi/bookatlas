import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { printCoverSpec, validateIntake, type SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import { prepareEpub, matchStoreMessage } from './engine.js';
import { readerContent, sampleChapters } from './content.js';
import { unpackEpub } from './archive.js';
import { imageSize } from './images.js';
import { accessFor } from '../../auth/policy.js';
import { epub2, frontCover } from './testFixtures.js';

const intake: SubmissionIntake = {
  title: 'The Test Codex', author: 'Ada Writer', language: 'English', description: 'd'.repeat(200),
  categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press',
  copyrightYear: 2026, price: 0, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
};

const files = (bytes: Uint8Array) => unzipSync(bytes);

test('prepares an EPUB 2 the way the Lulu rejection was fixed by hand', () => {
  const result = prepareEpub(epub2(), intake);
  // The synthetic cover is tiny on purpose; that is the only thing left for the author.
  const errors = result.report.findings.filter((f) => f.severity === 'error');
  assert.deepEqual(errors.map((f) => f.rule), ['cover-size'], JSON.stringify(result.report.findings));
  const out = files(result.epub);
  assert.deepEqual(Object.keys(out)[0], 'mimetype');
  const opf = strFromU8(out['content.opf']!);
  assert.match(opf, /version="3\.0"/);
  assert.match(opf, /<dc:rights>Copyright © 2026 by Test Press\. All rights reserved\.<\/dc:rights>/);
  assert.match(opf, /property="dcterms:modified"/);
  assert.match(opf, /properties="cover-image"/);
  assert.match(opf, /properties="nav"/);
  assert.match(opf, /<dc:identifier>urn:isbn:9781326157951<\/dc:identifier>/);
  assert.doesNotMatch(opf, /opf:(role|file-as|scheme)=|calibre|Aptos/);
  const nav = strFromU8(out['nav.xhtml']!);
  assert.match(nav, /<a href="chapter1.html#c1">Chapter 1<\/a>/);
  assert.match(nav, /<a href="chapter1.html#c1">Welcome<\/a>/);
  assert.equal(out['fonts/Aptos.ttf'], undefined);
  assert.doesNotMatch(strFromU8(out['style.css']!), /@font-face/);
  const chapter = strFromU8(out['chapter1.html']!);
  assert.match(chapter, /<li value="3">Matthew 7:13<\/li>/, 'list numbers are untouched');
  assert.doesNotMatch(strFromU8(out['front.html']!), /bar code/);
  assert.match(strFromU8(out['front.html']!), /<title>The Test Codex<\/title>/);
  const cover = imageSize(out['cover.png']!);
  assert.deepEqual(cover, { width: 175, height: 226 }, 'front panel only');
  assert.match(strFromU8(out['titlepage.xhtml']!), /viewBox="0 0 175 226"/);
  assert.ok(result.frontCover && result.frontCover[0] === 0xff, 'store cover is a JPEG');
});

test('a second run finds nothing left to fix (fixpoint)', () => {
  const first = prepareEpub(epub2(), intake);
  const second = prepareEpub(first.epub, intake);
  assert.equal(second.report.rounds.length, 0, JSON.stringify(second.report.rounds));
});

test('a copyright year that differs from the copyright page needs the author', () => {
  const result = prepareEpub(epub2(), { ...intake, copyrightYear: 2025 });
  const finding = result.report.findings.find((f) => f.rule === 'copyright-year');
  assert.equal(finding?.severity, 'error');
  assert.equal(finding?.fixable, false);
  assert.match(finding!.message, /says 2026, but you entered 2025/);
});

test('the same ISBN for eBook and print is an error', () => {
  const result = prepareEpub(epub2(), { ...intake, wantsPrint: true, printIsbn: '978-1-326-15795-1' });
  assert.ok(result.report.findings.some((f) => f.rule === 'isbn' && f.severity === 'error'));
});

test('store feedback the engine learned from blocks warnings of that rule', () => {
  assert.deepEqual(matchStoreMessage('Copyright year mismatch ~ Copyright year entered in the metadata does not match'), ['copyright-year']);
  assert.ok(matchStoreMessage('Ebook - Back Cover ~ Ebook marketing images cannot include a back cover section.').includes('cover-front-only'));
  const blocked = prepareEpub(epub2(), intake, { blockingRules: ['cover-size'] });
  assert.ok(blocked.report.findings.some((f) => f.rule === 'cover-size' && f.severity === 'error'));
});

test('an uploaded front cover replaces the one in the EPUB, without cropping it', () => {
  const result = prepareEpub(epub2(5), intake, { cover: { replacement: frontCover(1000, 1600) } });
  const changes = result.report.rounds.flatMap((r) => r.changes);
  assert.ok(changes.some((c) => c.change === 'Replaced the cover with the one you uploaded (1000 × 1600).'), JSON.stringify(changes));
  assert.ok(!changes.some((c) => c.rule === 'cover-front-only'), 'the old wrap is not cropped first');
  const out = files(result.epub);
  assert.deepEqual(imageSize(out['cover.png']!), { width: 1000, height: 1600 });
  assert.match(strFromU8(out['titlepage.xhtml']!), /viewBox="0 0 1000 1600"/);
  assert.equal(result.report.findings.find((f) => f.rule === 'cover-size')?.severity, 'warning', 'still below 1600 × 2560');
  assert.equal(prepareEpub(result.epub, intake).report.rounds.length, 0, 'the result is a fixpoint');
});

test('enlarging a small cover reaches the recommended size only when the author asks', () => {
  const plain = prepareEpub(epub2(5), intake);
  assert.equal(plain.report.findings.find((f) => f.rule === 'cover-size')?.fixable, false);
  const result = prepareEpub(epub2(5), intake, { cover: { enlarge: true } });
  const out = files(result.epub);
  const size = imageSize(out['cover.png']!)!;
  assert.equal(size.height, 2560);
  assert.ok(Math.abs(size.width / size.height - 875 / 1130) < 0.002, `keeps proportions: ${size.width} × ${size.height}`);
  assert.ok(!result.report.findings.some((f) => f.rule === 'cover-size'));
  assert.match(strFromU8(out['titlepage.xhtml']!), new RegExp(`viewBox="0 0 ${size.width} 2560"`));
  // A cover under 1000 pixels stays an error: enlarging that far would only blur it.
  assert.equal(prepareEpub(epub2(2), intake, { cover: { enlarge: true } }).report.findings.find((f) => f.rule === 'cover-size')?.severity, 'error');
});

test('reader content keeps chapters, subtitles, numbered lists and no markup', () => {
  const { epub } = prepareEpub(epub2(), intake);
  const { chapters } = readerContent(epub, intake.title);
  const ch1 = chapters.find((c) => c.title === 'Chapter 1: Welcome')!;
  assert.equal(ch1.subtitle, undefined, 'a bare "Chapter 1" heading absorbs its subtitle');
  assert.ok(ch1.content.includes('3. Matthew 7:13') && ch1.content.includes('4. John 14:6'));
  assert.ok(chapters.every((c) => c.content.every((p) => !/[<>]/.test(p))));
  assert.equal(sampleChapters(chapters)[0]!.title, 'Chapter 1: Welcome');
});

test('unsafe archive paths are rejected', () => {
  const evil = zipSync({ mimetype: strToU8('application/epub+zip'), '../escape.txt': strToU8('x') });
  assert.throws(() => unpackEpub(evil), /unsafe file path/);
});

test('print calculator matches KDP for a 600-page 6 × 9 white-paper paperback', () => {
  const spec = printCoverSpec('6x9', 'white', 600);
  assert.equal(spec.spineIn, 1.3512);
  assert.equal(spec.widthIn, 13.6012);
  assert.equal(spec.heightIn, 9.25);
  assert.equal(spec.gutterIn, 0.75);
  assert.equal(spec.problems.length, 0);
  assert.ok(printCoverSpec('6x9', 'cream', 800).problems.some((p) => /776/.test(p)));
  assert.ok(printCoverSpec('6x9', 'white', 600, 'hardcover').problems.some((p) => /550/.test(p)));
});

test('intake validation asks for what stores require', () => {
  const errors = validateIntake({ ...intake, description: 'short', copyrightYear: 1800, rightsConfirmed: false });
  assert.deepEqual(Object.keys(errors).sort(), ['copyrightYear', 'description', 'rightsConfirmed']);
  assert.match(validateIntake({ ...intake, wantsPrint: true, binding: 'paperback', trimSize: '6x9', paper: 'white', pageCount: 600, ebookIsbn: '9781326157951', printIsbn: '9781326157951' }).printIsbn!, /own ISBN/);
});

test('access policy for submission, reader and worker routes', () => {
  assert.equal(accessFor('POST', '/api/ebook-submissions'), 'reader');
  assert.equal(accessFor('PUT', '/api/ebook-submissions/0f8b8f5e-1111-4222-8333-944455556666/upload/3'), 'reader');
  assert.equal(accessFor('POST', '/api/ebook-submissions/0f8b8f5e-1111-4222-8333-944455556666/publish'), 'admin');
  assert.equal(accessFor('GET', '/api/ebook-prep/feedback'), 'admin');
  assert.equal(accessFor('GET', '/api/reader/catalog/atlas-ebook-12345678/content'), 'reader');
  assert.equal(accessFor('GET', '/api/catalog/covers/atlas-ebook-12345678.jpg'), 'public');
  assert.equal(accessFor('POST', '/api/internal/ebook-checks/claim'), 'self-service');
  assert.equal(accessFor('PUT', '/api/ebook-submissions/0f8b8f5e-1111-4222-8333-944455556666/cover'), 'reader');
  assert.equal(accessFor('DELETE', '/api/ebook-submissions/0f8b8f5e-1111-4222-8333-944455556666/cover'), 'reader');
  assert.equal(accessFor('POST', '/api/ebook-submissions/0f8b8f5e-1111-4222-8333-944455556666/cover/enlarge'), 'reader');
});
