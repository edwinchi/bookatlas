import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Briefcase, Loader2, RefreshCw } from 'lucide-react';
import { useEbookApi, type BusinessPeriod, type BusinessSummary } from './ebookApi';

const euro = (cents: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(cents / 100);
const monthLabel = (ym: string, style: 'short' | 'long' = 'short') => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString(undefined, { month: style, year: style === 'long' ? 'numeric' : undefined, timeZone: 'UTC' });
const PERIODS: { key: BusinessPeriod['period']; label: string }[] = [
  { key: 'month', label: 'This month' }, { key: 'quarter', label: 'This quarter' }, { key: 'year', label: 'This year' }, { key: 'all', label: 'All time' },
];
const country = (code: string) => { if (code === 'unknown') return 'Unknown'; try { return new Intl.DisplayNames(undefined, { type: 'region' }).of(code) ?? code; } catch { return code; } };

function Tile({ label, value, hint, tone = 'plain' }: { label: string; value: string; hint?: string; tone?: 'plain' | 'hero' | 'good' | 'warn' }) {
  const tones = { plain: 'bg-white text-slate-900 ring-slate-200', hero: 'bg-indigo-600 text-white ring-indigo-600', good: 'bg-emerald-50 text-emerald-950 ring-emerald-200', warn: 'bg-amber-50 text-amber-950 ring-amber-200' };
  return (
    <div className={`rounded-2xl p-4 ring-1 ${tones[tone]}`}>
      <dt className={`text-[11px] font-semibold uppercase tracking-wide ${tone === 'hero' ? 'text-indigo-100' : 'text-slate-500'}`}>{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
      {hint && <p className={`mt-0.5 text-[11px] ${tone === 'hero' ? 'text-indigo-100' : 'text-slate-500'}`}>{hint}</p>}
    </div>
  );
}

/** The owner's view of BooksAtlas as a business: money in, commission, VAT to declare and what authors are owed. */
export function BusinessDashboard() {
  const api = useEbookApi();
  const [data, setData] = useState<BusinessSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = () => { setLoading(true); setError(''); api.business().then(setData).catch(() => setError('The business figures could not be loaded.')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const max = Math.max(1, ...(data?.monthly.map((m) => m.grossCents) ?? [1]));

  return (
    <section aria-labelledby="business-title" className="mb-6 space-y-5 rounded-3xl bg-slate-50 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="business-title" className="flex items-center gap-2 font-serif text-xl font-bold text-slate-900"><Briefcase className="h-5 w-5 text-indigo-600" aria-hidden />BooksAtlas business</h2>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 cursor-pointer"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />Refresh</button>
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!data && !error && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading…</p>}
      {data && <>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Readers and authors" value={data.users.total.toLocaleString()} hint={`${data.users.newThisMonth} new this month`} />
          <Tile label="Published books" value={data.catalogue.publishedBooks.toLocaleString()} hint={`${data.catalogue.waitingForReview} waiting for review`} />
          <Tile label="Narrations" value={`${data.narration.done} done`} hint={`${data.narration.open} open`} />
          <Tile label="Commission" value={`${data.commissionRate}%`} hint="authors keep the rest" />
        </dl>

        <Tabs.Root defaultValue="month" className="space-y-3">
          <Tabs.List aria-label="Period" className="inline-flex flex-wrap rounded-full bg-white p-1 ring-1 ring-slate-200">
            {PERIODS.map((p) => <Tabs.Trigger key={p.key} value={p.key} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 data-[state=active]:bg-indigo-600 data-[state=active]:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">{p.label}</Tabs.Trigger>)}
          </Tabs.List>
          {data.periods.map((p) => (
            <Tabs.Content key={p.period} value={p.period} className="space-y-3 focus:outline-none">
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile tone="hero" label="BooksAtlas margin (estimate)" value={euro(p.marginCents)} hint="commission + narration − Gemini − Stripe" />
                <Tile label="Revenue incl. VAT" value={euro(p.grossCents)} hint={`${p.orders} order${p.orders === 1 ? '' : 's'} · ${p.refunds} refunded`} />
                <Tile label="Your commission" value={euro(p.commissionCents)} hint={`of ${euro(p.ebookSalesNetCents)} eBook sales excl. VAT`} />
                <Tile tone="warn" label="Owed to authors" value={euro(p.authorsShareCents)} hint="their share of these sales" />
                <Tile label="Narration income" value={euro(p.narrationNetCents)} hint={`Gemini cost ${euro(p.narrationCostCents)}`} />
                <Tile label="Stripe fees (estimate)" value={euro(p.stripeFeesEstimateCents)} />
                <Tile tone="warn" label="VAT to declare" value={euro(p.vatCents)} hint={`9% e-books ${euro(p.vat.ebooks9Cents)} · 21% services ${euro(p.vat.services21Cents)}`} />
              </dl>
            </Tabs.Content>
          ))}
        </Tabs.Root>

        <div className="grid gap-4 lg:grid-cols-5">
          <figure className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200 lg:col-span-3">
            <figcaption className="text-sm font-semibold text-slate-900">Revenue per month (incl. VAT)</figcaption>
            <Tooltip.Provider delayDuration={80}>
              <div className="relative flex h-36 items-end gap-[2px] border-b border-slate-300" aria-hidden="true">
                {data.monthly.map((m) => (
                  <Tooltip.Root key={m.month}>
                    <Tooltip.Trigger asChild>
                      <button type="button" tabIndex={-1} className="group flex h-full flex-1 items-end justify-center cursor-default">
                        <span className="w-full max-w-7 rounded-t-[4px] bg-indigo-500 group-hover:bg-indigo-700" style={{ height: m.grossCents ? `${Math.max(2, (m.grossCents / max) * 100)}%` : '0%' }} />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal><Tooltip.Content sideOffset={6} className="z-50 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">{monthLabel(m.month, 'long')}: {euro(m.grossCents)} · {m.orders} orders<Tooltip.Arrow className="fill-slate-900" /></Tooltip.Content></Tooltip.Portal>
                  </Tooltip.Root>
                ))}
              </div>
            </Tooltip.Provider>
            <div className="flex gap-[2px] text-center text-[10px] text-slate-500" aria-hidden="true">{data.monthly.map((m, i) => <span key={m.month} className="flex-1">{i % 2 === 0 ? monthLabel(m.month) : ''}</span>)}</div>
            <table className="sr-only"><caption>Revenue per month</caption><tbody>{data.monthly.map((m) => <tr key={m.month}><td>{monthLabel(m.month, 'long')}</td><td>{euro(m.grossCents)}</td><td>{m.orders} orders</td></tr>)}</tbody></table>
          </figure>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 lg:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Orders by country</h3>
            <ul className="space-y-1 text-xs">{Object.entries(data.countries).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => <li key={c} className="flex justify-between"><span>{country(c)}</span><span className="tabular-nums text-slate-600">{n}</span></li>)}</ul>
            {!Object.keys(data.countries).length && <p className="text-xs text-slate-500">No orders yet.</p>}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
            <table className="w-full text-left text-xs">
              <caption className="px-4 pt-3 text-left text-sm font-semibold text-slate-900">Top books (all time)</caption>
              <thead className="text-slate-500"><tr><th className="px-4 py-2 font-semibold">Book</th><th className="px-2 py-2 text-right font-semibold">Sold</th><th className="px-4 py-2 text-right font-semibold">Excl. VAT</th></tr></thead>
              <tbody>{data.topBooks.map((b) => <tr key={b.bookId} className="border-t border-slate-100"><td className="px-4 py-2"><span className="font-semibold text-slate-900">{b.title}</span><span className="block text-slate-400">{b.author}</span></td><td className="px-2 py-2 text-right tabular-nums">{b.units}</td><td className="px-4 py-2 text-right tabular-nums">{euro(b.netCents)}</td></tr>)}
                {!data.topBooks.length && <tr><td colSpan={3} className="px-4 py-3 text-slate-500">No sales yet.</td></tr>}</tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
            <table className="w-full text-left text-xs">
              <caption className="px-4 pt-3 text-left text-sm font-semibold text-slate-900">Owed to authors (all time, {100 - data.commissionRate}% of their sales)</caption>
              <thead className="text-slate-500"><tr><th className="px-4 py-2 font-semibold">Author</th><th className="px-2 py-2 text-right font-semibold">Sold</th><th className="px-4 py-2 text-right font-semibold">Owed</th></tr></thead>
              <tbody>{data.authorsOwed.map((a) => <tr key={a.ownerId} className="border-t border-slate-100"><td className="px-4 py-2"><span className="font-semibold text-slate-900">{a.author}</span><span className="block text-slate-400">{a.email}</span></td><td className="px-2 py-2 text-right tabular-nums">{a.units}</td><td className="px-4 py-2 text-right font-semibold tabular-nums">{euro(a.owedCents)}</td></tr>)}
                {!data.authorsOwed.length && <tr><td colSpan={3} className="px-4 py-3 text-slate-500">Nothing owed yet.</td></tr>}</tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">{data.notes}</p>
      </>}
    </section>
  );
}
