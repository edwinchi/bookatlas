import { useEffect, useRef, useState } from 'react';
import { Languages, Loader2, X } from 'lucide-react';
import { SelectBox } from '../ui/select-box';
import { LISTEN_LANGUAGES, translateOnDevice } from './listening';
import { batchParagraphs, firstLanguage, joinBatch, splitTranslation } from './pageTranslate';

const LAST_LANG = 'bookatlas:reader-translate-to'; // shared with the reading assistant's translator
const stored = () => { try { return localStorage.getItem(LAST_LANG); } catch { return null; } };

/** The paragraphs of the chapter that are on screen now (page mode or scroll), by their `data-para` index. */
function onScreen(root: HTMLElement | null): number[] {
  if (!root) return [];
  const W = window.innerWidth, H = window.innerHeight, out: number[] = [];
  for (const el of root.querySelectorAll<HTMLElement>('[data-para]')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.right > 8 && r.left < W - 8 && r.bottom > 56 && r.top < H - 56) out.push(Number(el.dataset.para));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/**
 * Read in your language (2026-11-28): the page on screen, translated, in a panel beside the book (a sheet on phones).
 * It follows the page as the reader turns or scrolls. The book's own text and layout are not touched.
 */
export function TranslatePanel({ onClose, root, bookLang, chapterKey, paragraphs, pageKey, signedIn, onSignIn, translate }: {
  onClose: () => void;
  /** The reader's text area, to see which paragraphs are on screen. */
  root: () => HTMLElement | null;
  bookLang: string;
  chapterKey: number;
  paragraphs: string[];
  /** Changes when the page turns. */
  pageKey: string;
  signedIn: boolean;
  onSignIn: () => void;
  /** BooksAtlas's translator, for browsers without one of their own. */
  translate: (text: string, to: string) => Promise<{ translation: string; remaining: number }>;
}) {
  const [lang, setLang] = useState(() => firstLanguage(stored(), navigator.language, bookLang, LISTEN_LANGUAGES));
  const [shown, setShown] = useState<number[]>([]);
  const [, bump] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [via, setVia] = useState<'device' | 'ai' | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const cache = useRef(new Map<string, string>());
  const key = (i: number) => `${chapterKey}:${i}:${lang}`;

  // Which paragraphs are on screen: after each page turn, and while scrolling (settled for a moment).
  useEffect(() => {
    let t = 0;
    const look = () => { window.clearTimeout(t); t = window.setTimeout(() => setShown((was) => { const now = onScreen(root()); return now.join() === was.join() ? was : now; }), 250); };
    look();
    const el = root();
    el?.addEventListener('scroll', look, { capture: true, passive: true });
    window.addEventListener('resize', look);
    return () => { window.clearTimeout(t); el?.removeEventListener('scroll', look, { capture: true }); window.removeEventListener('resize', look); };
  }, [pageKey, chapterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const same = lang === bookLang;
  useEffect(() => {
    if (same) return;
    const missing = shown.filter((i) => paragraphs[i]?.trim() && !cache.current.has(key(i)));
    if (!missing.length) return;
    let live = true;
    (async () => {
      setBusy(true);
      try {
        // The device's translator first: free, private and without a daily limit.
        const first = await translateOnDevice(paragraphs[missing[0]!]!, bookLang, lang);
        if (first !== null) {
          setNote(null);
          cache.current.set(key(missing[0]!), first);
          for (const i of missing.slice(1)) {
            const t = await translateOnDevice(paragraphs[i]!, bookLang, lang);
            if (t !== null) cache.current.set(key(i), t);
            if (!live) return;
          }
          setVia('device'); bump((n) => n + 1);
          return;
        }
        if (!signedIn) { setNote({ tone: 'info', text: 'Sign in to read this page in your language. (Chrome on a computer translates on the device, without an account.)' }); return; }
        setNote(null);
        for (const batch of batchParagraphs(missing.map((i) => ({ i, text: paragraphs[i]! })))) {
          const r = await translate(joinBatch(batch), lang);
          for (const [i, t] of Object.entries(splitTranslation(r.translation, batch))) cache.current.set(`${chapterKey}:${i}:${lang}`, t);
          setRemaining(r.remaining);
          if (!live) return;
          setVia('ai'); bump((n) => n + 1);
        }
      } catch (e) {
        if (live) setNote({ tone: 'error', text: e instanceof Error && e.message ? e.message : 'The translation did not come through. Please try again.' });
      } finally { if (live) setBusy(false); }
    })();
    return () => { live = false; setBusy(false); };
  }, [shown, lang, chapterKey, same]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (v: string) => { setLang(v); try { localStorage.setItem(LAST_LANG, v); } catch { /* this device */ } };
  const lines = shown.map((i) => ({ i, text: cache.current.get(key(i)) })).filter((x) => x.text !== '');

  return (
    <aside aria-label="Read in your language" data-testid="translate-panel"
      className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[48dvh] flex-col rounded-t-2xl border-t border-slate-200 bg-white text-slate-900 shadow-2xl sm:inset-x-auto sm:bottom-16 sm:right-3 sm:top-20 sm:max-h-none sm:w-[26rem] sm:rounded-2xl sm:border">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Languages className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
        <h2 className="flex-1 text-sm font-bold">Read in your language</h2>
        <SelectBox value={lang} onChange={(e) => choose(e.target.value)} aria-label="Language" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold">
          {Object.entries(LISTEN_LANGUAGES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </SelectBox>
        <button type="button" onClick={onClose} aria-label="Close the translation" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" aria-hidden /></button>
      </div>
      <div tabIndex={0} role="region" aria-label="Translation" className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[15px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500" aria-live="polite" lang={lang}>
        {same ? <p className="text-sm text-slate-600">This book is already in {LISTEN_LANGUAGES[lang]}. Choose another language.</p> : (
          <>
            {lines.map((x) => x.text ? <p key={x.i} data-testid="translated-para">{x.text}</p> : null)}
            {busy && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Translating this page…</p>}
            {!busy && !lines.some((x) => x.text) && !note && <p className="text-sm text-slate-600">Turn to a page with text to see it here.</p>}
          </>
        )}
        {note && (
          <p role={note.tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-3 py-2 text-sm ${note.tone === 'error' ? 'bg-rose-50 text-rose-900' : 'bg-indigo-50 text-indigo-950'}`}>
            {note.text}
            {!signedIn && note.tone === 'info' && <button type="button" onClick={onSignIn} className="ml-2 cursor-pointer font-semibold text-indigo-800 underline">Sign in</button>}
          </p>
        )}
      </div>
      {via && !same && (
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-600">
          {via === 'device' ? 'Translated on this device, privately.' : `Translated by AI${remaining !== null ? `: ${remaining} translations left today` : ''}. The book's own words stay on the page.`}
        </p>
      )}
    </aside>
  );
}
