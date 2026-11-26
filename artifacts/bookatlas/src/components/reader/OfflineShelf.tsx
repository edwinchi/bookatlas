import React, { useEffect, useState } from 'react';
import { BookOpen, CloudOff, HardDriveDownload, Trash2 } from 'lucide-react';
import { formatBytes, offlineBooks, removeOffline, type OfflineBook } from './offlineBooks';

/**
 * Books saved on this device for offline reading (phase 11): what is saved, how much room it takes, open or
 * remove. Saving happens in the reader (menu → Save for offline reading).
 */
export function OfflineShelf({ onOpen }: { onOpen: (b: OfflineBook) => void }) {
  const [books, setBooks] = useState<OfflineBook[] | null>(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const load = () => { void offlineBooks().then(setBooks); };
    load();
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('bookatlas:offline-books', load);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('bookatlas:offline-books', load); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const total = (books ?? []).reduce((n, b) => n + b.bytes, 0);
  return (
    <section aria-labelledby="offline-shelf-title" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" data-testid="offline-shelf">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="offline-shelf-title" className="flex items-center gap-2 text-base font-bold text-slate-900"><HardDriveDownload className="h-5 w-5 text-emerald-600" aria-hidden />Saved for offline reading</h2>
        {!online && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900"><CloudOff className="h-3.5 w-3.5" aria-hidden />You are offline</span>}
      </div>
      {!books ? null : !books.length ? (
        <p className="mt-2 text-sm text-slate-600">No books saved yet. Open a book and choose <b>Save for offline reading</b> in the reader’s menu; it then opens here with no connection, on a plane or underground.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-500">{books.length} book{books.length === 1 ? '' : 's'} on this device · {formatBytes(total)}</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {books.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5" data-testid={`offline-${b.id}`}>
                {b.book.coverImage ? <img src={b.book.coverImage} alt="" className="h-12 w-9 shrink-0 rounded object-cover ring-1 ring-slate-200" /> : <span className="grid h-12 w-9 shrink-0 place-items-center rounded bg-slate-100"><BookOpen className="h-4 w-4 text-slate-400" aria-hidden /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{b.book.title}</span>
                  <span className="block truncate text-xs text-slate-500">{b.book.author} · {formatBytes(b.bytes)}{b.access === 'preview' ? ' · free preview' : ''} · saved {new Date(b.savedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                </span>
                <button type="button" onClick={() => onOpen(b)} className="min-h-10 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer">Read</button>
                <button type="button" onClick={() => void removeOffline(b.id)} aria-label={`Remove ${b.book.title} from this device`} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
