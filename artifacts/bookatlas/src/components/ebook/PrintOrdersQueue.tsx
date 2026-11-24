import React, { useEffect, useState } from 'react';
import { Loader2, Printer, RefreshCw } from 'lucide-react';
import type { ManagedPrintOrder, useEbookApi } from './ebookApi';

const euro = (cents: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(cents / 100);
const LABEL: Record<ManagedPrintOrder['status'], string> = {
  paid: 'Paid, sending', submitted: 'With the printer', in_production: 'Printing', shipped: 'Shipped', canceled: 'Cancelled', refunded: 'Refunded', needs_attention: 'Needs attention',
};

/**
 * The owner's view of printed-book orders (2026-11-24): what the reader paid, what the printer costs, the author's
 * share, the printer's status, and a resend for orders that never reached the printer (for example after Lulu
 * refused the card on file).
 */
export function PrintOrdersQueue({ api }: { api: ReturnType<typeof useEbookApi> }) {
  const [data, setData] = useState<{ configured: boolean; live: boolean; orders: ManagedPrintOrder[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => api.managerPrintOrders().then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Printed-book orders could not be loaded.'));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = async (id: string) => {
    setBusy(id); setError('');
    try { await api.retryPrintOrder(id); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'The order could not be sent again.'); } finally { setBusy(null); }
  };
  const attention = data?.orders.filter((o) => o.status === 'needs_attention').length ?? 0;

  return (
    <section aria-labelledby="print-orders" className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5">
      <header className="flex items-center justify-between gap-2">
        <h2 id="print-orders" className="flex items-center gap-2 text-sm font-bold text-slate-900"><Printer className="h-4 w-4 text-amber-600" aria-hidden />Printed-book orders{attention ? <span className="rounded-full bg-rose-100 px-2 text-[11px] text-rose-800">{attention} need attention</span> : null}</h2>
        <button type="button" onClick={() => void load()} aria-label="Reload printed-book orders" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-3.5 w-3.5" aria-hidden /></button>
      </header>
      {data && !data.configured && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
          The printer is not connected yet. Create a Lulu developer account (developers.lulu.com), set its billing currency to euros and add a payment card, then add LULU_CLIENT_KEY and LULU_CLIENT_SECRET in Vercel (LULU_ENV=production for real printing; without it the Lulu sandbox is used) and run the print-orders database migration. Details in the admin guide.
        </p>
      )}
      {data?.configured && !data.live && <p className="text-[11px] font-semibold text-amber-800">Sandbox mode: orders go to Lulu’s test printer; nothing is printed or charged by Lulu.</p>}
      {error && <p role="alert" className="text-[11px] text-rose-700">{error}</p>}
      {!data ? <p className="flex items-center gap-1.5 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading…</p>
        : data.orders.length === 0 ? <p className="text-xs text-slate-500">No printed-book orders yet.</p> : (
          <ul className="divide-y divide-slate-100 text-xs">
            {data.orders.map((o) => (
              <li key={o.id} className="py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{o.title} × {o.quantity}<span className="block text-[11px] font-normal text-slate-500">{new Date(o.createdAt).toLocaleString()} · {o.email} · to {o.shipTo.city} ({o.shipTo.countryCode}) · {o.shippingLevel.toLowerCase().replace('_', ' ')}</span></p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${o.status === 'needs_attention' ? 'bg-rose-100 text-rose-800' : o.status === 'shipped' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{LABEL[o.status]}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Paid {euro(o.quote.totalGross)} · printing {euro(o.quote.productionExcl)} + delivery {euro(o.quote.shippingExcl)} (excl. tax) · author {euro(o.quote.authorShare)}
                  {o.luluJobId ? ` · Lulu job ${o.luluJobId} (${o.luluStatus ?? '—'})` : ''}
                </p>
                {o.error && <p className="mt-1 text-[11px] text-rose-700">{o.error}</p>}
                {o.status === 'needs_attention' && !o.luluJobId && (
                  <button type="button" disabled={busy === o.id} onClick={() => retry(o.id)} className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-500 disabled:opacity-50">
                    {busy === o.id && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}Send to the printer again
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
