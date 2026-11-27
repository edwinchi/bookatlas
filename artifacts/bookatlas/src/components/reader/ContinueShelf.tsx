import { useEffect, useState } from 'react';
import { BookOpen, Headphones, X } from 'lucide-react';
import { PLACES_EVENT, hideRecent, readRecentBooks, type RecentBook } from './resumePlace';

/**
 * Continue where you left off (2026-11-27): the books started on this device, newest first, on the home page. One tap
 * opens the book at the saved place (and the saved second of audio when it was being listened to). Works signed out;
 * nothing leaves the device.
 */
export function ContinueShelf({ onOpen }: { onOpen: (bookId: string, listen: boolean) => void | Promise<void> }) {
  const [books, setBooks] = useState<RecentBook[]>(() => readRecentBooks());
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => {
    const load = () => setBooks(readRecentBooks());
    window.addEventListener(PLACES_EVENT, load);
    window.addEventListener('storage', load);
    window.addEventListener('focus', load);
    return () => { window.removeEventListener(PLACES_EVENT, load); window.removeEventListener('storage', load); window.removeEventListener('focus', load); };
  }, []);
  if (!books.length) return null;
  const open = (b: RecentBook, listen: boolean) => {
    setOpening(b.id);
    Promise.resolve(onOpen(b.id, listen)).finally(() => setOpening(null));
  };
  return (
    <section aria-labelledby="continue-title" data-testid="continue-shelf" className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 sm:p-5">
      <h2 id="continue-title" className="text-lg font-bold text-slate-900">Continue where you left off</h2>
      <p className="text-xs text-slate-600">Your place is saved on this device, down to the second you stopped listening.</p>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
        {books.map((b) => (
          <li key={b.id} className="relative w-64 shrink-0 snap-start rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <div className="flex gap-3">
              {b.cover
                ? <img src={b.cover} alt="" loading="lazy" className="h-20 w-14 shrink-0 rounded-md object-cover ring-1 ring-slate-200" />
                : <div aria-hidden className="grid h-20 w-14 shrink-0 place-items-center rounded-md bg-indigo-600 text-xl font-bold text-white">{b.title.slice(0, 1)}</div>}
              <div className="min-w-0 flex-1 pr-5">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{b.title}</p>
                {b.author && <p className="truncate text-xs text-slate-600">{b.author}</p>}
                <div className="mt-2 h-1.5 rounded-full bg-slate-200" role="progressbar" aria-label={`${b.title}: ${b.pct}% read`} aria-valuenow={b.pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${Math.max(3, b.pct)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{b.pct}% read</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={opening === b.id} onClick={() => open(b, false)} data-testid="continue-read"
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                <BookOpen className="h-3.5 w-3.5" aria-hidden />{opening === b.id ? 'Opening…' : 'Read'}<span className="sr-only"> {b.title}</span>
              </button>
              <button type="button" disabled={opening === b.id} onClick={() => open(b, true)} data-testid="continue-listen"
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 disabled:opacity-60">
                <Headphones className="h-3.5 w-3.5" aria-hidden />{b.listening ? 'Keep listening' : 'Listen'}<span className="sr-only"> to {b.title}</span>
              </button>
            </div>
            <button type="button" onClick={() => hideRecent(b.id)} aria-label={`Remove ${b.title} from this row`}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
