import React, { useCallback, useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Check, Inbox, Mail, RefreshCw, RotateCcw } from 'lucide-react';
import { useEbookApi, type BookEnquiry } from './ebookApi';

const TOPIC: Record<string, string> = {
  start: 'Start a book', print: 'Print-ready files (€99)', premium: 'Premium with cover (€249)', ebook: 'Sell my eBook',
  audiobook: 'Audiobook', question: 'Question', help: 'Help',
};

/**
 * Messages from the "Start my book" form (owner request 2026-11-18), for administrators on the Publish page.
 * Answer by email (the reply link fills in the subject), then mark the enquiry answered.
 */
export function EnquiriesInbox() {
  const api = useEbookApi();
  const [items, setItems] = useState<BookEnquiry[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'new' | 'answered'>('new');

  const load = useCallback(async () => {
    setError('');
    try { setItems(await api.enquiries()); } catch (e) { setError(e instanceof Error ? e.message : 'The enquiries could not be loaded.'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void load(); }, [load]);

  const mark = async (e: BookEnquiry, answered: boolean) => {
    try {
      const next = await api.setEnquiryAnswered(e.id, answered);
      setItems((list) => list?.map((x) => (x.id === e.id ? next : x)) ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update the enquiry.'); }
  };

  const shown = (items ?? []).filter((e) => e.status === tab);
  const newCount = (items ?? []).filter((e) => e.status === 'new').length;
  const reply = (e: BookEnquiry) => `mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.title || TOPIC[e.topic] || 'Your BooksAtlas enquiry'}`)}`;

  return (
    <section aria-labelledby="enquiries-inbox" className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="enquiries-inbox" className="flex items-center gap-2 font-serif text-lg font-bold text-slate-900">
          <Inbox className="h-5 w-5 text-amber-600" aria-hidden />Book enquiries
          {newCount > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">{newCount} new</span>}
        </h2>
        <button type="button" onClick={() => void load()} aria-label="Refresh enquiries" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-amber-100 hover:text-slate-900 cursor-pointer"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <p className="mt-1 text-xs text-slate-600">Messages from “Start my book” and the contact buttons. Reply by email, then mark them answered. They are deleted after 12 months.</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800 ring-1 ring-inset ring-rose-200">{error}</p>}
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as 'new' | 'answered')} className="mt-3">
        <Tabs.List aria-label="Enquiries" className="inline-flex rounded-full bg-slate-100 p-1">
          {(['new', 'answered'] as const).map((t) => (
            <Tabs.Trigger key={t} value={t} className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm cursor-pointer">
              {t === 'new' ? 'To answer' : 'Answered'}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value={tab} className="mt-3 space-y-3 focus-visible:outline-none">
          {items === null && !error && <p className="text-xs text-slate-500">Loading…</p>}
          {items !== null && shown.length === 0 && <p className="text-xs text-slate-500">{tab === 'new' ? 'Nothing to answer.' : 'No answered enquiries yet.'}</p>}
          {shown.map((e) => (
            <article key={e.id} className="rounded-xl border border-slate-200 bg-white p-3.5 text-[13px] text-slate-700">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-900">{e.name} <span className="font-normal text-slate-500">· {e.email}</span></p>
                <time dateTime={e.createdAt} className="text-[11px] text-slate-500">{new Date(e.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</time>
              </div>
              <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">{TOPIC[e.topic] ?? e.topic}</span>
                {e.title && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">“{e.title}”</span>}
                {e.formats.map((f) => <span key={f} className="rounded-full bg-slate-100 px-2 py-0.5 capitalize text-slate-700">{f}</span>)}
                {e.trimSize && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{e.trimSize}</span>}
                {e.paper && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{e.paper} paper</span>}
                {e.pages && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{e.pages} pages</span>}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{e.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={reply(e)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-700"><Mail className="h-3.5 w-3.5" />Reply by email</a>
                {e.status === 'new'
                  ? <button type="button" onClick={() => void mark(e, true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"><Check className="h-3.5 w-3.5" />Mark answered</button>
                  : <button type="button" onClick={() => void mark(e, false)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" />Move back to answer</button>}
              </div>
            </article>
          ))}
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}
