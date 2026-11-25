import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Popover from '@radix-ui/react-popover';
import { BookOpen, Briefcase, CalendarDays, Check, Copy, GraduationCap, Loader2, LogOut, Plus, School, Search, Trash2, UserMinus, Users, X } from 'lucide-react';
import { useAccount } from '../../auth/AuthContext';
import { useEbookApi, type ClassDetail, type ClassSummary } from '../ebook/ebookApi';
import { ClassQuizzes, DueBadge } from './ClassQuizzes';
import { ClassReportButton } from './ClassReportDialog';
import { STORIES } from './youngReaders';

/** Young readers stories on a class list are stored as "ya.<story id>" (phase 8). */
const isYoung = (id: string) => id.startsWith('ya.');
const bookHref = (id: string) => (isYoung(id) ? `${BASE}reading-intelligence/young-readers?story=${encodeURIComponent(id.slice(3))}` : `${BASE}books/${encodeURIComponent(id)}`);
import { dueState, today } from './classDates';

const BASE = import.meta.env.BASE_URL;
const SIGN_IN = `${BASE}sign-in?redirect_url=${encodeURIComponent(`${BASE}reading-intelligence#schools`)}`;
const item = 'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';
const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 cursor-pointer';
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/** Finds books in the catalogue to add to a reading list. */
function BookPicker({ onPick, exclude }: { onPick: (b: { id: string; title: string }) => void; exclude: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ id: string; title: string; author: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'books' | 'stories'>('books');
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      setBusy(true);
      fetch(`/api/books?search=${encodeURIComponent(q.trim())}&limit=8`, { signal: ctrl.signal }).then((r) => r.json())
        .then((r: { books?: { id: string; title: string; author: string }[] }) => setFound((r.books ?? []).map((b) => ({ id: b.id, title: b.title, author: b.author }))))
        .catch(() => undefined).finally(() => setBusy(false));
    }, 250);
    return () => { window.clearTimeout(t); ctrl.abort(); };
  }, [q]);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild><button type="button" className={`${btn} bg-slate-900 text-white hover:bg-slate-800`} data-testid="add-class-book"><Plus className="h-4 w-4" aria-hidden />Add a book</button></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className="z-[60] w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-slate-900/10">
          <ToggleGroup.Root type="single" value={kind} onValueChange={(v) => v && setKind(v as 'books' | 'stories')} aria-label="What to add" className="mb-2 flex gap-1 rounded-xl bg-slate-100 p-1">
            <ToggleGroup.Item value="books" className={item}>Books</ToggleGroup.Item>
            <ToggleGroup.Item value="stories" className={item} data-testid="pick-stories">Children’s stories</ToggleGroup.Item>
          </ToggleGroup.Root>
          {kind === 'stories' ? (
            <ul className="max-h-72 overflow-y-auto">
              {STORIES.filter((s) => !exclude.includes(`ya.${s.id}`)).map((s) => (
                <li key={s.id}><button type="button" onClick={() => { onPick({ id: `ya.${s.id}`, title: `Young readers · ${s.title}` }); setOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-indigo-50 cursor-pointer" data-testid={`pick-story-${s.id}`}>
                  <span className="text-xl" aria-hidden>{s.picture}</span><span><span className="block text-sm font-semibold text-slate-900">{s.title}</span><span className="block text-xs text-slate-500">Level {s.level} · in 5 languages, read aloud</span></span>
                </button></li>
              ))}
            </ul>
          ) : (<>
          <label className="relative block"><span className="sr-only">Search the bookstore</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, author or topic" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </label>
          <ul className="mt-2 max-h-72 overflow-y-auto">
            {busy && <li className="flex items-center gap-2 px-2 py-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Searching…</li>}
            {!busy && q.trim().length >= 2 && !found.length && <li className="px-2 py-2 text-xs text-slate-500">No books found.</li>}
            {found.filter((b) => !exclude.includes(b.id)).map((b) => (
              <li key={b.id}><button type="button" onClick={() => { onPick({ id: b.id, title: b.title }); setOpen(false); setQ(''); }} className="w-full rounded-xl px-2 py-2 text-left hover:bg-indigo-50 cursor-pointer">
                <span className="block text-sm font-semibold text-slate-900">{b.title}</span><span className="block text-xs text-slate-500">{b.author}</span>
              </button></li>
            ))}
          </ul>
          </>)}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** A small bar for one member's progress in one book. */
const Cell = ({ v }: { v: number }) => (
  <div className="flex items-center gap-2" title={`${v}%`}>
    <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${v >= 98 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${v}%` }} /></div>
    <span className="w-9 text-right text-xs tabular-nums text-slate-600">{v}%</span>
  </div>
);

function ClassView({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const api = useEbookApi();
  const [d, setD] = useState<ClassDetail | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<{ userId: string; name: string } | 'leave' | null>(null);
  const load = useCallback(() => api.classDetail(id).then(setD).catch((e) => setError(errText(e, 'The class could not be loaded.'))), [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  const teacher = d?.role === 'teacher';
  const saveBooks = async (books: string[], due?: Record<string, string>) => { try { await api.setClassBooks(id, books, due); await load(); onChanged(); } catch (e) { setError(errText(e, 'The reading list could not be saved.')); } };
  const setDue = (bookId: string, date: string) => {
    if (!d) return;
    const due = { ...d.due };
    if (date) due[bookId] = date; else delete due[bookId];
    void saveBooks(d.books.map((b) => b.id), due);
  };
  const copy = async () => { if (!d?.inviteCode) return; try { await navigator.clipboard.writeText(d.inviteCode); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* the code is on screen */ } };
  const doConfirm = async () => {
    const c = confirm; setConfirm(null);
    try {
      if (c === 'leave') { await api.leaveClass(id); onChanged(); onClose(); }
      else if (c) { await api.leaveClass(id, c.userId); await load(); onChanged(); }
    } catch (e) { setError(errText(e, 'That did not work. Please retry.')); }
  };
  return (
    <div className="space-y-5" data-testid="class-view">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {!d ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading…</p> : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {teacher && d.inviteCode && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
                <span className="text-xs font-semibold text-amber-900">Invite code</span>
                <span className="font-mono text-lg font-extrabold tracking-widest text-slate-900" data-testid="class-code">{d.inviteCode}</span>
                <button type="button" onClick={() => void copy()} aria-label="Copy the invite code" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-amber-100 cursor-pointer">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>
              </div>
            )}
            {!teacher && <p className="text-sm text-slate-600">Run by {d.teacher}. Your teacher or team lead sees your progress on these books and your reading time this week.</p>}
            <button type="button" onClick={() => setConfirm('leave')} className={`${btn} ml-auto text-rose-700 hover:bg-rose-50`}>{teacher ? <><Trash2 className="h-4 w-4" aria-hidden />Close the {d.kind}</> : <><LogOut className="h-4 w-4" aria-hidden />Leave</>}</button>
          </div>

          <section aria-labelledby="class-books" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 id="class-books" className="text-sm font-bold text-slate-900">Reading list</h4>
              {teacher && <BookPicker exclude={d.books.map((b) => b.id)} onPick={(b) => void saveBooks([...d.books.map((x) => x.id), b.id])} />}
            </div>
            {!d.books.length ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{teacher ? 'Add the books you want the group to read.' : 'No books on the list yet.'}</p> : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {d.books.map((b) => {
                  const due = d.due[b.id];
                  const mine = !teacher && d.rows[0] ? d.rows[0].books[b.id] ?? 0 : null;
                  const late = teacher && due ? d.rows.filter((r) => dueState(due, (r.books[b.id] ?? 0) >= 98) === 'late').length : 0;
                  return (
                    <li key={b.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                        <a href={bookHref(b.id)} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 hover:underline">{b.title}</a>
                        {mine !== null && <Cell v={mine} />}
                        {teacher && <button type="button" onClick={() => void saveBooks(d.books.filter((x) => x.id !== b.id).map((x) => x.id))} aria-label={`Remove ${b.title} from the list`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"><X className="h-4 w-4" /></button>}
                      </div>
                      {teacher ? (
                        <div className="flex flex-wrap items-center gap-2 pl-6">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><CalendarDays className="h-3.5 w-3.5" aria-hidden />Due
                            <input type="date" value={due ?? ''} min={due && due < today() ? due : today()} onChange={(e) => setDue(b.id, e.target.value)} aria-label={`Due date for ${b.title}`} data-testid="book-due"
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </label>
                          {due && <DueBadge date={due} finished={false} />}
                          {late > 0 && <span className="text-[11px] font-bold text-rose-700">{late} not finished</span>}
                        </div>
                      ) : due && <div className="pl-6"><DueBadge date={due} finished={(mine ?? 0) >= 98} /></div>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <ClassQuizzes d={d} onChanged={() => void load()} />

          {teacher && d.totals && (
            <section aria-labelledby="class-progress" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><h4 id="class-progress" className="text-sm font-bold text-slate-900">Progress</h4><ClassReportButton classId={d.id} /></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {[['Members', d.totals.members], ['Read this week', d.totals.activeThisWeek], ['Minutes this week', d.totals.weekMinutes], ['Average progress', `${d.totals.averageProgress}%`], ...(d.totals.quizAverage !== null ? [['Quiz average', `${d.totals.quizAverage}%`]] : [])].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{l}</p><p className="text-xl font-extrabold tabular-nums text-slate-900">{v}</p></div>
                ))}
              </div>
              {!d.rows.length ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No members yet. Share the invite code: members sign in and enter it under Read smarter → Schools and teams.</p> : (
                <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
                  <table className="w-full min-w-[36rem] text-left text-sm" data-testid="class-table">
                    <caption className="sr-only">Each member’s progress on the reading list</caption>
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr><th scope="col" className="px-3 py-2">Member</th>{d.books.map((b) => <th key={b.id} scope="col" className="max-w-[10rem] truncate px-3 py-2" title={b.title}>{b.title}</th>)}{d.quizzes.map((q) => <th key={q.id} scope="col" className="max-w-[8rem] truncate px-3 py-2" title={`Quiz: ${q.chapterTitle}`}>Quiz: {q.chapterTitle}</th>)}<th scope="col" className="px-3 py-2">This week</th><th scope="col" className="px-3 py-2"><span className="sr-only">Remove</span></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {d.rows.map((r) => (
                        <tr key={r.userId}>
                          <th scope="row" className="px-3 py-2 font-semibold text-slate-900">{r.name}<span className="block text-[11px] font-normal text-slate-500">{r.lastRead ? `last read ${new Date(r.lastRead).toLocaleDateString()}` : 'not started'}</span></th>
                          {d.books.map((b) => {
                            const st = r.stories?.[b.id];
                            return <td key={b.id} className="px-3 py-2">{isYoung(b.id) ? (st ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Check className="h-3.5 w-3.5" aria-hidden />{st.right}/{st.total} right</span> : <span className="text-xs text-slate-400">not yet</span>) : <Cell v={r.books[b.id] ?? 0} />}</td>;
                          })}
                          {d.quizzes.map((q) => { const v = r.quizzes[q.id]; return <td key={q.id} className="px-3 py-2 text-xs tabular-nums">{typeof v === 'number' ? <span className={`font-bold ${v >= 80 ? 'text-emerald-700' : v >= 50 ? 'text-slate-800' : 'text-rose-700'}`}>{v}%</span> : <span className="text-slate-400">{q.due && dueState(q.due, false) === 'late' ? 'missed' : 'not yet'}</span>}</td>; })}
                          <td className="px-3 py-2 tabular-nums text-slate-700">{r.weekMinutes} min</td>
                          <td className="px-3 py-2"><button type="button" onClick={() => setConfirm({ userId: r.userId, name: r.name })} aria-label={`Remove ${r.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"><UserMinus className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
      <AlertDialog.Root open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl">
            <AlertDialog.Title className="text-lg font-bold text-slate-900">{confirm === 'leave' ? (teacher ? `Close ${d?.name}?` : `Leave ${d?.name}?`) : `Remove ${confirm ? confirm.name : ''}?`}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-slate-600">{confirm === 'leave' ? (teacher ? 'Every member leaves too, and the reading list is deleted.' : 'Your teacher or team lead no longer sees your progress.') : 'They can join again with the invite code.'}</AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel className={`${btn} text-slate-700 hover:bg-slate-100`}>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action onClick={() => void doConfirm()} className={`${btn} bg-rose-600 text-white hover:bg-rose-500`}>{confirm === 'leave' ? (teacher ? 'Close' : 'Leave') : 'Remove'}</AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

/**
 * Schools and teams (Reading Intelligence phase 3): make a class or a team, share its invite code, set a reading
 * list and follow progress; or join one with a code.
 */
export function SchoolsSection() {
  const { account } = useAccount();
  const api = useEbookApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<ClassSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'class' | 'team'>('class');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { apiRef.current.classes().then(setClasses).catch((e) => setError(errText(e, 'Your classes could not be loaded.'))); }, []);
  useEffect(() => { if (account) load(); }, [account?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!account) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-100 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-indigo-950">Sign in to make a class or team, or to join one with the invite code you were given.</p>
        <a href={SIGN_IN} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-500">Sign in</a>
      </div>
    );
  }
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { const c = await api.createClass({ name, kind }); setCreating(false); setName(''); load(); setOpen(c); } catch (err) { setError(errText(err, 'The class could not be made.')); }
    finally { setBusy(false); }
  };
  const join = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { const c = await api.joinClass(code); setCode(''); load(); setOpen(c); } catch (err) { setError(errText(err, 'Joining did not work.')); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><GraduationCap className="h-4 w-4 text-indigo-600" aria-hidden />Teachers and team leads</p>
          <p className="mt-1 text-sm text-slate-600">Make a class or a team, share its code, pick the books and follow everyone’s progress.</p>
          <button type="button" onClick={() => setCreating(true)} className={`${btn} mt-3 bg-indigo-600 text-white hover:bg-indigo-500`} data-testid="new-class"><Plus className="h-4 w-4" aria-hidden />New class or team</button>
        </div>
        <form onSubmit={join} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Users className="h-4 w-4 text-indigo-600" aria-hidden />Got an invite code?</p>
          <div className="mt-3 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" maxLength={12} aria-label="Invite code" data-testid="join-code"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-base tracking-widest focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            <button type="submit" disabled={busy || code.trim().length < 6} className={`${btn} bg-slate-900 text-white hover:bg-slate-800`}>Join</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Your teacher or team lead will see your progress on the class books and your reading time each week.</p>
        </form>
      </div>

      {classes === null ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading your classes…</p>
        : classes.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="class-list">
            {classes.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpen(c)} className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">{c.kind === 'team' ? <Briefcase className="h-5 w-5" aria-hidden /> : <School className="h-5 w-5" aria-hidden />}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-slate-900">{c.name}</span>
                    <span className="block text-xs text-slate-500">{c.role === 'teacher' ? (c.kind === 'team' ? 'You lead this team' : 'You teach this class') : 'Member'} · {c.members} member{c.members === 1 ? '' : 's'} · {c.books.length} book{c.books.length === 1 ? '' : 's'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

      <Dialog.Root open={creating} onOpenChange={setCreating}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-6 shadow-2xl outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[26rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <div className="flex items-center justify-between"><Dialog.Title className="text-lg font-bold text-slate-900">New class or team</Dialog.Title><Dialog.Close aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close></div>
            <Dialog.Description className="mt-1 text-sm text-slate-500">You get an invite code to share. Add books to the reading list next.</Dialog.Description>
            <form onSubmit={create} className="mt-5 space-y-4">
              <ToggleGroup.Root type="single" value={kind} onValueChange={(v) => v && setKind(v as 'class' | 'team')} aria-label="Kind" className="flex gap-1 rounded-xl bg-slate-100 p-1">
                <ToggleGroup.Item value="class" className={item}><School className="h-4 w-4" aria-hidden />School class</ToggleGroup.Item>
                <ToggleGroup.Item value="team" className={item}><Briefcase className="h-4 w-4" aria-hidden />Team or company</ToggleGroup.Item>
              </ToggleGroup.Root>
              <label className="block text-sm font-bold text-slate-800">Name
                <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoFocus placeholder={kind === 'team' ? 'Leadership reading circle' : 'Year 5 readers'} data-testid="class-name"
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </label>
              <button type="submit" disabled={busy || name.trim().length < 2} className={`${btn} w-full bg-indigo-600 text-white hover:bg-indigo-500`} data-testid="create-class">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}Make it</button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-slate-50 p-6 shadow-2xl outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88dvh] sm:w-[min(56rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3">
              <Dialog.Title className="flex items-center gap-2 text-lg font-bold text-slate-900">{open?.kind === 'team' ? <Briefcase className="h-5 w-5 text-indigo-600" aria-hidden /> : <School className="h-5 w-5 text-indigo-600" aria-hidden />}{open?.name}</Dialog.Title>
              <Dialog.Close aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-200 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">The reading list and progress of this class or team.</Dialog.Description>
            <div className="mt-4">{open && <ClassView id={open.id} onClose={() => setOpen(null)} onChanged={load} />}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
