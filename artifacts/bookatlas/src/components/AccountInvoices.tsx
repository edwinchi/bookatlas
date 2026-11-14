import React, { useEffect, useState } from 'react';
import { ChevronDown, FileText, RefreshCw } from 'lucide-react';
import { useAccount } from '../auth/AuthContext';
import { usePayments, type InvoiceSummary, type RefundRequest } from './checkout/usePayments';

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const button = 'shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';

function RefundStatus({ inv }: { inv: InvoiceSummary }) {
  const s = inv.refund.state;
  if (s === 'refunded') return <span className="font-semibold text-rose-700">Refunded</span>;
  if (s === 'requested') return <span className="font-semibold text-amber-700">Refund requested · we reply within 2 working days</span>;
  if (s === 'declined') return <span className="font-semibold text-slate-600">Refund declined</span>;
  if (s === 'available') return <span>Refund possible until {day(inv.refund.until)}</span>;
  return null;
}

/** Signed-in buyer's orders: invoice, refund status and refund request. Administrators also see open refund requests. */
export const AccountInvoices: React.FC = () => {
  const { account } = useAccount();
  const payments = usePayments();
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceSummary[] | null>(null);
  const [requests, setRequests] = useState<RefundRequest[] | null>(null);
  const [asking, setAsking] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isAdmin = account?.role === 'admin';

  const load = () => {
    payments.invoices().then(setInvoices).catch(() => { setInvoices([]); setMessage('Your orders could not be loaded. Please try again.'); });
    if (isAdmin) payments.refundRequests().then(setRequests).catch(() => setRequests([]));
  };
  useEffect(() => { if (open && account) { setMessage(''); load(); } }, [open, account?.id]);

  if (!account) return null;

  const submitRefund = async (seq: number) => {
    setBusy(true); setMessage('');
    try {
      const updated = await payments.requestRefund(seq, reason);
      setInvoices((list) => list?.map((i) => (i.seq === seq ? updated : i)) ?? null);
      setAsking(null); setReason('');
      setMessage('Refund request sent. We reply by email within 2 working days.');
    } catch (err) { setMessage(err instanceof Error ? err.message : 'The request could not be sent. Please try again.'); }
    finally { setBusy(false); }
  };

  const decide = async (seq: number, decision: 'approve' | 'decline') => {
    if (decision === 'approve' && !window.confirm('Refund this order in full through Stripe? The book returns to preview only.')) return;
    setBusy(true); setMessage('');
    try {
      await payments.decideRefund(seq, decision);
      setMessage(decision === 'approve' ? 'Refund started in Stripe. The book locks when Stripe confirms it.' : 'Refund request declined.');
      load();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'The decision could not be saved.'); }
    finally { setBusy(false); }
  };

  const openRequests = requests?.filter((r) => r.refund.state === 'requested') ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="account-invoices-panel"
        className="inline-flex items-center gap-1 font-bold underline-offset-4 hover:underline cursor-pointer"
      >
        <FileText className="w-3.5 h-3.5" aria-hidden />Orders &amp; invoices
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <section
          id="account-invoices-panel"
          aria-labelledby="account-invoices-title"
          className="absolute right-0 z-50 mt-2 max-h-[80vh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-indigo-100 bg-white p-4 text-left shadow-xl space-y-3"
        >
          <h2 id="account-invoices-title" className="text-sm font-serif font-bold text-slate-950">Your orders</h2>
          {invoices === null ? (
            <p className="flex items-center gap-1.5 text-xs text-slate-600"><RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden />Loading…</p>
          ) : invoices.length === 0 ? (
            <p className="text-xs text-slate-600">No orders yet. Your eBook purchases, invoices and refunds appear here.</p>
          ) : (
            <ul className="space-y-2">
              {invoices.map((inv) => (
                <li key={inv.seq} className="rounded-xl border border-slate-100 px-3 py-2 text-xs space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{inv.books.map((b) => b.title).join(', ')}</p>
                      <p className="text-slate-500">{day(inv.issuedAt)} · {money(inv.grossCents, inv.currency)} incl. {money(inv.vatCents, inv.currency)} VAT · {inv.number}</p>
                    </div>
                    <button type="button" className={button}
                      onClick={() => payments.openInvoice(inv.seq).catch(() => setMessage('The invoice could not be opened. Please try again.'))}>
                      Invoice
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-slate-600">
                    <RefundStatus inv={inv} />
                    {inv.refund.state === 'available' && asking !== inv.seq && (
                      <button type="button" className={button} onClick={() => { setAsking(inv.seq); setReason(''); setMessage(''); }}>Request refund</button>
                    )}
                  </div>
                  {asking === inv.seq && (
                    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void submitRefund(inv.seq); }}>
                      <label htmlFor={`refund-reason-${inv.seq}`} className="block text-[11px] text-slate-600">
                        {inv.refund.statutoryWithdrawal
                          ? 'You may withdraw from this purchase within 14 days without giving a reason. A note is optional.'
                          : 'Why do you want a refund? Faulty or not-as-described books are always refunded; otherwise refunds are for books bought by mistake and not read beyond the free preview.'}{' '}
                        <a href={`${import.meta.env.BASE_URL}refunds`} className="font-semibold text-indigo-700 underline">Refund Policy</a>
                      </label>
                      <textarea id={`refund-reason-${inv.seq}`} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
                      <div className="flex gap-2">
                        <button type="submit" disabled={busy || (!inv.refund.statutoryWithdrawal && reason.trim().length < 10)} className={button}>Send request</button>
                        <button type="button" className={`${button} text-slate-600`} onClick={() => setAsking(null)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isAdmin && (
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <h3 className="text-xs font-bold text-slate-900">Refund requests to decide ({openRequests.length})</h3>
              {requests === null ? <p className="text-xs text-slate-500">Loading…</p>
                : openRequests.length === 0 ? <p className="text-xs text-slate-500">None open.</p>
                  : <ul className="space-y-2">{openRequests.map((r) => (
                    <li key={r.seq} className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs space-y-1">
                      <p className="font-semibold text-slate-900">{r.books.map((b) => b.title).join(', ')} · {money(r.grossCents, r.currency)}</p>
                      <p className="text-slate-600">{r.number} · bought {day(r.issuedAt)} · {r.buyerEmail ?? 'erased account'}</p>
                      {r.refund.statutoryWithdrawal && <p className="font-semibold text-rose-700">No withdrawal waiver recorded: the buyer may withdraw within 14 days. Refund it (Directive 2011/83/EU art. 9).</p>}
                      <p className="text-slate-800 italic">"{r.reason}"</p>
                      <div className="flex gap-2 pt-1">
                        <button type="button" disabled={busy} className={button} onClick={() => void decide(r.seq, 'approve')}>Approve refund</button>
                        <button type="button" disabled={busy} className={`${button} text-slate-600`} onClick={() => void decide(r.seq, 'decline')}>Decline</button>
                      </div>
                    </li>
                  ))}</ul>}
            </div>
          )}
          {message && <p role="status" className="text-xs text-slate-700">{message}</p>}
        </section>
      )}
    </div>
  );
};
