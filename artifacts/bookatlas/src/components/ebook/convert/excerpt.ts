import { strFromU8, unzipSync } from 'fflate';
import type { ConvertedManuscript } from './convert';
import { textOf } from './structure';

/** What "Fill in with AI" sends: the opening of the book as plain text, its headings, and details in the file. */
export interface ManuscriptExcerpt {
  excerpt: string;
  headings: string[];
  known: { title?: string; author?: string; language?: string };
}

const LIMIT = 14_000;
const LANG_NAMES: Record<string, string> = { en: 'English', nl: 'Dutch', fr: 'French', de: 'German', es: 'Spanish', pt: 'Portuguese', sw: 'Swahili', yo: 'Yoruba', ig: 'Igbo', ha: 'Hausa', zu: 'Zulu', am: 'Amharic', ar: 'Arabic' };

/** Paragraph breaks survive so the model sees the title page and copyright page as separate lines. */
const withBreaks = (html: string) => html.replace(/<\/(p|h[1-6]|li|div)>|<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ').split('\n').map((l) => textOf(l)).filter(Boolean).join('\n');

/** From a Word or PDF manuscript already converted in the browser. */
export function excerptFromManuscript(m: ConvertedManuscript): ManuscriptExcerpt {
  let excerpt = '';
  for (const ch of m.chapters) {
    if (excerpt.length >= LIMIT) break;
    excerpt += `${ch.title ? `\n\n## ${ch.title}\n` : ''}${withBreaks(ch.xhtml)}\n`;
  }
  return { excerpt: excerpt.trim().slice(0, LIMIT), headings: m.chapters.map((c) => c.title).filter(Boolean), known: {} };
}

/** From an EPUB the author chose: the package's title, author and language, and the first spine documents. */
export async function excerptFromEpub(file: File): Promise<ManuscriptExcerpt> {
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const read = (path: string) => (files[path] ? strFromU8(files[path]!) : '');
  const opfPath = /full-path="([^"]+)"/.exec(read('META-INF/container.xml'))?.[1] ?? '';
  const opf = read(opfPath);
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const meta = (tag: string) => { const m = new RegExp(`<dc:${tag}[^>]*>([\\s\\S]*?)</dc:${tag}>`, 'i').exec(opf); return m ? textOf(m[1]!) : undefined; };
  const manifest = new Map([...opf.matchAll(/<item\b[^>]*>/gi)].map((m) => [/id="([^"]+)"/.exec(m[0])?.[1], /href="([^"]+)"/.exec(m[0])?.[1]]));
  const spine = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/gi)].map((m) => manifest.get(m[1]!)).filter((h): h is string => !!h);
  let excerpt = '';
  const headings: string[] = [];
  for (const href of spine) {
    const html = read(base + decodeURIComponent(href.split('#')[0]!));
    for (const h of html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)) { const t = textOf(h[1]!); if (t) headings.push(t); }
    if (excerpt.length < LIMIT) excerpt += `${withBreaks(html.replace(/<head[\s\S]*?<\/head>/i, ''))}\n\n`;
  }
  const lang = meta('language')?.toLowerCase().split('-')[0];
  return {
    excerpt: excerpt.trim().slice(0, LIMIT), headings: headings.slice(0, 120),
    known: { title: meta('title'), author: meta('creator'), language: lang ? LANG_NAMES[lang] : undefined },
  };
}

