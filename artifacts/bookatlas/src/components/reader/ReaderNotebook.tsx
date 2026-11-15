import React, { useEffect, useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Bookmark, CloudOff, Cloud, Download, Flame, Globe2, Highlighter, Loader2, NotebookPen, Search, StickyNote, Timer, Trash2, X } from 'lucide-react';
import { ReaderAchievements } from './ReaderAchievements';
import type { Chapter } from '../../types';
import { saveBlob, type Annotation, type ReadingStats, type useEbookApi } from '../ebook/ebookApi';
import { annotationsMarkdown } from './useReaderSync';

const SWATCH: Record<string, string> = { yellow: 'bg-yellow-300', green: 'bg-emerald-300', blue: 'bg-sky-300', pink: 'bg-pink-300', purple: 'bg-violet-300', orange: 'bg-orange-300' };
export const HIGHLIGHT_BG: Record<string, string> = {
  yellow: 'bg-yellow-200/50', green: 'bg-emerald-200/50', blue: 'bg-sky-200/50', pink: 'bg-pink-200/50', purple: 'bg-violet-200/50', orange: 'bg-orange-200/50',
};
export const HIGHLIGHT_COLORS = Object.keys(SWATCH);

type Tab = 'highlights' | 'bookmarks' | 'notes' | 'stats';

/**
 * The reader's notebook (cycle 7): highlights, bookmarks and notes of this book with search, jump, edit, delete
 * and Markdown export; reading statistics; and a note on the current paragraph.
 */
export function ReaderNotebook(props: {
  api: ReturnType<typeof useEbookApi>; signedIn: boolean; status: 'local' | 'loading' | 'synced' | 'offline';
  title: string; author: string; chapters: Chapter[]; annotations: Annotation[];
  current: { chapterIndex: number; paragraphIndex: number };
  onJump: (chapterIndex: number, paragraphIndex: number) => void;
  onAddNote: (note: string) => Promise<void>;
  onUpdate: (id: string, patch: { note?: string; color?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Phase 3: share a highlight or note with other readers of the book. */
  onShare?: (id: string, shared: boolean) => Promise<void>;
  onClose: () => void;
  initialTab?: Tab;
}) {
  const { api, signedIn, status, chapters, annotations, current } = props;
  const [tab, setTab] = useState<Tab>(props.initialTab ?? 'highlights');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<ReadingStats | null>(null);

  useEffect(() => { if (tab === 'stats' && signedIn) api.readingStats().then(setStats).catch(() => setStats(null)); }, [tab, signedIn]);

  const q = query.trim().toLowerCase();
  const of = (kind: Annotation['kind']) => annotations
    .filter((a) => a.kind === kind && (!q || a.excerpt.toLowerCase().includes(q) || (a.note ?? '').toLowerCase().includes(q)))
    .sort((a, b) => a.chapter_index - b.chapter_index || a.paragraph_index - b.paragraph_index);
  const lists = useMemo(() => ({ highlights: of('highlight'), bookmarks: of('bookmark'), notes: of('note') }), [annotations, q]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(false); }
  };
  const exportMd = () => saveBlob(new Blob([annotationsMarkdown(props.title, props.author, chapters, annotations)], { type: 'text/markdown' }), `${props.title.replace(/[^\w-]+/g, '-').slice(0, 60)}-notes.md`);
  const where = (a: Annotation) => `${chapters[a.chapter_index]?.title ?? `Chapter ${a.chapter_index + 1}`} · ¶${a.paragraph_index + 1}`;

  const item = (a: Annotation) => (
    <li key={a.id} className="group rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs">
      <div className="flex items-start gap-2">
        {a.kind === 'highlight' && <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${SWATCH[a.color ?? 'yellow']}`} aria-label={`${a.color} highlight`} />}
        {a.kind === 'bookmark' && <Bookmark className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-indigo-600 text-indigo-600" aria-hidden />}
        {a.kind === 'note' && <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />}
        <button type="button" onClick={() => props.onJump(a.chapter_index, a.paragraph_index)} className="min-w-0 flex-1 text-left cursor-pointer">
          {a.excerpt && <p className="line-clamp-3 italic text-slate-700">“{a.excerpt}”</p>}
          <p className="mt-1 text-[10px] text-slate-500">{where(a)} · {new Date(a.created_at).toLocaleDateString('en-GB')}</p>
        </button>
        {props.onShare && signedIn && a.kind !== 'bookmark' && (
          <button type="button" onClick={() => void act(() => props.onShare!(a.id, !a.shared))} aria-pressed={!!a.shared}
            title={a.shared ? `Shared with other readers as ${a.display_name ?? 'you'}${a.hidden ? ' (hidden after reports)' : ''}. Tap to stop sharing.` : 'Share with other readers of this book (first name and initial)'}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer ${a.shared ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Globe2 className="h-3 w-3" aria-hidden />{a.shared ? 'Shared' : 'Share'}
          </button>
        )}
        <button type="button" onClick={() => void act(() => props.onDelete(a.id))} aria-label="Delete" className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {a.kind === 'highlight' && (
        <div className="mt-2 flex gap-1.5" role="group" aria-label="Highlight colour">
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => void act(() => props.onUpdate(a.id, { color: c }))} aria-label={c} aria-pressed={a.color === c}
              className={`h-4 w-4 rounded-full ${SWATCH[c]} ${a.color === c ? 'ring-2 ring-slate-900 ring-offset-1' : ''} cursor-pointer`} />
          ))}
        </div>
      )}
      {editing === a.id ? (
        <form className="mt-2 space-y-1.5" onSubmit={(e) => { e.preventDefault(); void act(async () => { await props.onUpdate(a.id, { note: editText }); setEditing(null); }); }}>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} maxLength={5000} autoFocus aria-label="Note"
            className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="text-[11px] font-semibold text-slate-500 cursor-pointer">Cancel</button>
            <button type="submit" disabled={busy || (a.kind === 'note' && !editText.trim())} className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer">Save</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => { setEditing(a.id); setEditText(a.note ?? ''); }} className="mt-2 block w-full rounded-lg bg-slate-50 px-2 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-100 cursor-pointer">
          {a.note ? <span className="whitespace-pre-line">{a.note}</span> : <span className="text-slate-400">Add a note…</span>}
        </button>
      )}
    </li>
  );
  const empty = (text: string) => <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">{q ? 'Nothing matches your search.' : text}</p>;
  const tabCls = 'flex-1 whitespace-nowrap rounded-full px-1.5 py-1.5 text-[11px] font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm cursor-pointer';

  return (
    <aside aria-label="Notebook" className="absolute top-16 right-2 z-50 flex max-h-[85vh] w-[420px] max-w-[94vw] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:right-6">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white"><NotebookPen className="h-4 w-4" aria-hidden /></span>
          <div>
            <h3 className="text-sm font-bold leading-tight">Notebook</h3>
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              {status === 'synced' ? <><Cloud className="h-3 w-3 text-emerald-600" aria-hidden />Saved to your account, on every device</>
                : status === 'loading' ? <><Loader2 className="h-3 w-3 animate-spin" aria-hidden />Syncing…</>
                  : status === 'offline' ? <><CloudOff className="h-3 w-3 text-amber-600" aria-hidden />Offline: kept on this device for now</>
                    : <><CloudOff className="h-3 w-3" aria-hidden />Sign in to keep these on every device</>}
            </p>
          </div>
        </div>
        <button type="button" onClick={props.onClose} aria-label="Close notebook" className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
      </div>

      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex min-h-0 flex-1 flex-col">
        <Tabs.List aria-label="Notebook sections" className="mx-4 mt-3 flex gap-1 rounded-full bg-slate-100 p-1">
          <Tabs.Trigger value="highlights" className={tabCls}>Highlights {annotations.filter((a) => a.kind === 'highlight').length || ''}</Tabs.Trigger>
          <Tabs.Trigger value="bookmarks" className={tabCls}>Bookmarks {annotations.filter((a) => a.kind === 'bookmark').length || ''}</Tabs.Trigger>
          <Tabs.Trigger value="notes" className={tabCls}>Notes {annotations.filter((a) => a.kind === 'note').length || ''}</Tabs.Trigger>
          <Tabs.Trigger value="stats" className={tabCls}>Stats</Tabs.Trigger>
        </Tabs.List>

        {tab !== 'stats' && (
          <div className="mx-4 mt-3 flex items-center gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search notes and highlights</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this book's marks"
                className="w-full rounded-full border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
            </label>
            <button type="button" onClick={exportMd} disabled={!annotations.length} title="Export as Markdown"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
              <Download className="h-3.5 w-3.5" aria-hidden />Export
            </button>
          </div>
        )}
        {error && <p role="alert" className="mx-4 mt-2 text-xs font-semibold text-rose-700">{error}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <Tabs.Content value="highlights">
            {lists.highlights.length ? <ul className="space-y-2">{lists.highlights.map(item)}</ul> : empty('Turn on the highlighter in the toolbar and tap a paragraph.')}
          </Tabs.Content>
          <Tabs.Content value="bookmarks">
            {lists.bookmarks.length ? <ul className="space-y-2">{lists.bookmarks.map(item)}</ul> : empty('Tap the bookmark in the toolbar to mark your place.')}
          </Tabs.Content>
          <Tabs.Content value="notes" className="space-y-3">
            <form onSubmit={(e) => { e.preventDefault(); void act(async () => { await props.onAddNote(draft); setDraft(''); }); }} className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <label htmlFor="new-note" className="block text-[11px] font-bold text-amber-900">Note on {chapters[current.chapterIndex]?.title ?? 'this chapter'}, paragraph {current.paragraphIndex + 1}</label>
              <textarea id="new-note" value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={5000} placeholder="Your thoughts, a question, something to try…"
                className="w-full rounded-lg border border-amber-200 bg-white p-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" />
              <div className="flex justify-end"><button type="submit" disabled={busy || !draft.trim()} className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer">Save note</button></div>
            </form>
            {lists.notes.length ? <ul className="space-y-2">{lists.notes.map(item)}</ul> : empty('No notes yet.')}
          </Tabs.Content>
          <Tabs.Content value="stats">
            {!signedIn ? empty('Sign in to see your reading time, speed and streak.')
              : !stats ? <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading…</p>
                : <div className="space-y-5"><ReadingStatsView stats={stats} /><ReaderAchievements api={api} /></div>}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </aside>
  );
}

function ReadingStatsView({ stats }: { stats: ReadingStats }) {
  const max = Math.max(1, ...stats.last30.map((d) => d.minutes));
  const hours = Math.floor(stats.totalMinutes / 60), minutes = stats.totalMinutes % 60;
  const tiles: [React.ReactNode, string, string][] = [
    [<Flame className="h-4 w-4 text-orange-500" aria-hidden />, `${stats.streakDays} day${stats.streakDays === 1 ? '' : 's'}`, 'Reading streak'],
    [<Timer className="h-4 w-4 text-indigo-600" aria-hidden />, hours ? `${hours} h ${minutes} min` : `${minutes} min`, 'Time reading'],
    [<Highlighter className="h-4 w-4 text-amber-500" aria-hidden />, stats.wordsPerMinute ? `${stats.wordsPerMinute} wpm` : '—', 'Average speed'],
    [<Bookmark className="h-4 w-4 text-emerald-600" aria-hidden />, `${stats.booksFinished} of ${stats.booksStarted}`, 'Books finished'],
  ];
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-2">
        {tiles.map(([icon, value, label]) => (
          <li key={label} className="rounded-xl border border-slate-200 p-3">
            {icon}
            <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
            <p className="text-[11px] text-slate-500">{label}</p>
          </li>
        ))}
      </ul>
      <figure>
        <figcaption className="mb-2 text-[11px] font-bold text-slate-700">Minutes read, last 30 days</figcaption>
        <div className="flex h-20 items-end gap-[2px]" role="img" aria-label={`Minutes read per day over the last 30 days; most recent day ${stats.last30.at(-1)?.minutes ?? 0} minutes`}>
          {stats.last30.map((d) => (
            <div key={d.day} title={`${d.day}: ${d.minutes} min`} className="flex-1 rounded-t-[3px] bg-indigo-500/80" style={{ height: `${Math.max(d.minutes ? 6 : 2, (d.minutes / max) * 100)}%`, opacity: d.minutes ? 1 : 0.25 }} />
          ))}
        </div>
      </figure>
      <p className="text-[11px] text-slate-500">{stats.words.toLocaleString('en-GB')} words over {stats.sessions} session{stats.sessions === 1 ? '' : 's'}. Time counts only while you are actively reading.</p>
    </div>
  );
}
