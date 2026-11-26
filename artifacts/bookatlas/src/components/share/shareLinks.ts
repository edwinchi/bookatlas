/**
 * Share and invite (phase 10, owner request 2026-11-25): links, messages and quote text for sharing a book or a
 * passage. Pure helpers, tested in shareLinks.test.ts. Book links go to /books/<id>, which the server renders
 * with the title, author and cover, so they show a proper preview in chats and social apps.
 */
export const SITE = 'https://booksatlas.app';

export interface ShareBook { id: string; title: string; author: string }

/** The book's page, marked as a share so the visit can be told apart from search traffic. */
export const bookShareUrl = (id: string, via: 'share' | 'quote' | 'author' = 'share') => `${SITE}/books/${encodeURIComponent(id)}?via=${via}`;

export type ShareMood = 'reading' | 'finished' | 'author';
/** A ready-made message the reader can change before sending. */
export function shareMessage(book: ShareBook, mood: ShareMood): string {
  if (mood === 'author') return `My book “${book.title}” is on BooksAtlas. You can read a free preview and listen to a sample:`;
  if (mood === 'finished') return `I just finished “${book.title}” by ${book.author}. I think you would like it. Read a free preview on BooksAtlas:`;
  return `I’m reading “${book.title}” by ${book.author} on BooksAtlas. Read the free preview with me:`;
}

export type Channel = 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'email';
export const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp' }, { id: 'telegram', label: 'Telegram' }, { id: 'facebook', label: 'Facebook' }, { id: 'x', label: 'X' }, { id: 'email', label: 'Email' },
];
/** The address that opens each app or service with the message and link filled in. */
export function channelUrl(channel: Channel, text: string, url: string, subject = 'A book for you'): string {
  const e = encodeURIComponent;
  switch (channel) {
    case 'whatsapp': return `https://wa.me/?text=${e(`${text} ${url}`)}`;
    case 'telegram': return `https://t.me/share/url?url=${e(url)}&text=${e(text)}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`;
    case 'x': return `https://x.com/intent/post?text=${e(text)}&url=${e(url)}`;
    case 'email': return `mailto:?subject=${e(subject)}&body=${e(`${text}\n\n${url}`)}`;
  }
}

/** A quote of at most `max` characters, cut at a word with "…", without stray quotes or spaces. */
export function quoteText(raw: string, max = 280): string {
  const t = raw.replace(/\s+/g, ' ').trim().replace(/^["“”'‘’]+|["“”'‘’]+$/g, '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.–—-]+$/, '')}…`;
}

/** The quote with where it is from, for copying as text. */
export const quoteForCopy = (quote: string, book: ShareBook, url: string) => `“${quoteText(quote)}”\n— ${book.title}, ${book.author}\n${url}`;

/** Lines of text that fit a width, for drawing the quote card (measure = the width of a piece of text). */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export const QUOTE_THEMES = [
  { id: 'night', label: 'Night', bg: '#1e1b4b', accent: '#fbbf24', text: '#ffffff', muted: '#c7d2fe' },
  { id: 'paper', label: 'Paper', bg: '#fdf6e3', accent: '#9f1239', text: '#1c1917', muted: '#57534e' },
  { id: 'sea', label: 'Sea', bg: '#0f766e', accent: '#fde68a', text: '#ffffff', muted: '#ccfbf1' },
] as const;
export type QuoteTheme = (typeof QUOTE_THEMES)[number];
