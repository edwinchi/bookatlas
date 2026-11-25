import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, zipSync } from 'fflate';
import { capWords, countWords, decodeEntities, paragraphsFromEpub, paragraphsFromHtml, paragraphsFromText, MAX_WORDS } from './ownText';

test('your own text: plain text and Markdown become paragraphs', () => {
  assert.deepEqual(paragraphsFromText('# Title\r\n\r\nLine one\nline two.\n\n\n  Second   paragraph. '), ['Title', 'Line one line two.', 'Second paragraph.']);
  assert.deepEqual(paragraphsFromText('   '), []);
});

test('your own text: web pages keep headings, paragraphs and lists, not scripts or menus', () => {
  const html = '<html><head><title>x</title><style>p{}</style></head><body><nav><p>Menu</p></nav><h1>Hello &amp; welcome</h1><div><p>First <b>bold</b><br>line.</p></div><ul><li>One</li></ul><script>alert(1)</script><div>Loose text</div></body></html>';
  assert.deepEqual(paragraphsFromHtml(html), ['Hello & welcome', 'First bold line.', 'One', 'Loose text']);
  assert.equal(decodeEntities('It&rsquo;s &#233;t&#xE9;'), 'It’s été');
});

test('your own text: an EPUB is read in spine order', () => {
  const epub = zipSync({
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8('<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>'),
    'OEBPS/content.opf': strToU8('<package><metadata><dc:title>My Book</dc:title></metadata><manifest><item id="a" href="ch1.xhtml"/><item id="b" href="ch%202.xhtml"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>'),
    'OEBPS/ch1.xhtml': strToU8('<html><body><p>Chapter one.</p></body></html>'),
    'OEBPS/ch 2.xhtml': strToU8('<html><body><h2>Start</h2><p>Chapter two first.</p></body></html>'),
  });
  assert.deepEqual(paragraphsFromEpub(epub), { title: 'My Book', paragraphs: ['Start', 'Chapter two first.', 'Chapter one.'] });
  assert.throws(() => paragraphsFromEpub(zipSync({ x: strToU8('y') })), /could not be read/);
});

test('your own text: very long texts are cut at whole paragraphs', () => {
  const para = Array(1000).fill('word').join(' ');
  const r = capWords(Array(MAX_WORDS / 1000 + 5).fill(para));
  assert.ok(r.cut);
  assert.equal(countWords(r.paragraphs), MAX_WORDS);
});
