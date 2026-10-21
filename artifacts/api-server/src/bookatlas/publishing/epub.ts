import { strToU8, zipSync, type Zippable } from 'fflate';

export interface Manuscript {
  id: string;
  title: string;
  author: string;
  language: string;
  description: string;
  chapters: { title: string; text: string }[];
}

function xml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff\uD800-\uDFFF]/gu, '\ufffd')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function document(title: string, language: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${xml(language)}" lang="${xml(language)}">
<head><title>${xml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>${body}</body></html>`;
}

/** Produce a complete, self-contained EPUB 3 archive. No external images or invented ISBN. */
export function buildEpub(book: Manuscript, modifiedAt: Date) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(book.id) ||
      !book.title.trim() || !book.author.trim() || !Number.isFinite(modifiedAt.getTime())) {
    throw new Error('Valid book identity, title, author and modification date are required.');
  }
  const language = Intl.getCanonicalLocales(book.language)[0];
  if (!language || !book.chapters.length || book.chapters.length > 128 ||
      book.chapters.some(chapter => !chapter.title.trim() || !chapter.text.trim()) ||
      book.chapters.reduce((sum, chapter) => sum + chapter.text.length, 0) > 1_000_000) {
    throw new Error('The complete manuscript must have 1–128 nonempty chapters within the packaging limit.');
  }
  const modified = modifiedAt.toISOString().replace(/\.\d{3}Z$/, 'Z');
  // The EPUB mimetype must be the first ZIP entry and stored without compression.
  const files: Zippable = {
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`),
    'EPUB/style.css': strToU8('body{font-family:serif;line-height:1.6;margin:5%;}h1{line-height:1.2;}p{orphans:2;widows:2;}img{max-width:100%;}'),
    'EPUB/cover.svg': strToU8(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">
<rect width="1200" height="1800" fill="#111735"/><path d="M100 260H1100M100 1540H1100" stroke="#f4c75d" stroke-width="4"/>
<text x="100" y="175" fill="#f4c75d" font-size="36" font-family="serif">BOOKATLAS</text>
<text x="100" y="600" fill="#ffffff" font-size="64" font-family="serif" textLength="1000" lengthAdjust="spacingAndGlyphs">${xml(book.title)}</text>
<text x="100" y="1400" fill="#ffffff" font-size="40" font-family="serif" textLength="1000" lengthAdjust="spacingAndGlyphs">${xml(book.author)}</text></svg>`),
    'EPUB/cover.xhtml': strToU8(document(book.title, language, `<section epub:type="cover"><img src="cover.svg" alt="${xml(book.title)}"/></section>`)),
    'EPUB/nav.xhtml': strToU8(document('Contents', language, `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${
      book.chapters.map((chapter, i) => `<li><a href="chapter-${i + 1}.xhtml">${xml(chapter.title)}</a></li>`).join('')
    }</ol></nav>`)),
  };
  book.chapters.forEach((chapter, i) => {
    const paragraphs = chapter.text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)
      .filter(p => p.trim()).map(p => `<p>${xml(p.trim()).replace(/\n/g, '<br/>')}</p>`).join('\n');
    files[`EPUB/chapter-${i + 1}.xhtml`] = strToU8(document(chapter.title, language,
      `<section epub:type="chapter"><h1>${xml(chapter.title)}</h1>${paragraphs}</section>`));
  });
  files['EPUB/package.opf'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${xml(language)}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="book-id">urn:uuid:${xml(book.id)}</dc:identifier>
<dc:title>${xml(book.title)}</dc:title><dc:creator>${xml(book.author)}</dc:creator>
<dc:language>${xml(language)}</dc:language><dc:description>${xml(book.description)}</dc:description>
<meta property="dcterms:modified">${modified}</meta></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="style" href="style.css" media-type="text/css"/>
<item id="cover-image" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/>
<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml" properties="svg"/>
${book.chapters.map((_, i) => `<item id="chapter-${i + 1}" href="chapter-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest><spine><itemref idref="cover" linear="no"/>
${book.chapters.map((_, i) => `<itemref idref="chapter-${i + 1}"/>`).join('\n')}</spine></package>`);
  const wordCount = book.chapters.reduce((sum, chapter) =>
    sum + (chapter.text.match(/\S+/gu)?.length ?? 0), 0);
  return {
    bytes: Buffer.from(zipSync(files, { level: 6 })),
    wordCount,
    estimatedReadingMinutes: Math.max(1, Math.ceil(wordCount / 200)),
  };
}
