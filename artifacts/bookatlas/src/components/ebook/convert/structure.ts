import type { EpubChapter, EpubImage } from './epubBuilder';

/**
 * Turns a converted manuscript (HTML from Word, or reconstructed from a PDF) into EPUB chapters, and notices
 * what the book already has so nothing is duplicated or contradicted.
 */

export interface ConversionReport {
  source: 'docx' | 'pdf';
  chapters: number;
  words: number;
  images: number;
  coverFound: boolean;
  /** The book has its own copyright page, so none is added. */
  hasCopyrightPage: boolean;
  /** The year on the book's own copyright page, if one was found. */
  copyrightYearInBook: number | null;
  /** Plain-language notes for the author. */
  notes: string[];
}

const decode = (s: string) => s
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
export const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
export const wordCount = (html: string) => (textOf(html).match(/\S+/g) ?? []).length;

/** Make HTML fragments well-formed XHTML for EPUB: void elements closed, named entities numeric. */
export function toXhtml(html: string) {
  return html
    .replace(/<(img|br|hr)\b([^>]*?)\s*\/?>/gi, '<$1$2/>')
    .replace(/&nbsp;/g, '&#160;')
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/gi, '&amp;')
    // Internal Word links (contents, bookmarks) point into other files and would break; keep their text.
    .replace(/<a\b[^>]*href="#[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<a\b[^>]*id="[^"]*"[^>]*>\s*<\/a>/gi, '')
    .replace(/<p>(?:\s|&#160;|<br\/>)*<\/p>/g, '');
}

const CONTENTS = /^(table of )?contents$|^inhoud(sopgave)?$|^table des mati[eè]res$|^inhaltsverzeichnis$|^[íi]ndice$/i;
const COPYRIGHT_YEAR = /(?:copyright|©)\s*(?:©\s*)?(\d{4})/i;

/**
 * Split an HTML manuscript at its h1/h2 headings. Content before the first heading is front matter
 * (title page, copyright page); a typed-in table of contents is dropped because the EPUB has a real one.
 */
export function splitChapters(html: string): { front: string; chapters: EpubChapter[]; droppedContents: boolean } {
  const parts = html.split(/(?=<h[12][\s>])/i);
  const front = /^<h[12][\s>]/i.test(parts[0] ?? '') ? '' : parts.shift() ?? '';
  let droppedContents = false;
  const chapters: EpubChapter[] = [];
  for (const part of parts) {
    const m = /^<h([12])[^>]*>([\s\S]*?)<\/h\1>/i.exec(part);
    if (!m) continue;
    const title = textOf(m[2]!);
    if (CONTENTS.test(title)) { droppedContents = true; continue; }
    // Headings promoted to the chapter title keep their level; deeper ones stay inside the chapter.
    chapters.push({ title: title || 'Untitled', level: m[1] === '1' ? 1 : 2, xhtml: toXhtml(part) });
  }
  return { front, chapters, droppedContents };
}

/** Details the front matter reveals: an existing copyright page and its year. */
export function inspectFront(front: string) {
  const text = textOf(front);
  const year = COPYRIGHT_YEAR.exec(text);
  return { hasCopyrightPage: /copyright|©|all rights reserved/i.test(text), copyrightYearInBook: year ? Number(year[1]) : null };
}

export function finishReport(
  source: ConversionReport['source'], chapters: EpubChapter[], images: EpubImage[], cover: EpubImage | undefined,
  front: ReturnType<typeof inspectFront>, formYear: number, notes: string[],
): ConversionReport {
  const out = [...notes];
  if (front.copyrightYearInBook && front.copyrightYearInBook !== formYear) {
    out.push(`The copyright page inside the book says ${front.copyrightYearInBook}, but the form says ${formYear}. Stores reject a mismatch: change one so they match.`);
  }
  if (!front.hasCopyrightPage) out.push('No copyright page was found, so one was added from your details.');
  if (!cover) out.push('No cover was found in the file. Upload a front cover after preparing; the book cannot be published without one.');
  if (chapters.length <= 1) out.push('No chapter headings were found, so the book is one long chapter. Use Heading 1 and Heading 2 styles for chapters for a better table of contents.');
  return {
    source, chapters: chapters.length, words: chapters.reduce((n, c) => n + wordCount(c.xhtml), 0), images: images.length,
    coverFound: !!cover, hasCopyrightPage: front.hasCopyrightPage, copyrightYearInBook: front.copyrightYearInBook, notes: out,
  };
}
