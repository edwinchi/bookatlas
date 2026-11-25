import { strFromU8, unzipSync } from 'fflate';

/**
 * Your own text (Reading Intelligence phase 2, 2026-11-25): a pasted text or a file (TXT, Markdown, HTML, EPUB, Word
 * or PDF) turned into paragraphs for Fast Read, the speed check and bold word starts. It all happens in the browser:
 * nothing is uploaded.
 */

export const MAX_FILE_MB = 40;
export const MAX_WORDS = 120_000;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };
export const decodeEntities = (t: string) => t
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

/** Paragraphs from plain text: blank lines separate paragraphs; single line breaks inside one are joined. */
export function paragraphsFromText(text: string) {
  return text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.replace(/^#{1,6}\s+/, '').replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
}

/** Paragraphs from HTML or XHTML: headings, paragraphs, list items and quotes, in order; scripts and styles left out. */
export function paragraphsFromHtml(html: string) {
  const body = html.replace(/<head[\s\S]*?<\/head>/i, '').replace(/<(script|style|nav|aside|footer)[\s\S]*?<\/\1>/gi, '');
  const out: string[] = [];
  // Innermost blocks only (a list item or quote that holds paragraphs gives its paragraphs), in page order.
  const blocks = [
    ...[...body.matchAll(/<(p|h[1-6]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)].filter((m) => !/<(p|h[1-6])\b/i.test(m[2]!)).map((m) => ({ at: m.index ?? 0, inner: m[2]! })),
    ...[...body.matchAll(/<div\b[^>]*>((?:(?!<\/?(?:div|p|h[1-6]|li|ul|ol|blockquote)\b)[\s\S])*?)<\/div>/gi)].map((m) => ({ at: m.index ?? 0, inner: m[1]! })),
  ].sort((x, y) => x.at - y.at);
  for (const b of blocks) {
    const t = decodeEntities(b.inner.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (t) out.push(t);
  }
  return out.length ? out : paragraphsFromText(decodeEntities(body.replace(/<[^>]+>/g, '\n')));
}

/** The chapters of an EPUB in reading order (the spine), as paragraphs. */
export function paragraphsFromEpub(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  const read = (path: string) => (files[path] ? strFromU8(files[path]!) : '');
  const opfPath = /full-path="([^"]+)"/.exec(read('META-INF/container.xml'))?.[1] ?? '';
  const opf = read(opfPath);
  if (!opf) throw new Error('This EPUB could not be read.');
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const manifest = new Map([...opf.matchAll(/<item\b[^>]*>/gi)].map((m) => [/\bid="([^"]+)"/.exec(m[0])?.[1], /href="([^"]+)"/.exec(m[0])?.[1]]));
  const title = decodeEntities(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opf)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '');
  const out: string[] = [];
  for (const m of opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/gi)) {
    const href = manifest.get(m[1]!);
    if (href) out.push(...paragraphsFromHtml(read(base + decodeURIComponent(href.split('#')[0]!))));
  }
  return { title, paragraphs: out };
}

export const countWords = (paras: string[]) => paras.reduce((n, p) => n + (p.match(/\S+/g)?.length ?? 0), 0);

/** Keeps at most MAX_WORDS words (whole paragraphs). */
export function capWords(paras: string[]) {
  const out: string[] = [];
  let n = 0;
  for (const p of paras) { const w = p.match(/\S+/g)?.length ?? 0; if (n + w > MAX_WORDS) break; out.push(p); n += w; }
  return { paragraphs: out, cut: out.length < paras.length };
}

/** Reads a file into a title and paragraphs. Word and PDF use the same converter as book uploads. */
export async function readOwnFile(file: File): Promise<{ title: string; paragraphs: string[]; cut: boolean }> {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`The file is larger than ${MAX_FILE_MB} MB.`);
  const name = file.name.toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, '');
  let title = base, paragraphs: string[];
  if (name.endsWith('.epub')) { const r = paragraphsFromEpub(new Uint8Array(await file.arrayBuffer())); title = r.title || base; paragraphs = r.paragraphs; }
  else if (name.endsWith('.docx') || name.endsWith('.pdf')) {
    const { readManuscript } = await import('../ebook/convert/convert');
    const m = await readManuscript(file, new Date().getFullYear(), () => undefined);
    paragraphs = m.chapters.flatMap((c) => [c.title, ...paragraphsFromHtml(c.xhtml)].filter(Boolean));
  } else if (name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.xhtml')) paragraphs = paragraphsFromHtml(await file.text());
  else if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) paragraphs = paragraphsFromText(await file.text());
  else throw new Error('Choose a text, EPUB, Word (.docx), PDF or web page (.html) file.');
  if (!paragraphs.length) throw new Error('No text was found in this file.');
  return { title, ...capWords(paragraphs) };
}
