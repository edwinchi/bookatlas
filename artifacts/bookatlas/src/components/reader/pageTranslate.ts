/**
 * Read in your language (2026-11-28): the page on screen, translated, beside the book. The device's own translator
 * is used where the browser has one (free and private); otherwise the page goes to BooksAtlas's translator in as few
 * requests as fit (each request counts once against the reader's daily AI allowance). Tested in pageTranslate.test.ts.
 */

/** The server translates up to 2,000 characters a request; a little is kept for the paragraph breaks. */
export const BATCH_CHARS = 1900;

/** Paragraphs grouped into requests of at most `max` characters, each joined by a blank line. */
export function batchParagraphs(paras: { i: number; text: string }[], max = BATCH_CHARS): { i: number; text: string }[][] {
  const out: { i: number; text: string }[][] = [];
  let cur: { i: number; text: string }[] = [], size = 0;
  for (const p of paras) {
    const text = p.text.trim().slice(0, max);
    if (!text) continue;
    if (cur.length && size + 2 + text.length > max) { out.push(cur); cur = []; size = 0; }
    cur.push({ i: p.i, text });
    size += (cur.length > 1 ? 2 : 0) + text.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

export const joinBatch = (batch: { text: string }[]) => batch.map((p) => p.text).join('\n\n');

/** The translation split back into the batch's paragraphs; when the count does not match, all of it on the first. */
export function splitTranslation(translation: string, batch: { i: number }[]): Record<number, string> {
  const parts = translation.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === batch.length) return Object.fromEntries(batch.map((p, k) => [p.i, parts[k]!]));
  return Object.fromEntries(batch.map((p, k) => [p.i, k === 0 ? translation.trim() : '']));
}

/** The language to offer first: the one chosen before, else the device's, else English (or French for an English book). */
export function firstLanguage(saved: string | null, device: string | undefined, bookLang: string, known: Record<string, string>): string {
  if (saved && known[saved]) return saved;
  const d = (device ?? '').toLowerCase().split('-')[0] ?? '';
  if (known[d] && d !== bookLang) return d;
  return bookLang === 'en' ? 'fr' : 'en';
}
