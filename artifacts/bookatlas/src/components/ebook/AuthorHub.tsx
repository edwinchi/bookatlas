import React, { useEffect, useState } from 'react';
import { BookCopy, Download, ExternalLink, FileSpreadsheet, Landmark, Link2, Loader2, ReceiptText, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { EbookApiError, saveBlob, type PayoutInput, type PayoutView, type Submission, type useEbookApi } from './ebookApi';
import { authorPath } from '../AuthorProfileModal';

import { CheckBox, SelectBox } from '../ui/select-box';
/** The header's Author hub items open one of these tiles (event detail = tile id). */
export const OPEN_AUTHOR_HUB_EVENT = 'bookatlas:author-hub';
export type AuthorHubTile = 'books' | 'sales' | 'statements' | 'page' | 'payout';

const COUNTRIES: [string, string][] = [
  ['NL', 'Netherlands'], ['BE', 'Belgium'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'], ['IT', 'Italy'], ['PT', 'Portugal'], ['IE', 'Ireland'],
  ['AT', 'Austria'], ['LU', 'Luxembourg'], ['DK', 'Denmark'], ['SE', 'Sweden'], ['FI', 'Finland'], ['PL', 'Poland'], ['CZ', 'Czechia'], ['GR', 'Greece'],
  ['RO', 'Romania'], ['HU', 'Hungary'], ['SK', 'Slovakia'], ['SI', 'Slovenia'], ['HR', 'Croatia'], ['BG', 'Bulgaria'], ['LT', 'Lithuania'], ['LV', 'Latvia'],
  ['EE', 'Estonia'], ['CY', 'Cyprus'], ['MT', 'Malta'], ['GB', 'United Kingdom'], ['CH', 'Switzerland'], ['NO', 'Norway'], ['CM', 'Cameroon'], ['NG', 'Nigeria'],
  ['GH', 'Ghana'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['US', 'United States'], ['CA', 'Canada'],
];

const lastMonths = (n: number) => Array.from({ length: n }, (_, i) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - i);
  return { value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
});

const tile = 'group flex h-full w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 data-[active=true]:border-indigo-400 data-[active=true]:ring-2 data-[active=true]:ring-indigo-200';
const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

/**
 * Author hub (cycle 6, master.md "Author Dashboard"): the author's books and drafts, sales export, monthly
 * royalty statements, public author page and payout details, in one place at the top of the Publish page.
 */
export function AuthorHub({ api, submissions, onShowBooks }: { api: ReturnType<typeof useEbookApi>; submissions: Submission[] | null; onShowBooks: () => void }) {
  const [active, setActive] = useState<AuthorHubTile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [month, setMonth] = useState(lastMonths(1)[0]!.value);
  const [payout, setPayout] = useState<PayoutView | null>(null);
  const [editing, setEditing] = useState(false);

  const mine = submissions ?? [];
  const published = mine.filter((s) => s.status === 'published');
  const inReview = mine.filter((s) => ['preparing', 'checking', 'ready'].includes(s.status));
  const drafts = mine.filter((s) => ['uploading', 'needs_author', 'rejected'].includes(s.status));
  const authorNames = [...new Set(published.map((s) => s.intake.author).filter(Boolean))];

  useEffect(() => { api.payout().then(setPayout).catch(() => setPayout({ configured: false })); }, []);
  useEffect(() => {
    const open = (e: Event) => {
      const id = String((e as CustomEvent<string>).detail) as AuthorHubTile;
      setActive(id);
      requestAnimationFrame(() => document.getElementById(`author-hub-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      if (id === 'books') onShowBooks();
      if (id === 'payout') setEditing(true);
    };
    window.addEventListener(OPEN_AUTHOR_HUB_EVENT, open);
    return () => window.removeEventListener(OPEN_AUTHOR_HUB_EVENT, open);
  }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setNote('');
    try { await fn(); } catch (e) { setNote(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(null); }
  };
  const downloadCsv = () => run('csv', async () => saveBlob(await api.salesCsv(), `booksatlas-sales-${new Date().toISOString().slice(0, 10)}.csv`));
  const openStatement = () => {
    // Open the tab inside the click so it is not blocked, then fill it.
    const tab = window.open('', '_blank');
    return run('statement', async () => {
      try {
        const url = URL.createObjectURL(new Blob([await api.statementHtml(month)], { type: 'text/html' }));
        if (tab) tab.location.href = url; else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (e) { tab?.close(); throw e; }
    });
  };

  return (
    <section id="author-hub" aria-labelledby="author-hub-title" className="space-y-3 scroll-mt-40">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="author-hub-title" className="font-serif text-xl font-bold text-slate-900">Author hub</h2>
          <p className="text-sm text-slate-600">Your books, sales, statements, author page and payouts.</p>
        </div>
        {note && <p role="alert" className="text-xs font-semibold text-rose-700">{note}</p>}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <li id="author-hub-books">
          <button type="button" data-active={active === 'books'} className={tile} onClick={() => { setActive('books'); onShowBooks(); }}>
            <BookCopy className="h-5 w-5 text-indigo-600" aria-hidden />
            <span className="text-sm font-bold text-slate-900">Books and drafts</span>
            <span className="text-xs text-slate-600">{submissions === null ? 'Loading…' : `${published.length} published · ${inReview.length} in review · ${drafts.length} draft${drafts.length === 1 ? '' : 's'}`}</span>
          </button>
        </li>
        <li id="author-hub-sales">
          <div data-active={active === 'sales'} className={tile}>
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" aria-hidden />
            <span className="text-sm font-bold text-slate-900">Sales and CSV export</span>
            <span className="text-xs text-slate-600">Every sale with date, country, VAT and your 67% share, for Excel or your accountant.</span>
            <button type="button" onClick={() => void downloadCsv()} disabled={busy === 'csv' || !published.length}
              className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer">
              {busy === 'csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}Download CSV
            </button>
          </div>
        </li>
        <li id="author-hub-statements">
          <div data-active={active === 'statements'} className={tile}>
            <ReceiptText className="h-5 w-5 text-amber-600" aria-hidden />
            <span className="text-sm font-bold text-slate-900">Royalty statements</span>
            <label className="sr-only" htmlFor="statement-month">Month</label>
            <SelectBox id="statement-month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
              {lastMonths(24).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </SelectBox>
            <button type="button" onClick={() => void openStatement()} disabled={busy === 'statement' || !published.length}
              className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50 cursor-pointer">
              {busy === 'statement' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ExternalLink className="h-3.5 w-3.5" aria-hidden />}Open statement
            </button>
          </div>
        </li>
        <li id="author-hub-page">
          <div data-active={active === 'page'} className={tile}>
            <Link2 className="h-5 w-5 text-sky-600" aria-hidden />
            <span className="text-sm font-bold text-slate-900">Public author page</span>
            {authorNames.length
              ? <>
                <span className="text-xs text-slate-600">Your bio, books and reader reviews at one link. Share it everywhere.</span>
                {authorNames.slice(0, 3).map((name) => (
                  <a key={name} href={authorPath(name)} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1 truncate text-xs font-semibold text-indigo-700 underline">
                    booksatlas.app{authorPath(name).replace(/^\/+/, '/')}<ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                  </a>
                ))}
              </>
              : <span className="text-xs text-slate-600">Appears when your first book is published.</span>}
          </div>
        </li>
        <li id="author-hub-payout">
          <div data-active={active === 'payout'} className={tile}>
            <Landmark className="h-5 w-5 text-violet-600" aria-hidden />
            <span className="text-sm font-bold text-slate-900">Payout setup</span>
            <span className="text-xs text-slate-600">
              {payout === null ? 'Loading…' : payout.configured ? <>Paid to <span className="font-mono">{payout.iban}</span> ({payout.accountHolder})</> : 'Add the bank account (IBAN) your share is paid to.'}
            </span>
            <button type="button" onClick={() => { setActive('payout'); setEditing(true); }}
              className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500 cursor-pointer">
              {payout?.configured ? 'Change payout details' : 'Set up payouts'}
            </button>
          </div>
        </li>
      </ul>
      <PayoutDialog open={editing} current={payout} onClose={() => setEditing(false)} onSave={async (body) => { const saved = await api.savePayout(body); setPayout(saved); setEditing(false); }} />
    </section>
  );
}

function PayoutDialog({ open, current, onClose, onSave }: { open: boolean; current: PayoutView | null; onClose: () => void; onSave: (body: PayoutInput) => Promise<void> }) {
  const known = current?.configured ? current : null;
  const [form, setForm] = useState<PayoutInput>({ accountHolder: '', iban: '', bic: '', address: '', country: 'NL', taxId: '', vatId: '', business: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErrors({});
    // The IBAN and tax ID are never sent back unmasked, so they are typed again on change.
    setForm({ accountHolder: known?.accountHolder ?? '', iban: '', bic: known?.bic ?? '', address: known?.address ?? '', country: known?.country ?? 'NL', taxId: '', vatId: known?.vatId ?? '', business: known?.business ?? false });
  }, [open]);
  const set = (k: keyof PayoutInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try { await onSave(form); } catch (err) {
      setErrors(err instanceof EbookApiError && err.fields ? err.fields as Record<string, string> : { form: err instanceof Error ? err.message : 'Please retry.' });
    } finally { setBusy(false); }
  };
  const field = (k: keyof PayoutInput, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-1 text-xs font-semibold text-slate-700">
      <span>{label}</span>
      <input value={String(form[k] ?? '')} onChange={set(k)} aria-invalid={!!errors[k]} className={input} {...extra} />
      {errors[k] && <span className="block font-normal text-rose-700">{errors[k]}</span>}
    </label>
  );
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl">
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-serif">Payout details</DialogTitle>
            <DialogDescription>Your share is paid by SEPA bank transfer. EU law (DAC7) requires BooksAtlas to report sellers' name, address, tax ID and earnings to the Dutch tax authority once a year.</DialogDescription>
          </DialogHeader>
          {field('accountHolder', 'Name on the bank account', { autoComplete: 'name', required: true })}
          {field('iban', known ? `IBAN (now ${known.iban}; type it again to save)` : 'IBAN', { autoComplete: 'off', inputMode: 'text', placeholder: 'NL91 ABNA 0417 1643 00', required: true, spellCheck: false })}
          <div className="grid gap-3 sm:grid-cols-2">
            {field('bic', 'BIC (optional)', { placeholder: 'ABNANL2A', spellCheck: false })}
            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              <span>Country of residence</span>
              <SelectBox value={form.country} onChange={set('country')} className={input}>{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</SelectBox>
            </label>
          </div>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            <span>Address</span>
            <textarea value={form.address} onChange={set('address')} rows={2} aria-invalid={!!errors.address} className={input} placeholder="Street and number, postcode, city" required />
            {errors.address && <span className="block font-normal text-rose-700">{errors.address}</span>}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('taxId', known?.taxId ? `Tax ID (BSN/TIN, now ${known.taxId})` : 'Tax ID (BSN/TIN, optional for now)', { autoComplete: 'off', spellCheck: false })}
            {field('vatId', 'VAT number (businesses)', { placeholder: 'NL123456789B01', spellCheck: false })}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700"><CheckBox checked={form.business} onChange={(e) => setForm((f) => ({ ...f, business: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />I publish as a business</label>
          {errors.form && <p role="alert" className="text-xs font-semibold text-rose-700">{errors.form}</p>}
          <p className="flex items-start gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />Stored encrypted at rest with our database host and only used for payouts and tax reporting; you see it masked.</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancel</button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}Save payout details
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
