import { createHash } from 'node:crypto';
import { isValidIsbn, normaliseIsbn, type SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import type { EpubFiles } from './archive.js';
import { PackageDocument, attributes, decodeEntities, escapeXml, relativeHref, resolvePath, type ManifestItem } from './opf.js';
import { crop, decodeImage, encodeJpeg, encodePng, findFrontPanel, imageSize } from './images.js';
import { deobfuscate, forbidsEmbedding, inspectFont, isRedistributionRestricted } from './fonts.js';

export type Severity = 'error' | 'warning' | 'info';
export interface Finding { rule: string; severity: Severity; message: string; fixable: boolean }
export interface EpubcheckMessage { severity: 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'USAGE'; code: string; message: string; location?: string }

export interface PrepContext {
  epub: EpubFiles;
  opf: PackageDocument;
  intake: SubmissionIntake;
  /** Messages from the last EPUBCheck run of this book; cleared once a fix changes the file. */
  epubcheck: EpubcheckMessage[];
  notes: { coverCrop?: string };
}

export interface Rule {
  id: string;
  title: string;
  /** Store rejection messages this rule answers; used to learn from store feedback. */
  storeMessages: RegExp[];
  check(ctx: PrepContext): Finding[];
  fix?(ctx: PrepContext): string[];
}

const finding = (rule: string, severity: Severity, message: string, fixable = false): Finding => ({ rule, severity, message, fixable });

const LANGUAGE_CODES: Record<string, string> = {
  English: 'en', Dutch: 'nl', French: 'fr', German: 'de', Spanish: 'es', Portuguese: 'pt', Swahili: 'sw',
  Yoruba: 'yo', Igbo: 'ig', Hausa: 'ha', Zulu: 'zu', Amharic: 'am', Arabic: 'ar',
};

function textOf(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function spineTexts(ctx: PrepContext) {
  return ctx.opf.spine().filter((i) => ctx.epub.has(i.path)).map((i) => ({ item: i, html: ctx.epub.text(i.path) }));
}

function isFont(item: ManifestItem) {
  return /font|opentype|truetype/i.test(item.mediaType) || /\.(ttf|otf|woff2?)$/i.test(item.path);
}

// --- Navigation -----------------------------------------------------------------------------

interface NavEntry { label: string; href: string; children: NavEntry[] }

function navFromNcx(ctx: PrepContext, ncx: ManifestItem, navDir: string): NavEntry[] {
  const xml = ctx.epub.text(ncx.path);
  const ncxDir = ncx.path.includes('/') ? ncx.path.slice(0, ncx.path.lastIndexOf('/')) : '';
  const root: NavEntry[] = [];
  const stack: NavEntry[][] = [root];
  for (const m of xml.matchAll(/<navPoint\b[^>]*>|<\/navPoint>|<text>([\s\S]*?)<\/text>|<content\b[^>]*>/g)) {
    const token = m[0];
    if (token.startsWith('<navPoint')) {
      const entry: NavEntry = { label: '', href: '', children: [] };
      stack[stack.length - 1]!.push(entry);
      stack.push(entry.children);
    } else if (token === '</navPoint>') {
      stack.pop();
    } else {
      const parent = stack[stack.length - 2];
      const entry = parent?.[parent.length - 1];
      if (!entry) continue;
      if (token.startsWith('<text') && !entry.label) entry.label = decodeEntities(m[1]!.trim());
      if (token.startsWith('<content')) {
        const src = attributes(token).src ?? '';
        const [file, fragment] = src.split('#');
        entry.href = relativeHref(navDir, resolvePath(ncxDir, file!)) + (fragment ? `#${fragment}` : '');
      }
    }
  }
  return root;
}

function navFromHeadings(ctx: PrepContext, navDir: string): NavEntry[] {
  const entries: NavEntry[] = [];
  let counter = 0;
  for (const { item, html } of spineTexts(ctx)) {
    let changed = false;
    const updated = html.replace(/<(h[12])\b([^>]*)>([\s\S]*?)<\/\1>/g, (whole, tag: string, attrs: string, inner: string) => {
      const label = textOf(inner);
      if (!label) return whole;
      let id = attributes(`<x ${attrs}>`).id;
      if (!id) { id = `bookatlas-toc-${(counter += 1)}`; changed = true; }
      entries.push({ label, href: `${relativeHref(navDir, item.path)}#${id}`, children: [] });
      return attributes(`<x ${attrs}>`).id ? whole : `<${tag} id="${id}"${attrs}>${inner}</${tag}>`;
    });
    if (changed) ctx.epub.setText(item.path, updated);
  }
  return entries;
}

function renderNav(entries: NavEntry[], depth: number): string {
  const pad = '  '.repeat(depth);
  return [`${pad}<ol>`, ...entries.map((e) => {
    const link = `<a href="${escapeXml(e.href)}">${escapeXml(e.label || 'Untitled')}</a>`;
    return e.children.length ? `${pad}  <li>${link}\n${renderNav(e.children, depth + 2)}\n${pad}  </li>` : `${pad}  <li>${link}</li>`;
  }), `${pad}</ol>`].join('\n');
}

function writeNav(ctx: PrepContext) {
  const navPath = resolvePath(ctx.opf.dir, 'nav.xhtml');
  const navDir = ctx.opf.dir;
  const ncx = ctx.opf.items().find((i) => i.mediaType === 'application/x-dtbncx+xml');
  let entries = ncx && ctx.epub.has(ncx.path) ? navFromNcx(ctx, ncx, navDir) : [];
  const source = entries.length ? 'the old table of contents' : 'the chapter headings';
  if (!entries.length) entries = navFromHeadings(ctx, navDir);
  const title = escapeXml(ctx.opf.dc('title')[0] ?? ctx.intake.title);
  const cover = ctx.opf.spine()[0];
  ctx.epub.setText(navPath, `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${ctx.opf.dc('language')[0] ?? 'en'}" xml:lang="${ctx.opf.dc('language')[0] ?? 'en'}">
  <head>
    <meta charset="utf-8"/>
    <title>${title}</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Contents</h1>
${renderNav(entries, 3)}
    </nav>
    <nav epub:type="landmarks" id="landmarks" hidden="hidden">
      <h2>Landmarks</h2>
      <ol>
        ${cover ? `<li><a epub:type="cover" href="${escapeXml(relativeHref(navDir, cover.path))}">Cover</a></li>` : ''}
        ${entries[0] ? `<li><a epub:type="toc" href="${escapeXml(entries[0].href)}">Contents</a></li>` : ''}
      </ol>
    </nav>
  </body>
</html>
`);
  const existing = ctx.opf.items().find((i) => i.properties.includes('nav'));
  if (existing) ctx.opf.updateItem(existing, { properties: existing.properties.filter((p) => p !== 'nav').join(' ') || null });
  if (!ctx.opf.item('nav')) ctx.opf.addItem('nav', navPath, 'application/xhtml+xml', 'nav');
  else ctx.opf.updateItem(ctx.opf.item('nav')!, { href: relativeHref(ctx.opf.dir, navPath), properties: 'nav' });
  return `Built the EPUB 3 table of contents from ${source} (${countEntries(entries)} entries).`;
}

const countEntries = (entries: NavEntry[]): number => entries.reduce((n, e) => n + 1 + countEntries(e.children), 0);

// --- Rules ----------------------------------------------------------------------------------

const container: Rule = {
  id: 'container',
  title: 'EPUB container',
  storeMessages: [/mimetype/i, /container/i],
  check(ctx) {
    const ok = ctx.epub.has('mimetype') && ctx.epub.text('mimetype').trim() === 'application/epub+zip';
    return ok ? [] : [finding('container', 'error', 'The mimetype file is missing or wrong.', true)];
  },
  fix(ctx) {
    ctx.epub.setText('mimetype', 'application/epub+zip');
    return ['Wrote the mimetype file.'];
  },
};

const epub3Package: Rule = {
  id: 'epub3-package',
  title: 'EPUB 3 package',
  storeMessages: [/epub ?2/i, /attribute "value" not allowed/i, /dcterms:modified/i],
  check(ctx) {
    const out: Finding[] = [];
    if (!ctx.opf.version.startsWith('3')) out.push(finding('epub3-package', 'warning', `The book is EPUB ${ctx.opf.version}; stores expect EPUB 3. It is upgraded without changing the pages.`, true));
    else if (!/property="dcterms:modified"/.test(ctx.opf.xml)) out.push(finding('epub3-package', 'warning', 'The package has no last-modified date.', true));
    if (/opf:(role|file-as|scheme|event)=/.test(ctx.opf.xml) && ctx.opf.version.startsWith('3')) out.push(finding('epub3-package', 'warning', 'The package still uses EPUB 2 metadata attributes.', true));
    return out;
  },
  fix(ctx) {
    const changes: string[] = [];
    const opf = ctx.opf;
    if (!opf.version.startsWith('3')) {
      opf.xml = opf.xml.replace(/(<(?:opf:)?package\b[^>]*\bversion=")[^"]*"/, '$13.0"');
      changes.push('Upgraded the package from EPUB 2 to EPUB 3; content pages are unchanged.');
    }
    let n = 0;
    opf.xml = opf.xml.replace(/<dc:(creator|contributor)\b([^>]*)>([\s\S]*?)<\/dc:\1>/g, (_whole, tag: string, attrs: string, name: string) => {
      const a = attributes(`<x ${attrs}>`);
      const id = a.id ?? `${tag}${(n += 1)}`;
      const metas = [
        a['opf:role'] ? `<meta refines="#${id}" property="role" scheme="marc:relators">${escapeXml(a['opf:role'])}</meta>` : '',
        a['opf:file-as'] && a['opf:file-as'] !== 'Unknown' ? `<meta refines="#${id}" property="file-as">${escapeXml(a['opf:file-as'])}</meta>` : '',
      ].filter(Boolean);
      if (tag === 'contributor' && a['opf:role'] === 'bkp') return '';
      return `<dc:${tag} id="${id}">${name}</dc:${tag}>${metas.map((m) => `\n    ${m}`).join('')}`;
    });
    const uid = opf.uniqueIdentifierId;
    opf.xml = opf.xml.replace(/<dc:identifier\b([^>]*)>([\s\S]*?)<\/dc:identifier>/g, (whole, attrs: string, value: string) => {
      const a = attributes(`<x ${attrs}>`);
      if (!a['opf:scheme']) return whole;
      const isbn = /isbn/i.test(a['opf:scheme']) && a.id !== uid && !/^urn:/i.test(value.trim());
      return `<dc:identifier${a.id ? ` id="${a.id}"` : ''}>${isbn ? `urn:isbn:${normaliseIsbn(value)}` : value.trim()}</dc:identifier>`;
    });
    opf.xml = opf.xml.replace(/<dc:date\b[^>]*opf:event="(?!publication)[^"]*"[^>]*>[\s\S]*?<\/dc:date>\s*/g, '');
    opf.xml = opf.xml.replace(/<dc:date\b[^>]*>/g, '<dc:date>');
    opf.xml = opf.xml.replace(/\sopf:(role|file-as|scheme|event)="[^"]*"/g, '');
    const modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    if (/property="dcterms:modified"/.test(opf.xml)) opf.xml = opf.xml.replace(/(<meta property="dcterms:modified">)[^<]*/, `$1${modified}`);
    else opf.addMetadata(`<meta property="dcterms:modified">${modified}</meta>`);
    changes.push('Rewrote the book details in EPUB 3 form.');

    for (const item of opf.items()) {
      const fontType = /x-font-truetype|x-font-ttf|font-sfnt/.test(item.mediaType) ? 'font/ttf'
        : /opentype/.test(item.mediaType) ? 'font/otf' : /font-woff2/.test(item.mediaType) ? 'font/woff2' : /font-woff/.test(item.mediaType) ? 'font/woff' : null;
      if (fontType) opf.updateItem(item, { 'media-type': fontType });
      if (item.mediaType === 'application/xhtml+xml' && ctx.epub.has(item.path) && !item.properties.includes('nav')) {
        const html = ctx.epub.text(item.path);
        const props = new Set(item.properties);
        if (/<svg[\s>]/.test(html)) props.add('svg');
        if (/<script[\s>]/.test(html)) props.add('scripted');
        if (/<math[\s>]/.test(html)) props.add('mathml');
        if (props.size !== item.properties.length) opf.updateItem(opf.item(item.id)!, { properties: [...props].join(' ') });
      }
    }
    const cover = opf.coverItem();
    if (cover && !cover.properties.includes('cover-image')) opf.updateItem(cover, { properties: [...cover.properties, 'cover-image'].join(' ') });
    if (!opf.items().some((i) => i.properties.includes('nav'))) changes.push(writeNav(ctx));
    return changes;
  },
};

const toc: Rule = {
  id: 'toc',
  title: 'Table of contents',
  storeMessages: [/table of contents/i, /\btoc\b/i, /navigation/i],
  check(ctx) {
    if (!ctx.opf.version.startsWith('3')) return [];
    const nav = ctx.opf.items().find((i) => i.properties.includes('nav'));
    if (!nav || !ctx.epub.has(nav.path)) return [finding('toc', 'error', 'The book has no EPUB 3 table of contents.', true)];
    const links = (ctx.epub.text(nav.path).match(/<a\b/g) ?? []).length;
    return links ? [] : [finding('toc', 'error', 'The table of contents is empty.', true)];
  },
  fix(ctx) { return [writeNav(ctx)]; },
};

const COPYRIGHT = /(?:copyright|©|\(c\))\s*(?:©\s*)?((?:19|20)\d{2})(?:\s*(?:by|,)?\s*([^.<\n]{2,80}))?/i;

function interiorCopyright(ctx: PrepContext) {
  const spine = spineTexts(ctx);
  const candidates = [...spine.slice(0, 6), ...spine.slice(-2)];
  for (const { html } of candidates) {
    const match = COPYRIGHT.exec(textOf(html));
    if (match) return { year: Number(match[1]), holder: match[2]?.replace(/\s+(all rights reserved|isbn).*$/i, '').trim() };
  }
  return null;
}

const copyrightYear: Rule = {
  id: 'copyright-year',
  title: 'Copyright year',
  storeMessages: [/copyright year/i, /copyright.*mismatch/i],
  check(ctx) {
    const interior = interiorCopyright(ctx);
    const entered = Number(ctx.intake.copyrightYear);
    if (!interior) return [finding('copyright-year', 'warning', 'No copyright page was found in the first or last pages. Add one with the year and holder.')];
    const out: Finding[] = [];
    if (entered && interior.year !== entered) {
      out.push(finding('copyright-year', 'error', `The copyright page says ${interior.year}, but you entered ${entered}. Stores reject a mismatch: change one so they match.`));
      return out;
    }
    const rights = ctx.opf.dc('rights').join(' ');
    const date = ctx.opf.dc('date').join(' ');
    if (!rights.includes(String(interior.year)) || !date.includes(String(interior.year))) {
      out.push(finding('copyright-year', 'warning', `The book details do not carry the copyright year ${interior.year} from the copyright page.`, true));
    }
    return out;
  },
  fix(ctx) {
    const interior = interiorCopyright(ctx)!;
    const holder = interior.holder || ctx.intake.copyrightHolder;
    ctx.opf.setDc('rights', `Copyright © ${interior.year} by ${holder}. All rights reserved.`);
    if (!ctx.opf.dc('date').some((d) => d.includes(String(interior.year)))) ctx.opf.setDc('date', String(interior.year));
    return [`Set the copyright in the book details to ${interior.year}, matching the copyright page.`];
  },
};

function coverPage(ctx: PrepContext, cover: ManifestItem) {
  return ctx.opf.spine().find((i) => ctx.epub.has(i.path) && ctx.epub.text(i.path).includes(relativeHref(i.path.includes('/') ? i.path.slice(0, i.path.lastIndexOf('/')) : '', cover.path)));
}

const coverFrontOnly: Rule = {
  id: 'cover-front-only',
  title: 'Front cover only',
  storeMessages: [/back cover/i, /marketing image/i, /cover.*(spine|wrap)/i],
  check(ctx) {
    const cover = ctx.opf.coverItem();
    if (!cover || !ctx.epub.has(cover.path)) return [finding('cover-front-only', 'error', 'The book has no cover image. Add a front cover.')];
    const size = imageSize(ctx.epub.bytes(cover.path));
    if (!size) return [finding('cover-front-only', 'error', 'The cover must be a JPEG or PNG image.')];
    const out: Finding[] = [];
    if (size.width > size.height * 1.05) out.push(finding('cover-front-only', 'error', `The cover is ${size.width} × ${size.height}, a full print wrap with back cover and spine. eBook covers show the front only.`, true));
    if (ctx.notes.coverCrop === 'right-half') out.push(finding('cover-front-only', 'warning', 'The front panel was estimated as the right half of the wrap. Check the cover, or enter the trim size and page count for an exact crop.'));
    return out;
  },
  fix(ctx) {
    const cover = ctx.opf.coverItem()!;
    const bytes = ctx.epub.bytes(cover.path);
    const raster = decodeImage(bytes);
    const panel = findFrontPanel(raster, ctx.intake.wantsPrint ? ctx.intake : undefined);
    const front = crop(raster, panel.x, panel.y, panel.width, panel.height);
    const png = bytes[0] === 0x89;
    ctx.epub.setBytes(cover.path, png ? encodePng(front) : encodeJpeg(front));
    ctx.notes.coverCrop = panel.method;
    const page = coverPage(ctx, cover);
    if (page) {
      const html = ctx.epub.text(page.path)
        .replace(new RegExp(`viewBox="0 0 ${raster.width} ${raster.height}"`), `viewBox="0 0 ${front.width} ${front.height}"`)
        .replace(new RegExp(`width="${raster.width}"(\\s+)height="${raster.height}"`), `width="${front.width}"$1height="${front.height}"`);
      ctx.epub.setText(page.path, html);
    }
    return [`Cropped the cover from the ${raster.width} × ${raster.height} print wrap to its ${front.width} × ${front.height} front panel (${panel.method === 'background' ? 'found against the background' : panel.method === 'print-spec' ? 'measured from the trim size and page count' : 'estimated'}).`];
  },
};

const coverSize: Rule = {
  id: 'cover-size',
  title: 'Cover size',
  storeMessages: [/cover.*(resolution|size|dimension|pixels)/i],
  check(ctx) {
    const cover = ctx.opf.coverItem();
    if (!cover || !ctx.epub.has(cover.path)) return [];
    const size = imageSize(ctx.epub.bytes(cover.path));
    if (!size || size.width > size.height * 1.05) return [];
    if (size.height < 1000) return [finding('cover-size', 'error', `The cover is ${size.width} × ${size.height}; stores need at least 1000 pixels on the long side. Supply a larger front cover.`)];
    if (size.height < 2560 || size.width < 1600) return [finding('cover-size', 'warning', `The cover is ${size.width} × ${size.height}. 1600 × 2560 is recommended so it stays sharp on large screens.`)];
    return [];
  },
};

function encryptedFonts(ctx: PrepContext) {
  if (!ctx.epub.has('META-INF/encryption.xml')) return new Map<string, string>();
  const xml = ctx.epub.text('META-INF/encryption.xml');
  const map = new Map<string, string>();
  for (const block of xml.matchAll(/<(?:enc:)?EncryptedData\b[\s\S]*?<\/(?:enc:)?EncryptedData>/g)) {
    const algorithm = /Algorithm="([^"]+)"/.exec(block[0])?.[1];
    const uri = /URI="([^"]+)"/.exec(block[0])?.[1];
    if (algorithm && uri) map.set(resolvePath('', uri), algorithm);
  }
  return map;
}

function restrictedFonts(ctx: PrepContext) {
  const encrypted = encryptedFonts(ctx);
  const uidId = ctx.opf.uniqueIdentifierId;
  const uid = new RegExp(`<dc:identifier\\b[^>]*id="${uidId}"[^>]*>([^<]*)<`).exec(ctx.opf.xml)?.[1]?.trim() ?? '';
  return ctx.opf.items().filter(isFont).filter((item) => ctx.epub.has(item.path)).flatMap((item) => {
    let bytes: Uint8Array | null = ctx.epub.bytes(item.path);
    const algorithm = encrypted.get(item.path);
    if (algorithm) bytes = deobfuscate(bytes, algorithm, uid);
    const info = bytes ? inspectFont(bytes) : null;
    return info && isRedistributionRestricted(info) ? [{ item, info }] : [];
  });
}

const fonts: Rule = {
  id: 'fonts',
  title: 'Font licences',
  storeMessages: [/font/i],
  check(ctx) {
    return restrictedFonts(ctx).map(({ item, info }) => finding('fonts', 'warning',
      `${info.family || item.href} ${forbidsEmbedding(info) ? 'forbids embedding' : 'is a Microsoft font not licensed for eBook redistribution'}; it is removed and readers' own fonts are used.`, true));
  },
  fix(ctx) {
    const removed = restrictedFonts(ctx);
    const families = new Set<string>();
    for (const { item, info } of removed) {
      ctx.epub.remove(item.path);
      ctx.opf.removeItem(item);
      families.add(info.family || item.href);
    }
    const gone = new Set(removed.map((r) => r.item.path));
    const styleFiles = ctx.opf.items().filter((i) => (i.mediaType === 'text/css' || /html/.test(i.mediaType)) && ctx.epub.has(i.path));
    for (const file of styleFiles) {
      const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';
      const css = ctx.epub.text(file.path);
      const updated = css.replace(/@font-face\s*\{[^}]*\}\s*/g, (rule) => {
        const urls = [...rule.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => resolvePath(dir, m[1]!));
        return urls.some((u) => gone.has(u)) ? '' : rule;
      });
      if (updated !== css) ctx.epub.setText(file.path, updated);
    }
    if (ctx.epub.has('META-INF/encryption.xml')) {
      const xml = ctx.epub.text('META-INF/encryption.xml').replace(/<(?:enc:)?EncryptedData\b[\s\S]*?<\/(?:enc:)?EncryptedData>\s*/g,
        (block) => gone.has(resolvePath('', /URI="([^"]+)"/.exec(block)?.[1] ?? '')) ? '' : block);
      if (/EncryptedData/.test(xml)) ctx.epub.setText('META-INF/encryption.xml', xml); else ctx.epub.remove('META-INF/encryption.xml');
    }
    return [`Removed ${removed.length} restricted font file${removed.length === 1 ? '' : 's'} (${[...families].join(', ')}).`];
  },
};

const BARCODE_IMG = /<img\b[^>]*\balt="[^"]*\bbar ?code\b[^"]*"[^>]*\/?>/gi;

const barcode: Rule = {
  id: 'no-barcode',
  title: 'No print barcode in the eBook',
  storeMessages: [/barcode/i],
  check(ctx) {
    const count = spineTexts(ctx).reduce((n, { html }) => n + (html.match(BARCODE_IMG) ?? []).length, 0);
    return count ? [finding('no-barcode', 'warning', 'The eBook contains a print barcode image; it belongs on the paperback only.', true)] : [];
  },
  fix(ctx) {
    let removed = 0;
    for (const { item, html } of spineTexts(ctx)) {
      const updated = html.replace(BARCODE_IMG, () => { removed += 1; return ''; });
      if (updated !== html) ctx.epub.setText(item.path, updated);
    }
    return [`Removed ${removed} print barcode image${removed === 1 ? '' : 's'} from the pages.`];
  },
};

function packageIsbns(ctx: PrepContext) {
  return [...ctx.opf.xml.matchAll(/<dc:identifier\b([^>]*)>([^<]*)<\/dc:identifier>/g)]
    .map((m) => ({ attrs: m[1]!, value: m[2]!.trim() }))
    .filter((i) => /isbn/i.test(i.attrs + i.value) || /^97[89]\d{10}$/.test(normaliseIsbn(i.value)))
    .map((i) => normaliseIsbn(i.value));
}

const isbn: Rule = {
  id: 'isbn',
  title: 'ISBN',
  storeMessages: [/isbn/i],
  check(ctx) {
    const out: Finding[] = [];
    const inPackage = packageIsbns(ctx);
    for (const value of inPackage) if (!isValidIsbn(value)) out.push(finding('isbn', 'error', `The ISBN ${value} in the book details is not valid.`));
    const ebook = ctx.intake.ebookIsbn ? normaliseIsbn(ctx.intake.ebookIsbn) : inPackage[0];
    const print = ctx.intake.printIsbn ? normaliseIsbn(ctx.intake.printIsbn) : undefined;
    if (ebook && print && ebook === print) out.push(finding('isbn', 'error', 'The eBook and the print edition use the same ISBN. Each format needs its own.'));
    if (ctx.intake.ebookIsbn && isValidIsbn(ctx.intake.ebookIsbn) && inPackage.length && !inPackage.includes(normaliseIsbn(ctx.intake.ebookIsbn))) {
      out.push(finding('isbn', 'warning', `The book details carry ISBN ${inPackage[0]}, but you entered ${normaliseIsbn(ctx.intake.ebookIsbn)}.`, true));
    }
    return out;
  },
  fix(ctx) {
    const value = normaliseIsbn(ctx.intake.ebookIsbn!);
    const uid = ctx.opf.uniqueIdentifierId;
    ctx.opf.xml = ctx.opf.xml.replace(/<dc:identifier\b([^>]*)>([^<]*)<\/dc:identifier>/g, (whole, attrs: string, current: string) => {
      const id = attributes(`<x ${attrs}>`).id;
      const looksIsbn = /isbn/i.test(attrs + current) || /^97[89]\d{10}$/.test(normaliseIsbn(current));
      return looksIsbn && id !== uid ? `<dc:identifier${id ? ` id="${id}"` : ''}>urn:isbn:${value}</dc:identifier>` : whole;
    });
    return [`Set the eBook ISBN in the book details to ${value}.`];
  },
};

const metadata: Rule = {
  id: 'metadata',
  title: 'Book details',
  storeMessages: [/title.*mismatch/i, /author.*mismatch/i, /missing (title|author|language)/i],
  check(ctx) {
    const out: Finding[] = [];
    if (!ctx.opf.dc('title')[0]) out.push(finding('metadata', 'error', 'The book details have no title.', true));
    if (!ctx.opf.dc('creator')[0]) out.push(finding('metadata', 'error', 'The book details have no author.', true));
    if (!ctx.opf.dc('language')[0]) out.push(finding('metadata', 'error', 'The book details have no language.', true));
    const title = (ctx.opf.dc('title')[0] ?? '').toLowerCase();
    if (title && ctx.intake.title && !title.includes(ctx.intake.title.trim().toLowerCase())) {
      out.push(finding('metadata', 'warning', `The file's title "${ctx.opf.dc('title')[0]}" differs from the title you entered. Stores compare them.`));
    }
    const placeholder = spineTexts(ctx).some(({ html }) => /<title>\s*(Unknown|Untitled)\s*<\/title>/i.test(html));
    if (placeholder) out.push(finding('metadata', 'info', 'Some pages carry a placeholder title such as "Unknown".', true));
    return out;
  },
  fix(ctx) {
    const changes: string[] = [];
    if (!ctx.opf.dc('title')[0]) { ctx.opf.setDc('title', ctx.intake.title); changes.push('Added the title to the book details.'); }
    if (!ctx.opf.dc('creator')[0]) { ctx.opf.setDc('creator', ctx.intake.author); changes.push('Added the author to the book details.'); }
    if (!ctx.opf.dc('language')[0]) { ctx.opf.setDc('language', LANGUAGE_CODES[ctx.intake.language] ?? 'en'); changes.push('Added the language to the book details.'); }
    const title = escapeXml(ctx.opf.dc('title')[0] ?? ctx.intake.title);
    let pages = 0;
    for (const { item, html } of spineTexts(ctx)) {
      const updated = html.replace(/<title>\s*(Unknown|Untitled)\s*<\/title>/i, `<title>${title}</title>`);
      if (updated !== html) { ctx.epub.setText(item.path, updated); pages += 1; }
    }
    if (pages) changes.push(`Replaced the placeholder page title on ${pages} page${pages === 1 ? '' : 's'}.`);
    return changes;
  },
};

const fileSize: Rule = {
  id: 'file-size',
  title: 'File size',
  storeMessages: [/file size/i, /too large/i],
  check(ctx) {
    const mb = ctx.epub.totalBytes() / 1024 / 1024;
    if (mb > 100) return [finding('file-size', 'warning', `The book is ${mb.toFixed(0)} MB unpacked. Compress large images; some stores reject files over 100 MB.`)];
    if (mb > 50) return [finding('file-size', 'info', `The book is ${mb.toFixed(0)} MB unpacked. Amazon charges a delivery fee per MB on the 70% royalty plan.`)];
    return [];
  },
};

const ANCHOR_NAME = /<a\b([^>]*?)\sname="([^"]*)"([^>]*)>/g;

const epubcheck: Rule = {
  id: 'epubcheck',
  title: 'EPUBCheck validation',
  storeMessages: [/epubcheck/i, /validation/i, /RSC-\d+|OPF-\d+|HTM-\d+/],
  check(ctx) {
    const groups = new Map<string, { severity: Severity; count: number }>();
    for (const m of ctx.epubcheck) {
      if (m.severity === 'INFO' || m.severity === 'USAGE') continue;
      const key = `${m.code}: ${m.message.replace(/\([^)]*\)/g, '').slice(0, 160)}`;
      const severity: Severity = m.severity === 'WARNING' ? 'warning' : 'error';
      const g = groups.get(key) ?? { severity, count: 0 };
      g.count += 1;
      groups.set(key, g);
    }
    return [...groups].map(([key, g]) => finding('epubcheck', g.severity, `${key}${g.count > 1 ? ` (${g.count}×)` : ''}`,
      /attribute "name" not allowed/.test(key) && spineTexts(ctx).some(({ html }) => /<a\b[^>]*\sname="/.test(html))));
  },
  fix(ctx) {
    let pages = 0;
    for (const { item, html } of spineTexts(ctx)) {
      const updated = html.replace(ANCHOR_NAME, (_w, before: string, name: string, after: string) =>
        /\sid="/.test(before + after) ? `<a${before}${after}>` : `<a${before} id="${name}"${after}>`);
      if (updated !== html) { ctx.epub.setText(item.path, updated); pages += 1; }
    }
    return pages ? [`Replaced obsolete <a name> anchors with ids on ${pages} page${pages === 1 ? '' : 's'}.`] : [];
  },
};

/** Order matters: structure first, then content, then checks that read the result. */
export const RULES: Rule[] = [container, epub3Package, toc, metadata, copyrightYear, isbn, coverFrontOnly, coverSize, fonts, barcode, fileSize, epubcheck];

export function fingerprint(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
