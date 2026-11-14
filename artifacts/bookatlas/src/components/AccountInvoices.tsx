import React, { useEffect, useState } from 'react';
import { ArrowRight, FileText, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { UtilityMenu } from './UtilityMenu';
import { useAccount } from '../auth/AuthContext';
import { usePayments, type InvoiceSummary, type RefundRequest } from './checkout/usePayments';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const button = 'shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
/** The account-bar menu and My Bookshelf show the same orders; a change in one refreshes the other. */
const ORDERS_CHANGED = 'bookatlas:orders-changed';
export const ORDERS_SECTION_ID = 'orders-and-invoices';

function RefundStatus({ inv }: { inv: InvoiceSummary }) {
  const s = inv.refund.state;
  if (s === 'refunded') return <span className="font-semibold text-rose-700">Refunded</span>;
  if (s === 'requested') return <span className="font-semibold text-amber-700">Refund requested · we reply within 2 working days</span>;
  if (s === 'declined') return <span className="font-semibold text-slate-600">Refund declined</span>;
  if (s === 'available') return <span>Refund possible until {day(inv.refund.until)}</span>;
  return null;
}

/**
 * Signed-in buyer's orders: invoice, VAT, refund status and refund request. Administrators also decide open
 * refund requests. Loads when `active` turns true and whenever orders change elsewhere on the page.
 */
export function OrdersPanel({ active, wide = false }: { active: boolean; wide?: boolean }) {
  const { account } = useAccount();
  const payments = usePayments();
  const [invoices, setInvoices] = useState<InvoiceSummary[] | null>(null);
  const [requests, setRequests] = useState<RefundRequest[] | null>(null);
  const [asking, setAsking] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [confirming, setConfirming] = useState<RefundRequest | null>(null);
  const isAdmin = account?.role === 'admin';

  const load = () => {
    setLoadError('');
    payments.invoices().then(setInvoices).catch(() => { setInvoices([]); setLoadError('Your orders could not be loaded.'); });
    if (isAdmin) payments.refundRequests().then(setRequests).catch(() => { setRequests([]); setLoadError('Refund requests could not be loaded.'); });
  };
  useEffect(() => { if (active && account) { setMessage(''); load(); } }, [active, account?.id]);
  useEffect(() => {
    if (!active) return;
    const reload = () => load();
    window.addEventListener(ORDERS_CHANGED, reload);
    return () => window.removeEventListener(ORDERS_CHANGED, reload);
  }, [active, account?.id]);

  if (!account) return null;
  const changed = () => window.dispatchEvent(new Event(ORDERS_CHANGED));

  const submitRefund = async (seq: number) => {
    setBusy(true); setMessage('');
    try {
      const updated = await payments.requestRefund(seq, reason);
      setInvoices((list) => list?.map((i) => (i.seq === seq ? updated : i)) ?? null);
      setAsking(null); setReason('');
      setMessage('Refund request sent. We reply by email within 2 working days.');
      changed();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'The request could not be sent. Please try again.'); }
    finally { setBusy(false); }
  };

  const decide = async (seq: number, decision: 'approve' | 'decline') => {
    setConfirming(null);
    setBusy(true); setMessage('');
    try {
      await payments.decideRefund(seq, decision);
      setMessage(decision === 'approve' ? 'Refund started in Stripe. The book locks when Stripe confirms it.' : 'Refund request declined.');
      changed();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'The decision could not be saved.'); }
    finally { setBusy(false); }
  };

  const openRequests = requests?.filter((r) => r.refund.state === 'requested') ?? [];
  const askingInv = invoices?.find((i) => i.seq === asking) ?? null;

  return (
    <div className="space-y-3">
      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
          <span className="flex-1">{loadError}</span>
          <button type="button" onClick={load} className="font-bold underline cursor-pointer">Retry</button>
        </div>
      )}
      {invoices === null ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-600"><RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden />Loading…</p>
      ) : invoices.length === 0 ? (
        !loadError && <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-600"><FileText className="mx-auto mb-1.5 h-5 w-5 text-slate-300" aria-hidden />No orders yet. Your eBook purchases, invoices and refunds appear here.</div>
      ) : (
        <ul className={wide ? 'grid gap-3 sm:grid-cols-2' : 'space-y-2'}>
          {invoices.map((inv) => (
            <li key={inv.seq} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs space-y-1.5 shadow-sm">
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
                {inv.refund.state === 'available' && (
                  <button type="button" className={button} onClick={() => { setAsking(inv.seq); setReason(''); setMessage(''); }}>Request refund</button>
                )}
              </div>
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
                    <button type="button" disabled={busy} className={button} onClick={() => setConfirming(r)}>Approve refund</button>
                    <button type="button" disabled={busy} className={`${button} text-slate-600`} onClick={() => void decide(r.seq, 'decline')}>Decline</button>
                  </div>
                </li>
              ))}</ul>}
        </div>
      )}
      {message && !askingInv && <p role="status" className="text-xs text-slate-700">{message}</p>}

      {/* Refund request: a dialog, closed by Cancel, Escape or a click outside */}
      <Dialog open={!!askingInv} onOpenChange={(o) => { if (!o) setAsking(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          {askingInv && (
            <form onSubmit={(e) => { e.preventDefault(); void submitRefund(askingInv.seq); }} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="font-serif">Request a refund</DialogTitle>
                <DialogDescription>
                  {askingInv.books.map((b) => b.title).join(', ')} · {money(askingInv.grossCents, askingInv.currency)} · {askingInv.number}. You can ask until {day(askingInv.refund.until)}.
                </DialogDescription>
              </DialogHeader>
              <label htmlFor="refund-reason" className="block text-xs leading-relaxed text-slate-600">
                {askingInv.refund.statutoryWithdrawal
                  ? 'You may withdraw from this purchase within 14 days without giving a reason. A note is optional.'
                  : 'Why do you want a refund? Faulty or not-as-described books are always refunded; otherwise refunds are for books bought by mistake and not read beyond the free preview.'}{' '}
                <a href={`${import.meta.env.BASE_URL}refunds`} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline">Refund Policy</a>
              </label>
              <textarea id="refund-reason" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={1000}
                placeholder={askingInv.refund.statutoryWithdrawal ? 'Optional' : 'For example: the file does not open on my e-reader.'}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" />
              {message && <p role="alert" className="text-xs font-semibold text-rose-700">{message}</p>}
              <DialogFooter className="gap-2 sm:gap-2">
                <button type="button" className={`${button} px-3 py-2 text-xs text-slate-600`} onClick={() => setAsking(null)}>Cancel</button>
                <button type="submit" disabled={busy || (!askingInv.refund.statutoryWithdrawal && reason.trim().length < 10)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2">
                  {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />}Send request
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Administrator: confirm a full refund through Stripe */}
      <AlertDialog open={!!confirming} onOpenChange={(o) => { if (!o) setConfirming(null); }}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Refund {confirming ? money(confirming.grossCents, confirming.currency) : ''} in full?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming?.books.map((b) => b.title).join(', ')} ({confirming?.number}) is refunded through Stripe to the buyer&apos;s payment method. When Stripe confirms, the book returns to preview only and the invoice is marked Refunded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-500" onClick={() => confirming && void decide(confirming.seq, 'approve')}>Refund in full</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Account-bar menu around the orders panel, with a link to the same list on My Bookshelf. */
export const AccountInvoices: React.FC = () => {
  const { account } = useAccount();
  const payments = usePayments();
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const isAdmin = account?.role === 'admin';

  // Administrators see how many refund requests wait, without opening the menu.
  useEffect(() => {
    if (!isAdmin) return;
    const count = () => payments.refundRequests().then((r) => setWaiting(r.filter((x) => x.refund.state === 'requested').length)).catch(() => undefined);
    void count();
    window.addEventListener(ORDERS_CHANGED, count);
    return () => window.removeEventListener(ORDERS_CHANGED, count);
  }, [isAdmin]);

  if (!account) return null;
  return (
    <UtilityMenu icon={FileText} label="Orders & invoices" title="Your orders" open={open} onOpenChange={setOpen} badge={isAdmin ? waiting : 0}>
      <OrdersPanel active={open} />
      <Link href={`/user-portal#${ORDERS_SECTION_ID}`} onClick={() => setOpen(false)}
        className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
        See your books and orders on My Bookshelf <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </UtilityMenu>
  );
};
