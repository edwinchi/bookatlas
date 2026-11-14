import React, { useEffect, useState } from 'react';
import { ChevronDown, FileText, RefreshCw } from 'lucide-react';
import { useAccount } from '../auth/AuthContext';
import { usePayments, type InvoiceSummary } from './checkout/usePayments';

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

/** Signed-in buyer's orders and their VAT invoices (printable, save as PDF from the browser). */
export const AccountInvoices: React.FC = () => {
  const { account } = useAccount();
  const payments = usePayments();
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceSummary[] | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !account) return;
    setMessage('');
    payments.invoices().then(setInvoices).catch(() => { setInvoices([]); setMessage('Your invoices could not be loaded. Please try again.'); });
  }, [open, account?.id]);

  if (!account) return null;

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
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-indigo-100 bg-white p-4 text-left shadow-xl space-y-3"
        >
          <h2 id="account-invoices-title" className="text-sm font-serif font-bold text-slate-950">Your orders</h2>
          {invoices === null ? (
            <p className="flex items-center gap-1.5 text-xs text-slate-600"><RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden />Loading…</p>
          ) : invoices.length === 0 ? (
            <p className="text-xs text-slate-600">{message || 'No orders yet. Invoices for your eBook purchases appear here.'}</p>
          ) : (
            <ul className="space-y-2">
              {invoices.map((inv) => (
                <li key={inv.seq} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                  <div className="min-w-0 text-xs">
                    <p className="font-semibold text-slate-900 truncate">{inv.books.map((b) => b.title).join(', ')}</p>
                    <p className="text-slate-500">
                      {inv.number} · {new Date(inv.issuedAt).toLocaleDateString()} · {money(inv.grossCents, inv.currency)}
                      {inv.status === 'refunded' && <span className="ml-1 font-semibold text-rose-700">Refunded</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => payments.openInvoice(inv.seq).catch(() => setMessage('The invoice could not be opened. Please try again.'))}
                    className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    Invoice
                  </button>
                </li>
              ))}
            </ul>
          )}
          {message && invoices?.length ? <p role="alert" className="text-xs text-amber-800">{message}</p> : null}
        </section>
      )}
    </div>
  );
};
