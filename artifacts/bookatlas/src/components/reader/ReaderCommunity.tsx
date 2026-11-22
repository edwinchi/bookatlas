import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowLeft, Check, Copy, EyeOff, Flag, Flame, Loader2, LogOut, MessageCircle, Plus, Send, Trash2, Users, X } from 'lucide-react';
import type { Chapter } from '../../types';
import type { ChapterSocial, GroupDetail, GroupSummary, useEbookApi } from '../ebook/ebookApi';
import { HIGHLIGHT_BG } from './ReaderNotebook';

import { SelectBox } from '../ui/select-box';
import { useConfirm } from '../ui/confirm';
type Api = ReturnType<typeof useEbookApi>;
export type CommunityTab = 'chapter' | 'groups';

/**
 * Reader Phase 3 (cycle 10): what other readers share about this chapter (popular passages, shared notes) and
 * private reading groups around the book, with chapter discussions behind a spoiler guard.
 */
export function ReaderCommunity(props: {
  api: Api; signedIn: boolean; onSignIn: () => void; bookId: string; bookTitle: string; chapters: Chapter[]; chapterIndex: number;
  social: ChapterSocial | null; socialError: string; onJump: (c: number, p: number) => void; onClose: () => void;
  tab: CommunityTab; onTab: (t: CommunityTab) => void; openGroupId?: string | null;
}) {
  const { api, signedIn, social, chapters, chapterIndex } = props;
  const tabCls = 'flex-1 whitespace-nowrap rounded-full px-2 py-1.5 text-[11px] font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm cursor-pointer';
  const [reported, setReported] = useState<Set<string>>(new Set());
  const { confirm, dialog } = useConfirm();
  const reportNote = async (id: string) => {
    if (!(await confirm({ title: 'Report this note?', body: 'BooksAtlas will review it as spam, abuse or a spoiler.', action: 'Report', destructive: true }))) return;
    await api.report('annotation', id).catch(() => undefined);
    setReported((s) => new Set(s).add(id));
  };

  return (
    <>{dialog}
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl" aria-label="Readers community">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-indigo-600" aria-hidden />Readers</p>
        <button type="button" onClick={props.onClose} aria-label="Close readers panel" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
      </div>
      {!signedIn ? (
        <div className="space-y-3 p-4 text-xs text-slate-600">
          <p>Sign in to see what other readers highlight and share, and to read this book together in a private group.</p>
          <button type="button" onClick={props.onSignIn} className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white cursor-pointer">Sign in</button>
        </div>
      ) : (
        <Tabs.Root value={props.tab} onValueChange={(v) => props.onTab(v as CommunityTab)} className="flex min-h-0 flex-1 flex-col">
          <Tabs.List aria-label="Readers sections" className="mx-4 mt-3 flex gap-1 rounded-full bg-slate-100 p-1">
            <Tabs.Trigger value="chapter" className={tabCls}>This chapter</Tabs.Trigger>
            <Tabs.Trigger value="groups" className={tabCls}>Reading groups</Tabs.Trigger>
          </Tabs.List>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <Tabs.Content value="chapter" className="space-y-4">
              {props.socialError && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">{props.socialError}</p>}
              {!social && !props.socialError && <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading…</p>}
              {social && (
                <>
                  <section aria-label="Popular highlights">
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold"><Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden />Popular highlights</h3>
                    {social.popular.length ? (
                      <ul className="space-y-1.5">
                        {social.popular.map((p) => (
                          <li key={p.paragraphIndex}>
                            <button type="button" onClick={() => props.onJump(chapterIndex, p.paragraphIndex)} className="w-full rounded-lg border border-orange-100 bg-orange-50/60 p-2 text-left text-[11px] hover:bg-orange-50 cursor-pointer">
                              <span className="line-clamp-2 italic text-slate-700">“{chapters[chapterIndex]?.content[p.paragraphIndex]?.slice(0, 180)}”</span>
                              <span className="mt-0.5 block text-[10px] font-semibold text-orange-700">{p.readers} readers highlighted this</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-[11px] text-slate-500">No popular passages in this chapter yet. A passage shows here once 3 readers have highlighted it (no names are shown).</p>}
                  </section>
                  <section aria-label="Readers’ notes">
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold"><MessageCircle className="h-3.5 w-3.5 text-indigo-600" aria-hidden />Readers’ notes</h3>
                    {social.notes.length ? (
                      <ul className="space-y-2">
                        {social.notes.map((n) => (
                          <li key={n.id} className="rounded-xl border border-slate-200 p-2.5 text-[11px]">
                            <button type="button" onClick={() => props.onJump(chapterIndex, n.paragraphIndex)} className={`block w-full rounded-md px-1.5 py-1 text-left italic text-slate-600 cursor-pointer ${n.kind === 'highlight' ? HIGHLIGHT_BG[n.color ?? 'yellow'] : 'bg-slate-50'}`}>
                              <span className="line-clamp-2">“{n.excerpt}”</span>
                            </button>
                            {n.note && <p className="mt-1.5 whitespace-pre-line text-slate-800">{n.note}</p>}
                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                              <span>{n.mine ? 'You' : n.name} · {new Date(n.date).toLocaleDateString('en-GB')}</span>
                              {!n.mine && (reported.has(n.id) ? <span className="text-slate-400">Reported, thank you</span>
                                : <button type="button" onClick={() => void reportNote(n.id)} className="inline-flex items-center gap-1 hover:text-rose-600 cursor-pointer"><Flag className="h-3 w-3" aria-hidden />Report</button>)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-[11px] text-slate-500">Nobody has shared a note on this chapter yet. Share one of yours from the notebook (the “Share” button).</p>}
                  </section>
                </>
              )}
            </Tabs.Content>
            <Tabs.Content value="groups">
              <Groups api={api} bookId={props.bookId} bookTitle={props.bookTitle} chapters={chapters} chapterIndex={chapterIndex} openGroupId={props.openGroupId ?? null} />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      )}
    </aside>
    </>
  );
}

function Groups({ api, bookId, bookTitle, chapters, chapterIndex, openGroupId }: { api: Api; bookId: string; bookTitle: string; chapters: Chapter[]; chapterIndex: number; openGroupId: string | null }) {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [open, setOpen] = useState<string | null>(openGroupId);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api.readingGroups(bookId).then(setGroups).catch((e) => setError(e instanceof Error ? e.message : 'Groups could not be loaded.'));
  useEffect(() => { void load(); }, [bookId]);
  useEffect(() => { if (openGroupId) setOpen(openGroupId); }, [openGroupId]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(false); }
  };

  if (open) return <GroupView api={api} id={open} chapters={chapters} chapterIndex={chapterIndex} onBack={() => { setOpen(null); void load(); }} />;
  return (
    <div className="space-y-4 text-xs">
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">{error}</p>}
      <p className="text-[11px] text-slate-600">Read <b>{bookTitle}</b> together with friends, a book club or a class. Groups are private: only people with the invite link can join.</p>
      {groups === null ? <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading…</p>
        : groups.length ? (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => setOpen(g.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer">
                  <span><span className="block font-bold text-slate-900">{g.name}</span><span className="text-[10px] text-slate-500">{g.members} member{g.members === 1 ? '' : 's'}{g.role === 'owner' ? ' · you started it' : ''}</span></span>
                  <Users className="h-4 w-4 text-indigo-500" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl bg-slate-50 p-3 text-center text-[11px] text-slate-500">You are not in a reading group for this book yet.</p>}
      <form onSubmit={(e) => { e.preventDefault(); void act(async () => { const g = await api.createGroup(bookId, name); setName(''); setOpen(g.id); }); }} className="space-y-1.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
        <label htmlFor="new-group-name" className="text-[11px] font-bold text-slate-800">Start a group</label>
        <div className="flex gap-2">
          <input id="new-group-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={`${bookTitle.slice(0, 40)} readers`}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
          <button type="submit" disabled={busy} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer"><Plus className="h-3 w-3" aria-hidden />Create</button>
        </div>
      </form>
      <form onSubmit={(e) => { e.preventDefault(); void act(async () => { const g = await api.joinGroup(code); setCode(''); setOpen(g.id); }); }} className="space-y-1.5 rounded-xl border border-slate-200 p-3">
        <label htmlFor="join-group-code" className="text-[11px] font-bold text-slate-800">Join with an invite code</label>
        <div className="flex gap-2">
          <input id="join-group-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={10} placeholder="ABCD234XYZ" autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 font-mono tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
          <button type="submit" disabled={busy || code.length !== 10} className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer">Join</button>
        </div>
      </form>
    </div>
  );
}

function GroupView({ api, id, chapters, chapterIndex, onBack }: { api: Api; id: string; chapters: Chapter[]; chapterIndex: number; onBack: () => void }) {
  const { confirm, dialog } = useConfirm();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [about, setAbout] = useState<'chapter' | 'general'>('chapter');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [reported, setReported] = useState<Set<string>>(new Set());
  const load = () => api.readingGroup(id).then(setGroup).catch((e) => setError(e instanceof Error ? e.message : 'The group could not be loaded.'));
  useEffect(() => { void load(); }, [id]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(false); }
  };
  const link = group ? `${window.location.origin}/?join=${group.inviteCode}` : '';
  const chapterName = (c: number) => chapters[c]?.title ?? `Chapter ${c + 1}`;

  if (!group) return (
    <div className="space-y-2 text-xs">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 cursor-pointer"><ArrowLeft className="h-3 w-3" aria-hidden />Groups</button>
      {error ? <p role="alert" className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">{error}</p> : <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading…</p>}
    </div>
  );
  return (
    <div className="space-y-3 text-xs">
      {dialog}
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"><ArrowLeft className="h-3 w-3" aria-hidden />Groups</button>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{group.name}</h3>
        <p className="text-[10px] text-slate-500">{group.memberNames.map((m) => (m.me ? 'You' : m.name)).join(', ')}</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">{error}</p>}
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-600" title={link}>Invite: {group.inviteCode}</span>
        <button type="button" onClick={() => { void navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-800 shadow-xs cursor-pointer">
          {copied ? <Check className="h-3 w-3 text-emerald-600" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}{copied ? 'Copied' : 'Copy invite link'}
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.postToGroup(id, text, about === 'chapter' ? chapterIndex : null); setText(''); await load(); }); }} className="space-y-1.5">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} aria-label="Write to the group" placeholder="What do you think so far?"
          className="w-full rounded-lg border border-slate-200 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
        <div className="flex items-center justify-between gap-2">
          <SelectBox value={about} onChange={(e) => setAbout(e.target.value as 'chapter' | 'general')} aria-label="About"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px]">
            <option value="chapter">About {chapterName(chapterIndex).slice(0, 40)}</option>
            <option value="general">About the whole book (no spoilers)</option>
          </SelectBox>
          <button type="submit" disabled={busy || !text.trim()} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer"><Send className="h-3 w-3" aria-hidden />Post</button>
        </div>
      </form>
      {group.posts.length ? (
        <ul className="space-y-2">
          {group.posts.map((p) => {
            // Spoiler guard: posts about a chapter the reader has not reached stay covered until tapped.
            const ahead = p.chapterIndex !== null && p.chapterIndex > chapterIndex && !p.mine && !revealed.has(p.id);
            return (
              <li key={p.id} className="rounded-xl border border-slate-200 p-2.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span><b className="text-slate-800">{p.mine ? 'You' : p.name}</b> · {p.chapterIndex === null ? 'whole book' : chapterName(p.chapterIndex).slice(0, 30)} · {new Date(p.date).toLocaleDateString('en-GB')}</span>
                  <span className="flex items-center gap-1.5">
                    {!p.mine && (reported.has(p.id) ? <span className="text-slate-400">Reported</span>
                      : <button type="button" aria-label="Report post" onClick={() => { void confirm({ title: 'Report this post?', body: 'BooksAtlas will review it.', action: 'Report', destructive: true }).then((ok) => { if (ok) void api.report('post', p.id).then(() => setReported((s) => new Set(s).add(p.id))).catch(() => undefined); }); }} className="hover:text-rose-600 cursor-pointer"><Flag className="h-3 w-3" /></button>)}
                    {p.canDelete && <button type="button" aria-label="Delete post" onClick={() => void act(async () => { await api.deleteGroupPost(id, p.id); await load(); })} className="hover:text-rose-600 cursor-pointer"><Trash2 className="h-3 w-3" /></button>}
                  </span>
                </div>
                {p.hidden && <p className="mt-1 text-[10px] font-semibold text-rose-700">Hidden after reports; only you can see it.</p>}
                {ahead ? (
                  <button type="button" onClick={() => setRevealed((s) => new Set(s).add(p.id))} className="mt-1.5 flex w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-2 text-left text-[11px] text-slate-600 cursor-pointer">
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />Spoiler: about a chapter you have not reached yet. Tap to read.
                  </button>
                ) : <p className="mt-1.5 whitespace-pre-line text-[12px] text-slate-800">{p.body}</p>}
              </li>
            );
          })}
        </ul>
      ) : <p className="rounded-xl bg-slate-50 p-3 text-center text-[11px] text-slate-500">No posts yet. Start the conversation.</p>}
      <button type="button" disabled={busy}
        onClick={() => { void confirm(group.role === 'owner'
          ? { title: 'Delete this group?', body: 'The group and its whole discussion are deleted for everyone.', action: 'Delete group', destructive: true }
          : { title: 'Leave this group?', body: 'Your posts in it are removed.', action: 'Leave', destructive: true }).then((ok) => { if (ok) void act(async () => { await api.leaveGroup(id); onBack(); }); }); }}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer">
        <LogOut className="h-3 w-3" aria-hidden />{group.role === 'owner' ? 'Delete group' : 'Leave group'}
      </button>
    </div>
  );
}
