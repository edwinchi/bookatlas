import { escapeXml } from './epubBuilder';

/**
 * Rebuilds reading order from a PDF's positioned text (pdf.js text items). Pure, so it is unit-tested:
 * items -> lines -> paragraphs and headings, with running headers, footers and page numbers removed.
 */

export interface TextItem { str: string; x: number; y: number; width: number; size: number; bold?: boolean }
export interface PageText { width: number; height: number; items: TextItem[]; images: number }
export interface Line { text: string; x: number; y: number; width: number; size: number; bold: boolean; page: number }
export type Block = { kind: 'p' | 'h1' | 'h2'; text: string; page: number };

/** Group a page's items into lines, top to bottom (PDF y grows upwards). */
export function linesOf(page: PageText, pageNo: number): Line[] {
  const items = page.items.filter((i) => i.str.trim() || i.str === ' ').sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { items: TextItem[]; y: number }[] = [];
  for (const item of items) {
    const tolerance = Math.max(2, item.size * 0.35);
    // Same baseline and similar type size: very different sizes side by side are separate lines.
    const similar = (l: { items: TextItem[] }) => { const s0 = l.items[0]!.size || item.size; return Math.max(s0, item.size) / Math.max(0.1, Math.min(s0, item.size)) < 1.3; };
    const line = lines.find((l) => Math.abs(l.y - item.y) <= tolerance && similar(l));
    if (line) line.items.push(item); else lines.push({ items: [item], y: item.y });
  }
  return lines.map((l) => {
    const parts = l.items.sort((a, b) => a.x - b.x);
    let text = '';
    let end = -Infinity;
    for (const p of parts) {
      // A visible gap between items is a space the PDF did not encode.
      if (text && !text.endsWith(' ') && !p.str.startsWith(' ') && p.x - end > p.size * 0.15) text += ' ';
      text += p.str;
      end = p.x + p.width;
    }
    const sizes = parts.filter((p) => p.str.trim()).map((p) => p.size);
    const textLen = parts.reduce((n, p) => n + p.str.trim().length, 0);
    return {
      text: text.replace(/\s+/g, ' ').trim(), x: parts[0]!.x, y: l.y, width: end - parts[0]!.x,
      size: sizes.length ? Math.max(...sizes) : 0,
      bold: textLen > 0 && parts.filter((p) => p.bold).reduce((n, p) => n + p.str.trim().length, 0) / textLen > 0.6,
      page: pageNo,
    };
  }).filter((l) => l.text);
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)]! : 0; };
const shape = (t: string) => t.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
const PAGE_NUMBER = /^(page\s*)?[-–—]?\s*(\d{1,4}|[ivxlcdm]{1,7})\s*[-–—]?$/i;
const SENTENCE_END = /[.!?…:;"”’)\]]$/;

/** Lines repeated near the top or bottom of many pages (book title, chapter running heads) and page numbers. */
export function chromeFilter(pages: { page: PageText; lines: Line[] }[]) {
  const counts = new Map<string, number>();
  for (const { page, lines } of pages) {
    const seen = new Set<string>();
    for (const l of lines) {
      if (l.y > page.height * 0.9 || l.y < page.height * 0.08) seen.add(shape(l.text));
    }
    for (const s of seen) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const threshold = Math.max(3, pages.length * 0.2);
  return (line: Line, page: PageText) => {
    const edge = line.y > page.height * 0.9 || line.y < page.height * 0.08;
    if (!edge) return true;
    if (PAGE_NUMBER.test(line.text)) return false;
    return (counts.get(shape(line.text)) ?? 0) < threshold;
  };
}

/**
 * Lines to blocks: a heading is clearly larger than body text; a paragraph ends at a wider gap, an
 * indented next line, or a short line ending a sentence. Words hyphenated across lines are rejoined.
 */
export function blocksOf(lines: Line[]): Block[] {
  const body = median(lines.filter((l) => l.text.length > 40).map((l) => l.size)) || median(lines.map((l) => l.size)) || 10;
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const a = lines[i - 1]!, b = lines[i]!;
    if (a.page === b.page && Math.abs(a.size - body) < 1 && Math.abs(b.size - body) < 1) gaps.push(a.y - b.y);
  }
  const lineGap = median(gaps.filter((g) => g > 0)) || body * 1.3;
  const bodyLeft = median(lines.filter((l) => Math.abs(l.size - body) < 1).map((l) => l.x));
  const fullWidth = median(lines.filter((l) => Math.abs(l.size - body) < 1).map((l) => l.width));

  const blocks: Block[] = [];
  let current: { kind: Block['kind']; parts: string[]; page: number; last: Line } | null = null;
  const flush = () => {
    if (current) blocks.push({ kind: current.kind, text: current.parts.join(''), page: current.page });
    current = null;
  };
  for (const line of lines) {
    const ratio = line.size / body;
    // Much larger text is a part or top-level heading; somewhat larger (or a short bold line) a chapter heading.
    let kind: Block['kind'] = 'p';
    if (line.text.length <= 140) {
      if (ratio >= 1.7) kind = 'h1';
      else if (ratio >= 1.25 || (line.bold && ratio >= 1.1 && line.text.length < 80 && !SENTENCE_END.test(line.text))) kind = 'h2';
      // Large type ending a sentence ("Welcome home.", "I AM the Field.") is an emphasised line, not a heading.
      if (kind !== 'p' && /[.!]["”’]?$/.test(line.text)) kind = 'p';
    }
    if (current) {
      const prev: Line = current.last;
      const sameKind = current.kind === kind;
      const newPage = prev.page !== line.page;
      const gap = prev.y - line.y;
      // A heading that wraps keeps its lines together; its own line spacing is larger than the body's.
      const wideGap = !newPage && (kind === 'p' ? gap > lineGap * 1.45 : gap > Math.max(line.size, prev.size) * 1.9);
      const indented = kind === 'p' && line.x - bodyLeft > body * 0.8 && line.x - bodyLeft < fullWidth * 0.3;
      const shortEnd = kind === 'p' && prev.width < fullWidth * 0.82 && SENTENCE_END.test(prev.text);
      const pageBreakEnd = kind === 'p' && newPage && SENTENCE_END.test(prev.text) && /^[A-Z“"‘']/.test(line.text);
      if (!sameKind || wideGap || indented || shortEnd || pageBreakEnd || (kind !== 'p' && newPage)) flush();
    }
    if (!current) { current = { kind, parts: [line.text], page: line.page, last: line }; continue; }
    const c = current as { kind: Block['kind']; parts: string[]; page: number; last: Line };
    const tail = c.parts[c.parts.length - 1]!;
    if (/[A-Za-zÀ-ÿ]-$/.test(tail) && /^[a-zà-ÿ]/.test(line.text)) c.parts[c.parts.length - 1] = tail.slice(0, -1) + line.text;
    else c.parts.push(` ${line.text}`);
    c.last = line;
  }
  flush();
  const clean = blocks.map((b) => ({ ...b, text: b.text.replace(/\s+/g, ' ').trim() })).filter((b) => b.text);
  // "PART TWO" set above its title is one heading: "PART TWO: The Decrees".
  const merged: Block[] = [];
  for (let i = 0; i < clean.length; i += 1) {
    const b = clean[i]!, next = clean[i + 1];
    if (b.kind !== 'p' && next && next.kind !== 'p' && next.page === b.page && /^(part|book|section|chapter|decree)\s+[\w.-]{1,12}:?$/i.test(b.text)) {
      merged.push({ kind: 'h1', text: `${b.text.replace(/:$/, '')}: ${next.text}`, page: b.page });
      i += 1;
    } else merged.push(b);
  }
  return merged;
}

/** Blocks to HTML for the chapter splitter (h1/h2 start chapters). */
export const blocksToHtml = (blocks: Block[]) => blocks.map((b) => `<${b.kind}>${escapeXml(b.text)}</${b.kind}>`).join('\n');

/** A page that is a picture with (almost) no words, such as a cover. */
export const isPicturePage = (page: PageText) => page.images > 0 && page.items.reduce((n, i) => n + (i.str.match(/\S+/g)?.length ?? 0), 0) < 25;
