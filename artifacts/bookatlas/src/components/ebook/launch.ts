import type { SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import { AUTHOR_SHARE } from '../landing/earnings';

/**
 * Launch Score and Smart Pricing (cycle 5b, master.md "unique features"). Pure functions, run live in the
 * browser as the author fills in the form: no AI, no cost. The score rates what stores and readers see first
 * (cover, title, description, categories, keywords, bio, price, file quality) and says what to improve.
 */

export interface LaunchInput {
  intake: SubmissionIntake;
  /** Words in the book, when known (converted manuscript or prepared EPUB). */
  words?: number;
  /** undefined when not known yet (not scored); null when the book has no cover. */
  cover?: { width: number; height: number } | null;
  /** Errors and warnings from preparation, when the book has been prepared. */
  findings?: { errors: number; warnings: number };
}
export interface LaunchCheck { id: string; label: string; points: number; max: number; tip?: string }

const EBOOK_VAT = 0.09;
const NONFICTION = /self-improvement|psychology|business|leadership|non-fiction|science|technology|philosophy|mind mastery|healing|consciousness|metaphysics|spiritual|energy|biography|memoir|history|indigenous|kemetic/i;

/** Suggested price range for the book's length and category (euros incl. VAT). */
export function smartPrice(words: number | undefined, categories: string[]) {
  const w = words ?? 40_000;
  let low: number, mid: number, high: number;
  if (w < 15_000) [low, mid, high] = [0.99, 2.99, 3.99];
  else if (w < 35_000) [low, mid, high] = [2.99, 4.99, 5.99];
  else if (w < 70_000) [low, mid, high] = [4.99, 7.99, 9.99];
  else if (w < 110_000) [low, mid, high] = [6.99, 9.99, 12.99];
  else [low, mid, high] = [7.99, 11.99, 14.99];
  // Practical non-fiction (self-help, business, spiritual guides) sells at a premium over fiction.
  if (categories.some((c) => NONFICTION.test(c))) [low, mid, high] = [low + 1, mid + 1, high + 2];
  const round99 = (x: number) => Math.max(0.99, Math.round(x) - 0.01);
  const perSale = (price: number) => Math.round((price / (1 + EBOOK_VAT)) * AUTHOR_SHARE * 100) / 100;
  const recommended = round99(mid);
  return {
    low: round99(low), recommended, high: round99(high), wordsKnown: !!words,
    earningsPerSale: perSale(recommended),
    /** Copies a month at the recommended price for the author to earn €100. */
    copiesFor100: Math.ceil(100 / perSale(recommended)),
    perSale,
  };
}

const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean);
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
/** "SCROLL OF SOVEREIGNTY" -> "Scroll of Sovereignty". */
export const titleCase = (t: string) => t.toLowerCase().split(/(\s+)/).map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');
const isShouty = (t: string) => t.length > 6 && t === t.toUpperCase() && /[A-Z]{4}/.test(t);

export function launchScore(input: LaunchInput) {
  const { intake } = input;
  const checks: LaunchCheck[] = [];
  const add = (id: string, label: string, max: number, points: number, tip?: string) => checks.push({ id, label, max, points: Math.max(0, Math.min(max, Math.round(points))), tip: points < max ? tip : undefined });

  // Cover: the first thing a reader sees.
  const c = input.cover;
  // undefined: not known yet (an EPUB before preparation), so not scored; null: no cover.
  if (c === undefined) { /* measured after preparation */ }
  else if (!c) add('cover', 'Cover', 20, 0, 'Add a front cover: books without one cannot be published.');
  else if (c.height >= 2560 && c.width >= 1600) add('cover', 'Cover', 20, 20);
  else if (Math.max(c.width, c.height) >= 1000) add('cover', 'Cover', 20, c.height >= 1600 ? 15 : 12, `Your cover is ${c.width} × ${c.height}. Stores accept it, but 1600 × 2560 stays sharp on large screens: upload a larger cover or use "Enlarge to 2560 px" after preparing.`);
  else add('cover', 'Cover', 20, 4, `Your cover is only ${c.width} × ${c.height}; stores need at least 1000 pixels on the long side (2560 is best). Upload a larger cover.`);

  // Title.
  const title = intake.title.trim();
  let t = 10;
  let titleTip: string | undefined;
  if (!title) { t = 0; titleTip = 'Add the title.'; }
  else if (isShouty(title)) { t = 7; titleTip = `Write the title in title case ("${titleCase(title)}") rather than capitals; stores and search engines show it better.`; }
  else if (title.length > 80) { t = 6; titleTip = 'Shorten the title; put extra words in the subtitle.'; }
  if (title && !intake.subtitle?.trim() && intake.categories.some((cat) => NONFICTION.test(cat))) { t -= 2; titleTip = titleTip ?? 'Add a subtitle that says what the reader gains; non-fiction sells better with one.'; }
  add('title', 'Title and subtitle', 10, t, titleTip);

  // Description: the sales page.
  const d = intake.description.trim();
  let ds = 0;
  let dTip = 'Write a description of 600 to 2,000 characters.';
  if (d.length >= 150) {
    ds = 8;
    if (d.length >= 600) ds += 8; else dTip = `Your description has ${d.length} characters; 600 to 2,000 sells better.`;
    const first = sentences(d)[0] ?? '';
    if (first.length > 0 && first.length <= 180) ds += 4; else dTip = 'Open with one short sentence that hooks the reader (under 180 characters).';
    if (/\n\s*\n/.test(d) || d.length < 900) ds += 2; else dTip = 'Break the description into short paragraphs.';
    if (/\byou\b|\byour\b/i.test(d)) ds += 3; else dTip = 'Speak to the reader: say what they will learn, feel or gain ("you").';
    if (/https?:\/\/|www\.|@/.test(d)) { ds -= 5; dTip = 'Remove links and e-mail addresses from the description; stores reject them.'; }
    if (isShouty(d.slice(0, 200))) { ds -= 4; dTip = 'Avoid capitals in the description.'; }
  }
  add('description', 'Description', 25, ds, dTip);

  // Categories and keywords: how readers find the book.
  add('categories', 'Categories', 10, intake.categories.length >= 3 ? 10 : intake.categories.length * 4, intake.categories.length ? `Choose ${3 - intake.categories.length} more categor${3 - intake.categories.length === 1 ? 'y' : 'ies'} so the book appears in more shelves.` : 'Choose one to three categories.');
  const kw = [...new Set(intake.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))];
  const titleWords = new Set(title.toLowerCase().split(/\W+/));
  const fresh = kw.filter((k) => !k.split(/\s+/).every((w) => titleWords.has(w)));
  add('keywords', 'Keywords', 10, Math.min(10, fresh.length * 10 / 6), fresh.length < 6 ? `Use 6 or 7 keywords readers would search for${kw.length > fresh.length ? ', not words already in the title' : ''}, e.g. themes, problems solved, comparable topics.` : undefined);

  // Author bio: trust.
  const bio = intake.authorBio?.trim() ?? '';
  add('bio', 'Author bio', 5, bio.length >= 150 ? 5 : bio.length >= 40 ? 3 : 0, 'Add 2 to 4 sentences about you: why you wrote this book and why readers can trust you.');

  // Price: in the range readers expect for this kind of book.
  const price = Number(intake.price) || 0;
  const sp = smartPrice(input.words, intake.categories);
  const inRange = price >= sp.low && price <= sp.high;
  add('price', 'Price', 10, price === 0 ? 6 : inRange ? 10 : 5, price === 0 ? `Free books reach readers but earn nothing; €${sp.recommended.toFixed(2)} suits this book.` : `Books like this sell best between €${sp.low.toFixed(2)} and €${sp.high.toFixed(2)}; €${sp.recommended.toFixed(2)} is a good start.`);

  // File quality, once prepared.
  const f = input.findings;
  if (f) add('quality', 'File quality', 10, f.errors ? 0 : f.warnings ? 7 : 10, f.errors ? 'Fix the errors in the preparation report before publishing.' : 'Look at the warnings in the preparation report.');

  const max = checks.reduce((n, x) => n + x.max, 0);
  const score = Math.round((checks.reduce((n, x) => n + x.points, 0) / max) * 100);
  const grade = score >= 85 ? 'Ready to launch' : score >= 65 ? 'Nearly there' : 'Needs work';
  const improvements = checks.filter((x) => x.tip).sort((a, b) => (b.max - b.points) - (a.max - a.points))
    .map((x) => ({ id: x.id, label: x.label, gain: Math.round(((x.max - x.points) / max) * 100), tip: x.tip! }));
  return { score, grade, checks, improvements, price: sp };
}
