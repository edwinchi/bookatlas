import { strToU8, zipSync, type Zippable } from 'fflate';

/**
 * Builds an EPUB 3 package from converted chapters (PDF or Word upload). Pure and synchronous so it runs in
 * the browser and in unit tests. The result then goes through the normal pipeline (fixes, EPUBCheck, review).
 */

export interface EpubMeta {
  title: string;
  subtitle?: string;
  author: string;
  /** Language name from the submission form (English, Dutch …). */
  language: string;
  description?: string;
  categories?: string[];
  copyrightHolder: string;
  copyrightYear: number;
  isbn?: string;
}

export interface EpubChapter {
  /** Heading shown in the table of contents; empty for untitled front matter. */
  title: string;
  /** 1 = part or top-level chapter, 2 = chapter or section below it. */
  level: 1 | 2;
  /** Body XHTML (well-formed), without the <html>/<body> wrapper. */
  xhtml: string;
}

export interface EpubImage { name: string; mediaType: string; data: Uint8Array }

export interface EpubInput {
  meta: EpubMeta;
  chapters: EpubChapter[];
  images?: EpubImage[];
  cover?: EpubImage;
  /** False when the book already has its own copyright page; true adds one from the form. */
  addCopyrightPage: boolean;
  /** Fixed for reproducible tests; defaults to now. */
  modified?: Date;
  /** Fixed for reproducible tests; defaults to a random UUID. */
  uuid?: string;
}

const LANGUAGE_CODES: Record<string, string> = {
  English: 'en', Dutch: 'nl', French: 'fr', German: 'de', Spanish: 'es', Portuguese: 'pt', Swahili: 'sw',
  Yoruba: 'yo', Igbo: 'ig', Hausa: 'ha', Zulu: 'zu', Amharic: 'am', Arabic: 'ar',
};
export const languageCode = (name: string) => LANGUAGE_CODES[name] ?? 'en';

export const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const STYLE = `body { font-family: serif; line-height: 1.5; margin: 0 5%; }
h1, h2, h3 { font-family: sans-serif; line-height: 1.25; page-break-after: avoid; break-after: avoid; }
h1 { font-size: 1.6em; margin: 2em 0 1em; text-align: center; }
h2 { font-size: 1.3em; margin: 1.6em 0 0.8em; }
h3 { font-size: 1.1em; margin: 1.2em 0 0.6em; }
p { margin: 0 0 0.8em; text-indent: 0; }
img { max-width: 100%; height: auto; }
.titlepage, .copyright { text-align: center; margin-top: 20%; }
.copyright p { font-size: 0.85em; }
.cover { margin: 0; padding: 0; text-align: center; }
.cover img { max-height: 100vh; }
nav ol { list-style: none; padding-left: 1em; }
`;

function page(title: string, body: string, lang: string, extraHead = '') {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}>
<head><meta charset="utf-8"/><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/>${extraHead}</head>
<body>
${body}
</body>
</html>`;
}

const randomUuid = () => (globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)));

export function buildEpub(input: EpubInput): Uint8Array {
  const { meta } = input;
  const lang = languageCode(meta.language);
  const modified = (input.modified ?? new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const isbn = meta.isbn?.replace(/[^\dX]/gi, '');
  const identifier = isbn && (isbn.length === 13 || isbn.length === 10) ? `urn:isbn:${isbn}` : `urn:uuid:${input.uuid ?? randomUuid()}`;
  const files: Zippable = {
    // The mimetype entry must come first and be stored uncompressed.
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(`<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`),
    'OEBPS/style.css': strToU8(STYLE),
  };
  const manifest: string[] = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="css" href="style.css" media-type="text/css"/>',
  ];
  const spine: string[] = [];
  const add = (id: string, href: string, content: string, inSpine = true, properties = '') => {
    files[`OEBPS/${href}`] = strToU8(content);
    manifest.push(`<item id="${id}" href="${href}" media-type="application/xhtml+xml"${properties ? ` properties="${properties}"` : ''}/>`);
    if (inSpine) spine.push(`<itemref idref="${id}"${id === 'cover' ? ' linear="yes"' : ''}/>`);
  };

  if (input.cover) {
    const ext = ({ 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' } as Record<string, string>)[input.cover.mediaType] ?? 'jpg';
    files[`OEBPS/images/cover.${ext}`] = [input.cover.data, { level: 0 }];
    manifest.push(`<item id="cover-image" href="images/cover.${ext}" media-type="${input.cover.mediaType}" properties="cover-image"/>`);
    add('cover', 'cover.xhtml', page('Cover', `<div class="cover"><img src="images/cover.${ext}" alt="${escapeXml(`Cover of ${meta.title}`)}"/></div>`, lang));
  }
  for (const [i, img] of (input.images ?? []).entries()) {
    files[`OEBPS/images/${img.name}`] = [img.data, { level: 0 }];
    manifest.push(`<item id="img-${i + 1}" href="images/${img.name}" media-type="${img.mediaType}"/>`);
  }

  const toc: { title: string; level: 1 | 2; href: string }[] = [];
  if (input.addCopyrightPage) {
    add('titlepage', 'titlepage.xhtml', page(meta.title, `<section class="titlepage" epub:type="titlepage">
<h1>${escapeXml(meta.title)}</h1>${meta.subtitle ? `\n<p><em>${escapeXml(meta.subtitle)}</em></p>` : ''}
<p>${escapeXml(meta.author)}</p>
</section>`, lang));
    add('copyright', 'copyright.xhtml', page('Copyright', `<section class="copyright" epub:type="copyright-page">
<p>Copyright © ${meta.copyrightYear} ${escapeXml(meta.copyrightHolder)}</p>
<p>All rights reserved. No part of this publication may be reproduced, distributed or transmitted in any form or by any means without the prior written permission of the copyright holder, except for brief quotations in reviews.</p>${isbn ? `\n<p>ISBN ${escapeXml(meta.isbn!)}</p>` : ''}
</section>`, lang));
  }
  input.chapters.forEach((ch, i) => {
    const id = `ch${String(i + 1).padStart(3, '0')}`;
    const href = `${id}.xhtml`;
    add(id, href, page(ch.title || meta.title, ch.xhtml, lang));
    if (ch.title) toc.push({ title: ch.title, level: ch.level, href });
  });

  // Table of contents: parts (level 1) hold the chapters (level 2) that follow them.
  const items: string[] = [];
  let open = false;
  for (const entry of toc) {
    const link = `<a href="${entry.href}">${escapeXml(entry.title)}</a>`;
    if (entry.level === 1) {
      if (open) items.push('</ol></li>');
      items.push(`<li>${link}<ol>`);
      open = true;
    } else items.push(`<li>${link}</li>`);
  }
  if (open) items.push('</ol></li>');
  const navBody = `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${items.join('').replace(/<ol><\/ol>/g, '')}</ol></nav>`;
  files['OEBPS/nav.xhtml'] = strToU8(page('Contents', navBody, lang));
  // The contents page is read after the front matter, before the first chapter.
  const firstChapter = spine.findIndex((s) => s.includes('idref="ch'));
  spine.splice(firstChapter < 0 ? spine.length : firstChapter, 0, '<itemref idref="nav"/>');

  const subjects = (meta.categories ?? []).map((c) => `<dc:subject>${escapeXml(c)}</dc:subject>`).join('\n    ');
  files['OEBPS/content.opf'] = strToU8(`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}>
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(meta.title)}</dc:title>
    <dc:creator id="author">${escapeXml(meta.author)}</dc:creator>
    <meta refines="#author" property="role" scheme="marc:relators">aut</meta>
    <dc:language>${lang}</dc:language>
    <dc:rights>Copyright © ${meta.copyrightYear} ${escapeXml(meta.copyrightHolder)}</dc:rights>
    ${meta.description ? `<dc:description>${escapeXml(meta.description)}</dc:description>` : ''}
    ${subjects}
    <meta property="dcterms:modified">${modified}</meta>
    ${input.cover ? '<meta name="cover" content="cover-image"/>' : ''}
  </metadata>
  <manifest>
    ${manifest.join('\n    ')}
  </manifest>
  <spine${lang === 'ar' ? ' page-progression-direction="rtl"' : ''}>
    ${spine.join('\n    ')}
  </spine>
</package>`);
  return zipSync(files);
}
