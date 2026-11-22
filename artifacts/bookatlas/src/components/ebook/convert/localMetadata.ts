import type { ManuscriptExcerpt } from './excerpt';

/**
 * Fills the New eBook form from the manuscript without any AI service: instantly, in the browser, so the form
 * works the same when AI is unavailable, slow or rate-limited. AI suggestions, when they arrive, may improve
 * these values; the author's own typing is never replaced.
 */
export interface LocalDetails {
  title?: string;
  subtitle?: string;
  author?: string;
  language?: string;
  description?: string;
  categories?: string[];
  keywords?: string[];
  copyrightHolder?: string;
  copyrightYear?: number;
  authorBio?: string;
}

const STOP: Record<string, string[]> = {
  English: ['the', 'and', 'of', 'to', 'is', 'in', 'that', 'you', 'your', 'it', 'for', 'with', 'this', 'are', 'not', 'what', 'from'],
  Dutch: ['de', 'het', 'een', 'en', 'van', 'is', 'dat', 'niet', 'je', 'jij', 'wat', 'met', 'voor', 'zijn', 'ook'],
  French: ['le', 'la', 'les', 'et', 'des', 'est', 'que', 'pas', 'vous', 'une', 'dans', 'pour', 'qui', 'sur'],
  German: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'zu', 'mit', 'sie', 'ich', 'auf', 'für'],
  Spanish: ['el', 'la', 'los', 'las', 'y', 'es', 'que', 'no', 'una', 'en', 'por', 'para', 'con', 'del'],
  Portuguese: ['o', 'a', 'os', 'as', 'e', 'é', 'que', 'não', 'uma', 'em', 'por', 'para', 'com', 'do', 'da'],
};
const COMMON = new Set([...Object.values(STOP).flat(), 'have', 'will', 'they', 'their', 'there', 'which', 'when', 'were', 'been', 'about', 'into', 'more', 'than', 'them', 'these', 'those', 'only', 'other', 'every', 'because', 'through', 'where', 'while', 'would', 'could', 'should', 'being', 'itself', 'yourself', 'within', 'without', 'chapter', 'part', 'page', 'book', 'also', 'just', 'like', 'even', 'must', 'such', 'each', 'very', 'over', 'after', 'before', 'between', 'under', 'again', 'once', 'here', 'then', 'both', 'same', 'some', 'many', 'much', 'most', 'does', 'done', 'make', 'made', 'come', 'came', 'know', 'what', 'that', 'this', 'with', 'from', 'your', 'have', 'thing', 'things', 'something', 'nothing', 'everything', 'always', 'never', 'still', 'already']);
const INTRO = /^(a note to the reader|note to the reader|introduction|preface|foreword|prologue|about this book|before you begin|why this book)\b/i;
const ABOUT_AUTHOR = /^about the author\b/i;
/** Headings every book has; they say nothing about this one. */
const FRONT_MATTER = /^(dedication|epigraph|(a )?note to the reader|introduction|preface|foreword|prologue|epilogue|acknowledg\w*|(table of )?contents|about the author|references|bibliography|glossary|index|appendix)\b/i;

const words = (text: string): string[] => text.toLowerCase().match(/\p{L}[\p{L}'’-]{2,}/gu) ?? [];
const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max).replace(/[,;:]?\s+\S*$/, '')}…`);

/** The chapter text after a heading line ("## A Note to the Reader"), as paragraphs. */
function section(lines: string[], heading: RegExp) {
  const start = lines.findIndex((l) => l.startsWith('## ') && heading.test(l.slice(3).trim()));
  if (start < 0) return [];
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) { if (l.startsWith('## ')) break; out.push(l); }
  return out;
}

/** Whole sentences up to about `max` characters: a description that ends cleanly. */
function sentencesUpTo(paragraphs: string[], min: number, max: number) {
  let text = '';
  for (const p of paragraphs) {
    if (p.split(/\s+/).length < 8) continue;
    for (const sentence of p.match(/[^.!?]+[.!?]+["”’)]*\s*/g) ?? [p]) {
      if (text.length + sentence.length > max) return text.length >= min ? text.trim() : clip(`${text}${sentence}`, max);
      text += sentence;
    }
    text += ' ';
  }
  return text.trim();
}

function detectLanguage(text: string) {
  const counts = Object.entries(STOP).map(([lang, stop]) => [lang, words(text.slice(0, 5000)).filter((w) => stop.includes(w)).length] as const);
  const [lang, n] = counts.sort((a, b) => b[1] - a[1])[0]!;
  return n >= 10 ? lang : undefined;
}

/** Categories whose distinctive words appear most in the book (the first is the main one). */
function matchCategories(text: string, categories: string[]) {
  const freq = new Map<string, number>();
  for (const w of words(text)) { const stem = w.slice(0, 6); freq.set(stem, (freq.get(stem) ?? 0) + 1); }
  const scored = categories.map((c) => {
    const terms = [...new Set(words(c).filter((w) => w.length >= 4 && !COMMON.has(w)).map((w) => w.slice(0, 6)))];
    const hits = terms.map((t) => freq.get(t) ?? 0);
    return { c, score: hits.filter((h) => h > 0).length * 10 + hits.reduce((a, b) => a + Math.min(b, 30), 0) / Math.max(1, terms.length) };
  }).filter((s) => s.score >= 12).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.c);
}

/** The most frequent distinctive words and heading phrases, as search keywords. */
function keywordsFrom(text: string, headings: string[], title: string) {
  const titleWords = new Set(words(title));
  const freq = new Map<string, number>();
  for (const w of words(text)) if (w.length >= 5 && !COMMON.has(w) && !titleWords.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const phrases = headings.filter((h) => !FRONT_MATTER.test(h.trim())).map((h) => h.replace(/^(part|chapter|decree)\s+[\w.-]+:?\s*/i, '').replace(/^the\s+/i, '').trim())
    .filter((h) => h.length >= 6 && h.length <= 40 && !/[.!?]$/.test(h) && !words(h).every((w) => titleWords.has(w))).slice(0, 3).map((h) => h.toLowerCase());
  const top = [...freq.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).map(([w]) => w);
  return [...new Set([...phrases, ...top])].slice(0, 7);
}

export function localDetails(ex: ManuscriptExcerpt, categories: string[]): LocalDetails {
  const lines = ex.excerpt.split('\n').map((l) => l.trim()).filter(Boolean);
  const front = lines.slice(0, Math.max(0, lines.findIndex((l) => l.startsWith('## ')))).slice(0, 25);
  const plain = lines.filter((l) => !l.startsWith('## ')).join('\n');
  const out: LocalDetails = {};

  const copyright = /(?:copyright|©)\s*(?:©\s*)?(\d{4})\s+(?:by\s+)?([^\n.,;]{2,80})/i.exec(plain.slice(0, 6000));
  if (copyright) { out.copyrightYear = Number(copyright[1]); out.copyrightHolder = copyright[2]!.trim(); }

  // Title page: the first short lines before "by", the copyright line or the first chapter.
  const titleLines = front.filter((l) => l.length <= 160).slice(0, 6);
  const byIndex = titleLines.findIndex((l) => /^by$/i.test(l) || /^by\s+\p{Lu}/u.test(l));
  out.title = ex.known.title || (titleLines[0] && !/copyright|©/i.test(titleLines[0]) ? titleLines[0] : undefined);
  const second = titleLines[1];
  if (second && byIndex !== 1 && !/copyright|©|^by\b/i.test(second) && second !== out.title && second.length <= 160) out.subtitle = second;
  if (ex.known.author) out.author = ex.known.author;
  else if (byIndex >= 0) {
    const byLine = titleLines[byIndex]!;
    out.author = /^by$/i.test(byLine) ? titleLines[byIndex + 1] : byLine.replace(/^by\s+/i, '');
  } else if (out.copyrightHolder) out.author = out.copyrightHolder;

  out.language = ex.known.language || detectLanguage(plain);

  // Description from the book's own introduction, or else its opening chapter.
  const intro = section(lines, INTRO);
  const firstChapter = (() => { const i = lines.findIndex((l) => l.startsWith('## ')); return i >= 0 ? section(lines.slice(i), /.*/) : []; })();
  const description = sentencesUpTo(intro.length ? intro : firstChapter, 150, 1200);
  if (description.length >= 150) out.description = description;

  const about = section(lines, ABOUT_AUTHOR);
  if (about.length) out.authorBio = clip(about.join(' '), 1200);

  const cats = matchCategories(`${plain}\n${ex.headings.join('\n')}`, categories);
  if (cats.length) out.categories = cats;
  const keywords = keywordsFrom(plain, ex.headings, out.title ?? '');
  if (keywords.length) out.keywords = keywords;

  for (const k of Object.keys(out) as (keyof LocalDetails)[]) if (out[k] === undefined || out[k] === '') delete out[k];
  return out;
}
