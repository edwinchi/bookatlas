import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Collapsible from '@radix-ui/react-collapsible';
import { BarChart3, ChevronDown, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import type { AuthorSales, SalesWindow, useEbookApi } from './ebookApi';

const euro = (cents: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(cents / 100);
const monthLabel = (ym: string, style: 'short' | 'long' = 'short') =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString(undefined, { month: style, year: style === 'long' ? 'numeric' : undefined, timeZone: 'UTC' });
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const country = (code: string | null) => {
  if (!code) return 'Unknown';
  try { return new Intl.DisplayNames(undefined, { type: 'region' }).of(code) ?? code; } catch { return code; }
};

const PERIODS = [
  { key: 'last30Days', label: 'Last 30 days' },
  { key: 'last12Months', label: 'Last 12 months' },
  { key: 'allTime', label: 'All time' },
] as const;

function Tiles({ w }: { w: SalesWindow }) {
  const tiles = [
    { label: 'Your share', value: euro(w.shareCents), hero: true },
    { label: 'Books sold', value: w.units.toLocaleString() },
    { label: 'Revenue incl. VAT', value: euro(w.grossCents) },
    { label: 'Refunds', value: w.refunds.toLocaleString() },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className={`rounded-2xl p-4 ring-1 ${t.hero ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-900 ring-slate-200'}`}>
          <dt className={`text-[11px] font-semibold uppercase tracking-wide ${t.hero ? 'text-indigo-100' : 'text-slate-500'}`}>{t.label}</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Monthly share, one series: thin bars, one hue, a tooltip on each bar, and the same figures as a table. */
function MonthlyChart({ monthly }: { monthly: AuthorSales['monthly'] }) {
  const max = Math.max(...monthly.map((m) => m.shareCents), 1);
  return (
    <figure className="space-y-3">
      <figcaption className="flex items-center gap-2 text-sm font-semibold text-slate-900"><BarChart3 className="h-4 w-4 text-indigo-600" aria-hidden />Your share per month</figcaption>
      <Tooltip.Provider delayDuration={80}>
        <div className="relative h-44 border-b border-slate-300" aria-hidden="true">
          {/* One recessive gridline at the highest month, labelled. */}
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
          <span className="absolute -top-2 right-0 bg-white pl-1 text-[10px] tabular-nums text-slate-400">{euro(max)}</span>
          <div className="absolute inset-0 flex items-end gap-[2px] pr-14">
            {monthly.map((m) => (
              <Tooltip.Root key={m.month}>
                <Tooltip.Trigger asChild>
                  <button type="button" tabIndex={-1} className="group flex h-full flex-1 items-end justify-center cursor-default focus:outline-none">
                    <span className="w-full max-w-7 rounded-t-[4px] bg-indigo-500 transition-colors group-hover:bg-indigo-700"
                      style={{ height: m.shareCents ? `${Math.max(2, (m.shareCents / max) * 100)}%` : '0%' }} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="top" sideOffset={6} className="z-50 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
                    <p className="font-semibold">{monthLabel(m.month, 'long')}</p>
                    <p className="tabular-nums">{euro(m.shareCents)} your share · {m.units} sold</p>
                    <Tooltip.Arrow className="fill-slate-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ))}
          </div>
        </div>
      </Tooltip.Provider>
      <div className="flex gap-[2px] pr-14 text-center text-[10px] text-slate-500" aria-hidden="true">
        {monthly.map((m, i) => <span key={m.month} className="flex-1">{i % 2 === 0 || monthly.length <= 6 ? monthLabel(m.month) : ''}</span>)}
      </div>
      <Collapsible.Root>
        <Collapsible.Trigger className="group inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline cursor-pointer">
          Show as a table <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
        </Collapsible.Trigger>
        <Collapsible.Content>
          <table className="mt-2 w-full text-left text-xs">
            <thead><tr className="text-slate-500"><th className="py-1 font-semibold">Month</th><th className="py-1 text-right font-semibold">Sold</th><th className="py-1 text-right font-semibold">Your share</th></tr></thead>
            <tbody>{monthly.map((m) => <tr key={m.month} className="border-t border-slate-100"><td className="py-1">{monthLabel(m.month, 'long')}</td><td className="py-1 text-right tabular-nums">{m.units}</td><td className="py-1 text-right tabular-nums">{euro(m.shareCents)}</td></tr>)}</tbody>
          </table>
        </Collapsible.Content>
      </Collapsible.Root>
    </figure>
  );
}

/** An author's sales: totals per period, monthly share, per-book figures and recent sales (buyers stay anonymous). */
export function AuthorSalesDashboard({ api }: { api: ReturnType<typeof useEbookApi> }) {
  const [data, setData] = useState<AuthorSales | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = () => {
    setLoading(true); setError('');
    api.authorSales().then(setData).catch(() => setError('Your sales could not be loaded.')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <section aria-labelledby="author-sales-title" className="space-y-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="author-sales-title" className="flex items-center gap-2 font-serif text-xl font-bold text-slate-900"><TrendingUp className="h-5 w-5 text-indigo-600" aria-hidden />Your sales</h2>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />Refresh
        </button>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><span className="flex-1">{error}</span><button type="button" onClick={load} className="font-bold underline cursor-pointer">Retry</button></div>}
      {!data && !error && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading your sales…</p>}

      {data && (
        <>
          <Tabs.Root defaultValue="last30Days" className="space-y-3">
            <Tabs.List aria-label="Period" className="inline-flex rounded-full bg-slate-100 p-1">
              {PERIODS.map((p) => (
                <Tabs.Trigger key={p.key} value={p.key}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 transition data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                  {p.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {PERIODS.map((p) => <Tabs.Content key={p.key} value={p.key} className="focus:outline-none"><Tiles w={data.totals[p.key]} /></Tabs.Content>)}
          </Tabs.Root>
          <p className="text-xs text-slate-500">{data.shareNote}</p>

          {data.totals.allTime.units + data.totals.allTime.refunds === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
              No sales yet. When readers buy your published eBooks, every sale appears here within a minute.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 lg:col-span-3"><MonthlyChart monthly={data.monthly} /></div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 lg:col-span-2">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Recent sales</h3>
                <ul className="divide-y divide-slate-100 text-xs">
                  {data.recent.map((s, i) => (
                    <li key={`${s.at}-${s.bookId}-${i}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{s.title}</span>
                        <span className="text-slate-500">{day(s.at)} · {country(s.country)}</span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        {s.refunded ? <span className="font-semibold text-rose-700">Refunded</span> : <span className="font-semibold text-slate-900">+{euro(s.shareCents)}</span>}
                        <span className="block text-slate-400">{euro(s.grossCents)} paid</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {data.books.length > 0 && (
            <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
              <table className="w-full text-left text-xs">
                <caption className="px-4 pt-3 text-left text-sm font-semibold text-slate-900">Per book, all time</caption>
                <thead className="text-slate-500">
                  <tr><th className="px-4 py-2 font-semibold">Book</th><th className="px-2 py-2 text-right font-semibold">Sold</th><th className="px-2 py-2 text-right font-semibold">Refunds</th><th className="hidden px-2 py-2 text-right font-semibold sm:table-cell">Incl. VAT</th><th className="hidden px-2 py-2 text-right font-semibold sm:table-cell">Excl. VAT</th><th className="px-4 py-2 text-right font-semibold">Your share</th></tr>
                </thead>
                <tbody>
                  {data.books.map((b) => (
                    <tr key={b.bookId} className="border-t border-slate-100">
                      <td className="px-4 py-2"><a href={`${import.meta.env.BASE_URL}books/${encodeURIComponent(b.bookId)}`} className="font-semibold text-indigo-700 hover:underline">{b.title}</a>
                        <span className="block text-slate-400">{b.lastSaleAt ? `Last sale ${day(b.lastSaleAt)}` : 'No sales yet'}</span></td>
                      <td className="px-2 py-2 text-right tabular-nums">{b.units}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{b.refunds}</td>
                      <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">{euro(b.grossCents)}</td>
                      <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">{euro(b.netCents)}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-900">{euro(b.shareCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
