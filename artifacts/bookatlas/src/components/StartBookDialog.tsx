import React, { useEffect, useId, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { BookOpenCheck, Check, Copy, Loader2, Mail, X } from 'lucide-react';
import { OPERATOR } from './LegalDocument';

/**
 * "Start my book" and the other contact buttons (owner request 2026-11-18). They were mailto links, which do
 * nothing without an email app, so they open this form instead. Any link to `#start-book` or
 * `#enquiry-<topic>` opens it, which also makes it shareable (booksatlas.app/#start-book).
 */
export const TOPICS = [
  { id: 'start', label: 'Start a book' },
  { id: 'print', label: 'Print-ready files (€99)' },
  { id: 'premium', label: 'Premium with cover (€249)' },
  { id: 'ebook', label: 'Sell my eBook' },
  { id: 'audiobook', label: 'Audiobook' },
  { id: 'question', label: 'A question' },
] as const;
export type Topic = typeof TOPICS[number]['id'] | 'help';

/** The link that opens the form on a topic. */
export const enquiryHref = (topic: Topic = 'start') => (topic === 'start' ? '#start-book' : `#enquiry-${topic}`);
/** What a page already knows about the book, filled into the form (e.g. from the dropped manuscript). */
export interface EnquiryPrefill { title?: string; pages?: number; formats?: string[]; trimSize?: string; paper?: string; message?: string }
const PREFILL_EVENT = 'bookatlas:enquiry';
/** Opens the form on a topic with some answers already filled in. */
export const openEnquiry = (topic: Topic, prefill: EnquiryPrefill = {}) =>
  window.dispatchEvent(new CustomEvent(PREFILL_EVENT, { detail: { topic, prefill } }));

const topicFromHash = (hash: string): Topic | null => {
  if (hash === '#start-book') return 'start';
  const m = /^#enquiry-([a-z]+)$/.exec(hash);
  return m && ([...TOPICS.map((t) => t.id), 'help'] as string[]).includes(m[1]!) ? m[1] as Topic : null;
};

const FORMATS = [{ id: 'ebook', label: 'eBook' }, { id: 'paperback', label: 'Paperback' }, { id: 'hardcover', label: 'Hardcover' }, { id: 'audiobook', label: 'Audiobook' }];
const TRIMS = ['5 × 8 in', '5.5 × 8.5 in', '6 × 9 in', '8.5 × 11 in', 'Not sure yet'];
const PAPERS = ['White', 'Cream', 'Not sure yet'];

const field = 'mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30';
const label = 'block text-xs font-semibold text-slate-700';
const chip = 'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 data-[state=on]:border-indigo-600 data-[state=on]:bg-indigo-600 data-[state=on]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

export function StartBookDialog() {
  const [topic, setTopic] = useState<Topic | null>(() => (typeof window === 'undefined' ? null : topicFromHash(window.location.hash)));
  const [form, setForm] = useState({ name: '', email: '', title: '', trimSize: '', paper: '', pages: '', message: '', website: '' });
  const [formats, setFormats] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const id = useId();

  useEffect(() => {
    const onHash = () => { const t = topicFromHash(window.location.hash); if (t) { setTopic(t); setState('idle'); setError(''); } };
    const onPrefill = (e: Event) => {
      const { topic: t, prefill } = (e as CustomEvent<{ topic: Topic; prefill: EnquiryPrefill }>).detail;
      setForm((f) => ({
        ...f, title: prefill.title ?? f.title, trimSize: prefill.trimSize ?? f.trimSize, paper: prefill.paper ?? f.paper,
        pages: prefill.pages ? String(prefill.pages) : f.pages, message: prefill.message ?? f.message,
      }));
      if (prefill.formats) setFormats(prefill.formats);
      setTopic(t); setState('idle'); setError('');
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener(PREFILL_EVENT, onPrefill);
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener(PREFILL_EVENT, onPrefill); };
  }, []);

  const close = () => {
    setTopic(null);
    if (topicFromHash(window.location.hash)) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const print = formats.includes('paperback') || formats.includes('hardcover') || topic === 'print' || topic === 'premium';
  const bookTopic = topic !== 'question' && topic !== 'help';

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setState('sending');
    try {
      const res = await fetch('/api/book-enquiries', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, topic, formats, pages: form.pages ? Number(form.pages) : null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || (res.status === 429 ? 'Too many messages in a minute. Please wait a moment and try again.' : 'Your message could not be sent. Please try again.'));
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your message could not be sent. Please try again.');
      setState('idle');
    }
  }

  const copy = async () => { try { await navigator.clipboard.writeText(OPERATOR.email); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the address is shown */ } };

  return (
    <Dialog.Root open={!!topic} onOpenChange={(o) => { if (!o) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content aria-describedby={`${id}-desc`}
          className="fixed inset-x-0 bottom-0 z-[91] flex max-h-[94dvh] flex-col rounded-t-3xl bg-slate-50 shadow-2xl outline-none data-[state=open]:animate-fade-in sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(40rem,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 pb-4 pt-5 sm:px-6">
            <div>
              <Dialog.Title className="flex items-center gap-2 font-serif text-xl font-bold text-slate-900">
                <BookOpenCheck className="h-5 w-5 text-indigo-600" aria-hidden />{bookTopic ? 'Tell us about your book' : 'Ask us a question'}
              </Dialog.Title>
              <Dialog.Description id={`${id}-desc`} className="mt-1 text-sm text-slate-600">
                {bookTopic ? 'We reply by email with what your book needs and what it costs, before any work starts.' : 'We reply by email.'}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close>
          </div>

          {state === 'sent' ? (
            <div role="status" className="space-y-4 px-5 py-8 text-center sm:px-6">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-7 w-7" /></span>
              <h3 className="font-serif text-lg font-bold text-slate-900">Thank you, we have your message</h3>
              <p className="text-sm text-slate-600">We will reply to <strong className="text-slate-900">{form.email}</strong>. Nothing is charged until you agree to a quote.</p>
              <button type="button" onClick={close} className="h-11 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white hover:bg-slate-700 cursor-pointer">Done</button>
            </div>
          ) : (
            <form onSubmit={send} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6" noValidate={false}>
              <fieldset>
                <legend className={label}>What can we help with?</legend>
                <ToggleGroup.Root type="single" value={topic === 'help' ? 'question' : topic ?? 'start'} onValueChange={(v) => v && setTopic(v as Topic)} className="mt-2 flex flex-wrap gap-2" aria-label="Topic">
                  {TOPICS.map((t) => <ToggleGroup.Item key={t.id} value={t.id} className={chip}>{t.label}</ToggleGroup.Item>)}
                </ToggleGroup.Root>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>Your name<input required autoComplete="name" value={form.name} onChange={set('name')} className={field} /></label>
                <label className={label}>Email for our reply<input required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} className={field} /></label>
              </div>
              {bookTopic && (
                <>
                  <label className={label}>Book title <span className="font-normal text-slate-500">(working title is fine)</span><input value={form.title} onChange={set('title')} className={field} /></label>
                  <fieldset>
                    <legend className={label}>Formats you want</legend>
                    <ToggleGroup.Root type="multiple" value={formats} onValueChange={setFormats} className="mt-2 flex flex-wrap gap-2" aria-label="Formats">
                      {FORMATS.map((f) => <ToggleGroup.Item key={f.id} value={f.id} className={chip}>{f.label}</ToggleGroup.Item>)}
                    </ToggleGroup.Root>
                  </fieldset>
                  {print && (
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <fieldset>
                        <legend className={label}>Trim size</legend>
                        <ToggleGroup.Root type="single" value={form.trimSize} onValueChange={(v) => setForm((f) => ({ ...f, trimSize: v }))} className="mt-2 flex flex-wrap gap-2" aria-label="Trim size">
                          {TRIMS.map((t) => <ToggleGroup.Item key={t} value={t} className={chip}>{t}</ToggleGroup.Item>)}
                        </ToggleGroup.Root>
                      </fieldset>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <fieldset>
                          <legend className={label}>Paper</legend>
                          <ToggleGroup.Root type="single" value={form.paper} onValueChange={(v) => setForm((f) => ({ ...f, paper: v }))} className="mt-2 flex flex-wrap gap-2" aria-label="Paper">
                            {PAPERS.map((p) => <ToggleGroup.Item key={p} value={p} className={chip}>{p}</ToggleGroup.Item>)}
                          </ToggleGroup.Root>
                        </fieldset>
                        <label className={label}>Pages, about<input type="number" inputMode="numeric" min={1} max={4999} value={form.pages} onChange={set('pages')} className={field} /></label>
                      </div>
                    </div>
                  )}
                </>
              )}
              <label className={label}>{bookTopic ? 'About your book' : 'Your question'}
                <textarea required minLength={10} rows={4} value={form.message} onChange={set('message')} className={field}
                  placeholder={bookTopic ? 'Genre, where the manuscript is now (Word, PDF, EPUB), any deadline…' : ''} />
              </label>
              {/* Bots fill in fields people never see. */}
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} name="website" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">{error}</p>}
              <p className="text-[11px] leading-relaxed text-slate-500">We use your details only to reply to you about this enquiry and delete them after 12 months. See the <a href="/privacy" className="underline underline-offset-2">privacy notice</a>.</p>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                  <Mail className="h-3.5 w-3.5" aria-hidden />Prefer email? <a href={`mailto:${OPERATOR.email}`} className="font-semibold text-indigo-700 underline underline-offset-2">{OPERATOR.email}</a>
                  <button type="button" onClick={copy} aria-label="Copy the email address" className="grid h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-slate-200 cursor-pointer">{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button>
                </p>
                <button type="submit" disabled={state === 'sending'} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300 disabled:opacity-60 cursor-pointer">
                  {state === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : 'Send'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
