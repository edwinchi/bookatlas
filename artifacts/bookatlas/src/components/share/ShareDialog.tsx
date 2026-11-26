import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import {
  CHANNELS, QUOTE_THEMES, bookShareUrl, channelUrl, quoteForCopy, quoteText, shareMessage, wrapLines,
  type ShareBook, type ShareMood, type QuoteTheme,
} from './shareLinks';

const btn = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

function useCopied() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } };
  return { copied, copy };
}

/**
 * Share a book (phase 10): the phone's own share sheet when there is one, else a link to copy and the usual
 * apps; the message can be changed first. Book links show the cover, title and author in chats.
 */
export function ShareBookDialog({ book, mood = 'reading', open, onOpenChange }: { book: ShareBook; mood?: ShareMood; open: boolean; onOpenChange: (o: boolean) => void }) {
  const url = bookShareUrl(book.id, mood === 'author' ? 'author' : 'share');
  const [text, setText] = useState(shareMessage(book, mood));
  useEffect(() => { if (open) setText(shareMessage(book, mood)); }, [open, book.id, mood]); // eslint-disable-line react-hooks/exhaustive-deps
  const { copied, copy } = useCopied();
  const native = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const shareNative = async () => { try { await navigator.share({ title: book.title, text, url }); onOpenChange(false); } catch { /* cancelled */ } };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-slate-950/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[91] mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl outline-none sm:inset-y-0 sm:my-auto sm:h-fit sm:rounded-3xl" data-testid="share-book">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><Share2 className="h-5 w-5 text-indigo-600" aria-hidden />{mood === 'author' ? 'Share your book' : 'Share this book'}</Dialog.Title>
            <Dialog.Close className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Close"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <Dialog.Description className="text-xs text-slate-500">{book.title}{book.author ? ` · ${book.author}` : ''}</Dialog.Description>
          <label className="mt-4 block text-xs font-bold text-slate-700">Your message
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={3} data-testid="share-message"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm font-normal text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
            <span className="min-w-0 flex-1 truncate" data-testid="share-url">{url}</span>
            <button type="button" onClick={() => void copy(`${text} ${url}`)} data-testid="share-copy" className={`${btn} min-h-9 bg-white text-slate-800 ring-1 ring-slate-200`}>{copied ? <><Check className="h-4 w-4 text-emerald-600" aria-hidden />Copied</> : <><Copy className="h-4 w-4" aria-hidden />Copy</>}</button>
          </div>
          {native && <button type="button" onClick={() => void shareNative()} data-testid="share-native" className={`${btn} mt-3 w-full bg-indigo-600 text-white hover:bg-indigo-500`}><Share2 className="h-4 w-4" aria-hidden />Share…</button>}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid="share-channels">
            {CHANNELS.map((c) => (
              <a key={c.id} href={channelUrl(c.id, text, url, book.title)} target={c.id === 'email' ? undefined : '_blank'} rel="noopener noreferrer"
                className={`${btn} min-h-10 bg-slate-100 text-xs text-slate-800 hover:bg-slate-200`}>{c.label}</a>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">The link opens the book’s page with its free preview. Nothing about you is added to it.</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const W = 1080;
/** Draws the quote card (1080 × 1080): the quote, the book and author, and booksatlas.app. */
function drawQuote(canvas: HTMLCanvasElement, quote: string, book: ShareBook, theme: QuoteTheme) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = W; canvas.height = W;
  ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, W, W);
  ctx.fillStyle = theme.accent; ctx.fillRect(90, 110, 90, 10);
  ctx.font = 'bold 150px Georgia, serif'; ctx.fillText('“', 80, 270);
  // The biggest size that fits the quote in the space.
  let size = 60;
  let lines: string[] = [];
  for (; size >= 32; size -= 2) {
    ctx.font = `600 ${size}px Georgia, serif`;
    lines = wrapLines(quote, W - 180, (s) => ctx.measureText(s).width);
    if (lines.length * size * 1.35 <= 560) break;
  }
  ctx.fillStyle = theme.text; ctx.font = `600 ${size}px Georgia, serif`; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, 90, 300 + i * size * 1.35));
  ctx.fillStyle = theme.muted; ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(wrapLines(book.title, W - 180, (s) => ctx.measureText(s).width)[0]!, 90, 900);
  ctx.font = '32px system-ui, sans-serif'; ctx.fillText(book.author, 90, 948);
  ctx.fillStyle = theme.accent; ctx.font = 'bold 30px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('booksatlas.app', W - 90, 948); ctx.textAlign = 'left';
}

/**
 * Share a passage as a quote card (phase 10): a square picture with the quote, the book and the author, ready
 * for chats and social apps, or the text with a link. Quotes are kept short (280 characters), as fair quotation.
 */
export function ShareQuoteDialog({ book, quote, open, onOpenChange }: { book: ShareBook; quote: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [theme, setTheme] = useState<QuoteTheme>(QUOTE_THEMES[0]);
  const [preview, setPreview] = useState('');
  const text = quoteText(quote);
  const url = bookShareUrl(book.id, 'quote');
  const { copied, copy } = useCopied();
  useEffect(() => {
    if (!open) return;
    const c = canvas.current ?? document.createElement('canvas');
    canvas.current = c;
    drawQuote(c, text, book, theme);
    setPreview(c.toDataURL('image/png'));
  }, [open, text, theme, book]);
  const blob = () => new Promise<Blob | null>((res) => canvas.current?.toBlob(res, 'image/png') ?? res(null));
  const fileName = `booksatlas-quote-${book.id}.png`;
  const download = async () => { const b = await blob(); if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName; a.click(); window.setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const [canShareImage, setCanShareImage] = useState(false);
  useEffect(() => {
    try { setCanShareImage(typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })] })); } catch { setCanShareImage(false); }
  }, []);
  const shareImage = async () => {
    const b = await blob(); if (!b) return;
    try { await navigator.share({ files: [new File([b], fileName, { type: 'image/png' })], text: `“${text}” — ${book.title}, ${book.author} ${url}` }); } catch { /* cancelled */ }
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-slate-950/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[91] mx-auto max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl outline-none sm:inset-y-0 sm:my-auto sm:h-fit sm:rounded-3xl" data-testid="share-quote">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><Share2 className="h-5 w-5 text-indigo-600" aria-hidden />Share a quote</Dialog.Title>
            <Dialog.Close className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Close"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">A picture of the quote with the book and author, to share or download.</Dialog.Description>
          {preview && <img src={preview} alt={`“${text}” — ${book.title}, ${book.author}`} className="mt-3 w-full rounded-2xl ring-1 ring-slate-200" data-testid="quote-preview" />}
          <ToggleGroup.Root type="single" value={theme.id} onValueChange={(v) => { const t = QUOTE_THEMES.find((x) => x.id === v); if (t) setTheme(t); }} aria-label="Card colours" className="mt-3 flex gap-2">
            {QUOTE_THEMES.map((t) => (
              <ToggleGroup.Item key={t.id} value={t.id} className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold ring-1 ring-slate-200 data-[state=on]:ring-2 data-[state=on]:ring-indigo-500 cursor-pointer">
                <span className="h-4 w-4 rounded-full ring-1 ring-slate-300" style={{ background: t.bg }} aria-hidden />{t.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {canShareImage
              ? <button type="button" onClick={() => void shareImage()} data-testid="quote-share" className={`${btn} col-span-2 bg-indigo-600 text-white hover:bg-indigo-500`}><Share2 className="h-4 w-4" aria-hidden />Share the picture</button>
              : null}
            <button type="button" onClick={() => void download()} data-testid="quote-download" className={`${btn} bg-slate-900 text-white hover:bg-slate-800`}><Download className="h-4 w-4" aria-hidden />Download</button>
            <button type="button" onClick={() => void copy(quoteForCopy(text, book, url))} data-testid="quote-copy" className={`${btn} bg-slate-100 text-slate-800 hover:bg-slate-200`}>{copied ? <><Check className="h-4 w-4 text-emerald-600" aria-hidden />Copied</> : <><Copy className="h-4 w-4" aria-hidden />Copy text</>}</button>
          </div>
          {quote.replace(/\s+/g, ' ').trim().length > text.length && <p className="mt-2 text-[11px] text-slate-500">Long passages are shortened to 280 characters.</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
