import type { Chapter } from '@workspace/bookatlas-catalog/types';
import { unpackEpub } from './archive.js';
import { PackageDocument, attributes, decodeEntities, resolvePath } from './opf.js';

/**
 * Reader content made from a prepared EPUB. Nothing from the EPUB's HTML is rendered: pages become
 * plain paragraphs, headings and images, so no script or markup reaches readers.
 */
export interface ReaderContent { chapters: Chapter[]; images: { name: string; path: string; contentType: string; bytes: Uint8Array }[] }

const BLOCK = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'td', 'th', 'dt', 'dd', 'figcaption', 'section', 'article', 'header', 'footer', 'aside', 'tr', 'table', 'ol', 'ul', 'hr']);
const SKIP = new Set(['script', 'style', 'head', 'nav', 'title']);
const IMAGE_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };

type Block = { kind: 'p' } | { kind: 'h'; level: number } | { kind: 'img'; path: string; alt: string };
interface Token { block: Block; text: string }

function tokenize(html: string, dir: string): Token[] {
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const tokens: Token[] = [];
  let buffer = '';
  let heading = 0;
  let skipping = 0;
  const lists: { ordered: boolean; next: number }[] = [];
  let prefix = '';
  const flush = () => {
    const text = decodeEntities(buffer).replace(/\s+/g, ' ').trim();
    if (text) tokens.push({ block: heading ? { kind: 'h', level: heading } : { kind: 'p' }, text: prefix + text });
    buffer = '';
    prefix = '';
  };
  for (const m of body.matchAll(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g)) {
    const token = m[0];
    if (!token.startsWith('<')) { if (!skipping) buffer += token; continue; }
    if (token.startsWith('<!--')) continue;
    const name = /^<\/?\s*([a-z0-9:]+)/i.exec(token)?.[1]?.toLowerCase().replace(/^.*:/, '') ?? '';
    const closing = token.startsWith('</');
    if (SKIP.has(name)) { if (!token.endsWith('/>')) skipping += closing ? -1 : 1; continue; }
    if (skipping) continue;
    if (name === 'br') { buffer += ' '; continue; }
    if (name === 'img' || name === 'image') {
      const a = attributes(token);
      const src = a.src ?? a['xlink:href'] ?? a.href;
      if (src && !/^(data|https?):/i.test(src)) {
        flush();
        tokens.push({ block: { kind: 'img', path: resolvePath(dir, src), alt: (a.alt ?? '').replace(/\s+AI-generated content may be incorrect\.?$/i, '').trim() }, text: '' });
      }
      continue;
    }
    if (!BLOCK.has(name)) continue;
    flush();
    if (/^h[1-6]$/.test(name)) heading = closing ? 0 : Number(name[1]);
    if (name === 'ol' || name === 'ul') {
      if (closing) lists.pop();
      else lists.push({ ordered: name === 'ol', next: Number(attributes(token).start ?? 1) || 1 });
    }
    if (name === 'li' && !closing) {
      const list = lists[lists.length - 1];
      const value = Number(attributes(token).value);
      if (list?.ordered) {
        const n = Number.isInteger(value) && value > 0 ? value : list.next;
        list.next = n + 1;
        prefix = `${n}. `;
      } else {
        prefix = '• ';
      }
    }
  }
  flush();
  return tokens;
}

export function readerContent(epubBytes: Uint8Array, bookTitle: string): ReaderContent {
  const epub = unpackEpub(epubBytes);
  const opf = new PackageDocument(epub);
  const pages = opf.spine().filter((i) => epub.has(i.path) && !i.properties.includes('nav'));
  const docs = pages.map((page) => tokenize(epub.text(page.path), page.path.includes('/') ? page.path.slice(0, page.path.lastIndexOf('/')) : ''));
  const levels = docs.flat().flatMap((t) => (t.block.kind === 'h' ? [t.block.level] : []));
  const chapterLevel = levels.length ? Math.min(...levels) : 0;

  const images = new Map<string, ReaderContent['images'][number]>();
  const imageName = (path: string) => {
    const existing = images.get(path);
    if (existing) return existing.name;
    const ext = (path.split('.').pop() ?? '').toLowerCase();
    const contentType = IMAGE_TYPES[ext];
    if (!contentType || contentType === 'image/svg+xml' || !epub.has(path)) return null;
    const name = `img-${String(images.size + 1).padStart(4, '0')}.${ext === 'jpeg' ? 'jpg' : ext}`;
    images.set(path, { name, path, contentType, bytes: epub.bytes(path) });
    return name;
  };

  const chapters: Chapter[] = [];
  let current: Chapter = { title: bookTitle, content: [] };
  let pendingHeadings: string[] = [];
  const isEmpty = (c: Chapter) => !c.content.length && !c.figures?.length;
  const startChapter = (title: string) => {
    if (isEmpty(current)) {
      // A part title or a heading with nothing under it joins the next chapter's title.
      if (current.title !== bookTitle || chapters.length) pendingHeadings.push(current.title);
    } else {
      chapters.push(current);
    }
    current = { title, content: [] };
    if (pendingHeadings.length) {
      current.content.push(...pendingHeadings);
      current.headings = pendingHeadings.map((_, i) => i);
      pendingHeadings = [];
    }
  };

  for (const tokens of docs) {
    for (let i = 0; i < tokens.length; i += 1) {
      const { block, text } = tokens[i]!;
      if (block.kind === 'h' && block.level === chapterLevel) {
        startChapter(text);
        const next = tokens[i + 1];
        if (next?.block.kind === 'h' && next.block.level > chapterLevel && !current.subtitle) {
          // "Chapter 1" + "Welcome…" reads as "Chapter 1: Welcome…", the reader's chapter style.
          if (/^(chapter|part|book)\s+[\w.-]+$/i.test(text)) {
            const [name, ...rest] = next.text.split(/\s*[—–]\s*/);
            current.title = `${text}: ${name}`;
            if (rest.length) current.subtitle = rest.join(' — ');
          } else {
            current.subtitle = next.text;
          }
          i += 1;
        }
      } else if (block.kind === 'h') {
        (current.headings ??= []).push(current.content.length);
        current.content.push(text);
      } else if (block.kind === 'img') {
        const name = imageName(block.path);
        if (name) (current.figures ??= []).push({ at: current.content.length, src: name, alt: block.alt });
      } else {
        current.content.push(text);
      }
    }
  }
  if (!isEmpty(current)) chapters.push(current);
  // The printed contents page repeats the reader's own contents menu.
  const kept = chapters.filter((c) => !(/^(table of )?contents$/i.test(c.title.trim()) && isMostlyHeadings(c)));
  return { chapters: kept, images: [...images.values()] };
}

const isMostlyHeadings = (c: Chapter) => (c.headings?.length ?? 0) > c.content.length / 2;

/** The free sample: the first chapter with real text, without images (they need a signed-in reader). */
const OPENING = /^(introduction|prologue|preface|foreword)/i;

/**
 * The free preview everyone may read and listen to: the book up to and including its
 * introduction, or, without one, up to and including the first full chapter.
 */
export function previewChapters(chapters: Chapter[]): Chapter[] {
  let end = chapters.slice(0, 5).findIndex((c) => OPENING.test(c.title));
  if (end < 0) end = chapters.findIndex((c) => c.content.length >= 10 && !isMostlyHeadings(c));
  return chapters.slice(0, (end < 0 ? 0 : end) + 1);
}

/** The preview as text for the public catalog; the reader loads its images from the API. */
export function sampleChapters(chapters: Chapter[]): Chapter[] {
  return previewChapters(chapters).map(({ figures: _figures, ...text }) => text);
}
