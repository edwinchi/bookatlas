import React, { useEffect, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { BookOpenCheck, Clock, Gauge, Highlighter, Loader2, LineChart, RefreshCw, ShieldCheck, TrendingDown, Users } from 'lucide-react';
import { SelectBox } from '../ui/select-box';
import type { AuthorInsightsData, useEbookApi } from './ebookApi';

function Tile({ icon: Icon, label, value, note }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"><Icon className="h-3.5 w-3.5" aria-hidden />{label}</p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums text-slate-900">{value}</p>
      {note && <p className="text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

/**
 * Reading insights for an author's own books (phase 9): how many read, how far they get, where they stop, how
 * long they read and the passages they highlight most. Aggregates only; nothing before 5 readers.
 */
export function AuthorInsights({ api }: { api: ReturnType<typeof useEbookApi> }) {
  const [data, setData] = useState<AuthorInsightsData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookId, setBookId] = useState('');
  const load = () => { setLoading(true); setError(''); api.authorInsights().then((d) => { setData(d); setBookId((b) => b || d.books[0]?.bookId || ''); }).catch(() => setError('Your reading insights could not be loaded.')).finally(() => setLoading(false)); };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  const book = data?.books.find((b) => b.bookId === bookId) ?? data?.books[0];
  return (
    <section aria-labelledby="author-insights-title" className="space-y-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-sm sm:p-6" data-testid="author-insights">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="author-insights-title" className="flex items-center gap-2 font-serif text-xl font-bold text-slate-900"><LineChart className="h-5 w-5 text-emerald-600" aria-hidden />How readers read your books</h2>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden />Refresh</button>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-600"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />Totals only, never who: figures show from {data?.minReaders ?? 5} readers, and a passage only when at least 3 different readers highlighted it. Your own reading is left out.</p>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {!data && !error && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />Loading…</p>}
      {data && !data.books.length && <p className="text-sm text-slate-600">Publish a book and its reading insights show here.</p>}
      {data && book && (
        <>
          {data.books.length > 1 && (
            <SelectBox value={book.bookId} onChange={(e) => setBookId(e.target.value)} aria-label="Book" className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {data.books.map((b) => <option key={b.bookId} value={b.bookId}>{b.title}</option>)}
            </SelectBox>
          )}
          {!book.enoughReaders ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-slate-200" data-testid="insights-waiting">
              <span className="font-bold">{book.readers} reader{book.readers === 1 ? '' : 's'} so far.</span> Insights for “{book.title}” appear from {data.minReaders} readers, so no single reader can be recognised.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" data-testid="insights-tiles">
                <Tile icon={Users} label="Readers" value={`${book.readers}`} note={`${book.activeLast30} in the last 30 days`} />
                <Tile icon={BookOpenCheck} label="Finished" value={`${book.completionRate}%`} note={`${book.finished} reader${book.finished === 1 ? '' : 's'}`} />
                <Tile icon={TrendingDown} label="Typical reader" value={`${book.medianProgress}%`} note="of the book read (median)" />
                <Tile icon={Clock} label="Reading time" value={book.minutesRead! >= 120 ? `${Math.round(book.minutesRead! / 60)} h` : `${book.minutesRead} min`} note={`${book.minutesPerReader} min per reader`} />
                <Tile icon={Gauge} label="Reading speed" value={book.wordsPerMinute ? `${book.wordsPerMinute}` : '–'} note="words a minute" />
                <Tile icon={Highlighter} label="Highlighted" value={`${book.passages!.length}`} note="passages by 3+ readers" />
              </div>
              <figure className="rounded-2xl bg-white p-4 ring-1 ring-slate-200" data-testid="insights-chapters">
                <figcaption className="text-sm font-bold text-slate-900">How far readers get</figcaption>
                <p className="text-[11px] text-slate-500">The share of readers who reached each chapter.</p>
                {book.biggestDrop && <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-950" data-testid="insights-drop">The biggest drop is before <b>{book.biggestDrop.title}</b>: {book.biggestDrop.drop} percentage points fewer readers reach it than the chapter before. The end of the chapter before may be worth a look.</p>}
                <ol className="mt-3 space-y-1.5">
                  {book.chapters!.map((c) => (
                    <li key={c.index} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-2 text-xs">
                      <span className="truncate text-slate-700" title={c.title}>{c.index + 1}. {c.title}</span>
                      <span className="h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden><span className="block h-full rounded-full bg-emerald-600" style={{ width: `${c.reached}%` }} /></span>
                      <span className="text-right font-bold tabular-nums text-slate-900">{c.reached}%</span>
                    </li>
                  ))}
                </ol>
              </figure>
              <div className="grid gap-3 lg:grid-cols-2">
                <figure className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <figcaption className="text-sm font-bold text-slate-900">Readers each day, last 30 days</figcaption>
                  <Tooltip.Provider>
                    <div className="mt-3 flex h-24 items-end gap-[2px] border-b border-slate-300">
                      {(() => { const max = Math.max(1, ...book.daily!.map((d) => d.readers)); return book.daily!.map((d) => (
                        <Tooltip.Root key={d.day} delayDuration={0}>
                          <Tooltip.Trigger asChild><span className="flex h-full flex-1 items-end"><span className="w-full rounded-t-[3px] bg-emerald-600" style={{ height: `${d.readers ? Math.max(4, (d.readers / max) * 100) : 0}%` }} /></span></Tooltip.Trigger>
                          <Tooltip.Portal><Tooltip.Content side="top" sideOffset={4} className="z-50 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">{new Date(`${d.day}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: {d.readers} reader{d.readers === 1 ? '' : 's'}</Tooltip.Content></Tooltip.Portal>
                        </Tooltip.Root>
                      )); })()}
                    </div>
                  </Tooltip.Provider>
                  <table className="sr-only"><caption>Readers each day</caption><tbody>{book.daily!.map((d) => <tr key={d.day}><th scope="row">{d.day}</th><td>{d.readers}</td></tr>)}</tbody></table>
                </figure>
                <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200" data-testid="insights-passages">
                  <h3 className="text-sm font-bold text-slate-900">Most highlighted passages</h3>
                  {!book.passages!.length ? <p className="mt-2 text-xs text-slate-500">No passage has been highlighted by 3 or more readers yet.</p> : (
                    <ol className="mt-2 space-y-2">{book.passages!.map((p) => (
                      <li key={`${p.chapterIndex}:${p.paragraphIndex}`} className="rounded-xl bg-emerald-50/60 p-2.5 text-xs">
                        <p className="italic text-slate-800">“{p.excerpt}”</p>
                        <p className="mt-1 text-[11px] text-slate-500">Chapter {p.chapterIndex + 1} · highlighted by {p.readers} readers</p>
                      </li>
                    ))}</ol>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
