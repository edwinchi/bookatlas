import { bookatlasDb } from '../db/supabaseClient.js';
import { PaymentError } from './purchases.js';
import { EU_COUNTRIES, SELLER_COUNTRY, crossBorderStatus, vatForLines, type VatScheme } from './vat.js';

/** One invoice per paid Stripe Checkout session; numbers are sequential (database identity). */
export interface Invoice {
  seq: number;
  checkout_session_id: string;
  payment_intent_id: string | null;
  user_id: string;
  buyer_email: string | null;
  buyer_name: string | null;
  buyer_country: string | null;
  vat_scheme: VatScheme;
  vat_rate_bp: number;
  currency: string;
  amount_gross: number;
  amount_net: number;
  amount_vat: number;
  lines: InvoiceLine[];
  status: 'issued' | 'refunded';
  issued_at: string;
  refunded_at: string | null;
}

export interface InvoiceLine { bookId: string; title: string; gross: number; net: number; vat: number }

export interface InvoiceInput {
  checkoutSessionId: string;
  paymentIntentId: string | null;
  userId: string;
  buyerEmail: string | null;
  buyerName: string | null;
  buyerCountry: string | null;
  currency: string;
  lines: { bookId: string; title: string; gross: number }[];
}

const memory: Invoice[] = [];
const COLUMNS = 'seq,checkout_session_id,payment_intent_id,user_id,buyer_email,buyer_name,buyer_country,vat_scheme,vat_rate_bp,currency,amount_gross,amount_net,amount_vat,lines,status,issued_at,refunded_at';

export const invoiceNumber = (invoice: Pick<Invoice, 'seq' | 'issued_at'>) =>
  `BA-${new Date(invoice.issued_at).getUTCFullYear()}-${String(invoice.seq).padStart(6, '0')}`;

/** Idempotent: the webhook and the success page both fulfil, and Stripe retries; one invoice per session. */
export async function issueInvoice(input: InvoiceInput): Promise<Invoice> {
  const vat = vatForLines(input.lines.map((l) => l.gross), input.buyerCountry);
  const row = {
    checkout_session_id: input.checkoutSessionId, payment_intent_id: input.paymentIntentId, user_id: input.userId,
    buyer_email: input.buyerEmail, buyer_name: input.buyerName, buyer_country: vat.country,
    vat_scheme: vat.scheme, vat_rate_bp: vat.rateBp, currency: input.currency,
    amount_gross: vat.gross, amount_net: vat.net, amount_vat: vat.vat,
    lines: input.lines.map((l, i) => ({ bookId: l.bookId, title: l.title, gross: vat.lines[i]!.gross, net: vat.lines[i]!.net, vat: vat.lines[i]!.vat })),
    status: 'issued' as const, issued_at: new Date().toISOString(), refunded_at: null,
  };
  if (!bookatlasDb) {
    const existing = memory.find((i) => i.checkout_session_id === input.checkoutSessionId);
    if (existing) return existing;
    const invoice = { ...row, seq: memory.length + 1 };
    memory.push(invoice);
    return invoice;
  }
  const inserted = await bookatlasDb.from('invoices').upsert(row, { onConflict: 'checkout_session_id', ignoreDuplicates: true });
  if (inserted.error) throw new PaymentError('The invoice could not be saved.', 503);
  const found = await bookatlasDb.from('invoices').select(COLUMNS).eq('checkout_session_id', input.checkoutSessionId).single();
  if (found.error || !found.data) throw new PaymentError('The invoice could not be read.', 503);
  return found.data as unknown as Invoice;
}

/** A full refund marks the invoice refunded; the record itself is kept (7-year fiscal retention). */
export async function markInvoiceRefunded(paymentIntentId: string) {
  const at = new Date().toISOString();
  if (!bookatlasDb) {
    for (const i of memory) if (i.payment_intent_id === paymentIntentId) { i.status = 'refunded'; i.refunded_at = at; }
    return;
  }
  const result = await bookatlasDb.from('invoices').update({ status: 'refunded', refunded_at: at }).eq('payment_intent_id', paymentIntentId);
  if (result.error) throw new PaymentError('The invoice refund could not be saved.', 503);
}

export async function invoicesOf(userId: string): Promise<Invoice[]> {
  if (!bookatlasDb) return memory.filter((i) => i.user_id === userId).sort((a, b) => b.seq - a.seq);
  const result = await bookatlasDb.from('invoices').select(COLUMNS).eq('user_id', userId).order('seq', { ascending: false });
  if (result.error) throw new PaymentError('Your invoices could not be read.', 503);
  return result.data as unknown as Invoice[];
}

export async function invoiceForUser(userId: string, seq: number): Promise<Invoice> {
  const invoice = !bookatlasDb
    ? memory.find((i) => i.seq === seq)
    : await bookatlasDb.from('invoices').select(COLUMNS).eq('seq', seq).maybeSingle().then((r) => {
      if (r.error) throw new PaymentError('The invoice could not be read.', 503);
      return r.data as unknown as Invoice | null;
    });
  // Someone else's invoice is reported as missing, never as forbidden.
  if (!invoice || invoice.user_id !== userId) throw new PaymentError('Unknown invoice.', 404);
  return invoice;
}

/** Account erasure: the invoice stays for the tax authorities but no longer names the buyer. */
export async function anonymiseInvoices(userId: string, marker: string) {
  if (!bookatlasDb) {
    for (const i of memory) if (i.user_id === userId) { i.user_id = marker; i.buyer_email = null; i.buyer_name = null; }
    return;
  }
  const result = await bookatlasDb.from('invoices').update({ user_id: marker, buyer_email: null, buyer_name: null }).eq('user_id', userId);
  if (result.error) throw new PaymentError('Invoices could not be anonymised.', 503);
}

/** Net cross-border EU sales per calendar year, for the €10,000 threshold (refunded sales excluded). */
export async function vatSummary(now = new Date()) {
  const year = now.getUTCFullYear();
  const since = new Date(Date.UTC(year - 1, 0, 1)).toISOString();
  let rows: Pick<Invoice, 'buyer_country' | 'amount_net' | 'amount_vat' | 'amount_gross' | 'issued_at' | 'status'>[];
  if (!bookatlasDb) rows = memory.filter((i) => i.issued_at >= since);
  else {
    const result = await bookatlasDb.from('invoices').select('buyer_country,amount_net,amount_vat,amount_gross,issued_at,status').gte('issued_at', since).limit(100_000);
    if (result.error) throw new PaymentError('The VAT summary could not be read.', 503);
    rows = result.data as typeof rows;
  }
  const paid = rows.filter((r) => r.status === 'issued');
  const crossBorder = (y: number) => paid
    .filter((r) => new Date(r.issued_at).getUTCFullYear() === y && !!r.buyer_country && r.buyer_country !== SELLER_COUNTRY && EU_COUNTRIES.has(r.buyer_country))
    .reduce((s, r) => s + r.amount_net, 0);
  const thisYear = paid.filter((r) => new Date(r.issued_at).getUTCFullYear() === year);
  const byCountry: Record<string, { orders: number; grossCents: number; vatCents: number }> = {};
  for (const r of thisYear) {
    const key = r.buyer_country ?? 'unknown';
    byCountry[key] ??= { orders: 0, grossCents: 0, vatCents: 0 };
    byCountry[key].orders += 1; byCountry[key].grossCents += r.amount_gross; byCountry[key].vatCents += r.amount_vat;
  }
  return {
    year,
    threshold: crossBorderStatus(crossBorder(year), crossBorder(year - 1)),
    thisYear: { orders: thisYear.length, grossCents: thisYear.reduce((s, r) => s + r.amount_gross, 0), vatCents: thisYear.reduce((s, r) => s + r.amount_vat, 0) },
    byCountry,
  };
}

/** Seller details come from the environment (Vercel), never from the code. */
export function sellerDetails() {
  const env = (k: string) => process.env[k]?.trim() || null;
  const seller = {
    name: env('SELLER_LEGAL_NAME') ?? 'Atlantean Globals Services',
    // Vercel variables are one line: a literal \n in SELLER_ADDRESS starts a new line.
    address: env('SELLER_ADDRESS')?.replace(/\\n/g, '\n') ?? null,
    kvk: env('SELLER_KVK'), vatId: env('SELLER_VAT_ID'), email: env('SELLER_EMAIL'),
  };
  return { ...seller, complete: !!(seller.address && seller.kvk && seller.vatId) };
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (cents: number, currency: string) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
const VAT_NOTE: Record<VatScheme, string> = {
  'nl-domestic': 'Dutch VAT, reduced rate for e-books.',
  'nl-eu-threshold': 'Dutch VAT applied: the seller is below the EU €10,000 threshold for cross-border electronic services (art. 59c VAT Directive).',
  'outside-eu': 'No Dutch VAT: the buyer is outside the EU.',
  'unknown-country-nl': 'Dutch VAT, reduced rate for e-books.',
};

/** A self-contained, printable invoice page (the buyer saves it as PDF from the browser). */
export function renderInvoiceHtml(invoice: Invoice) {
  const seller = sellerDetails();
  const number = invoiceNumber(invoice);
  const title = seller.complete ? 'Invoice' : 'Receipt';
  const rate = `${(invoice.vat_rate_bp / 100).toLocaleString('nl-NL')}%`;
  const date = new Date(invoice.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' });
  const rows = invoice.lines.map((l) => `<tr><td>${esc(l.title)}<div class="muted">eBook (EPUB), digital delivery</div></td><td class="n">${money(l.net, invoice.currency)}</td><td class="n">${rate}</td><td class="n">${money(l.vat, invoice.currency)}</td><td class="n">${money(l.gross, invoice.currency)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${title} ${esc(number)} · BookAtlas</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#0f172a;background:#fff;max-width:760px;margin:32px auto;padding:0 16px}h1{font-size:24px;margin:0}.muted{color:#64748b;font-size:12px}.head{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:28px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top}.n{text-align:right;white-space:nowrap}tfoot td{font-weight:600;border:0}.flag{background:#fef3c7;border:1px solid #fcd34d;padding:8px 12px;border-radius:6px;margin:16px 0}.refund{background:#fee2e2;border-color:#fca5a5}@media print{.noprint{display:none}}</style></head><body>
<div class="head"><div><h1>${title}</h1><div class="muted">${esc(number)} · ${esc(date)}</div></div>
<div><strong>${esc(seller.name)}</strong> (BookAtlas)<br>${seller.address ? esc(seller.address).replace(/\n/g, '<br>') + '<br>' : ''}${seller.kvk ? `KvK ${esc(seller.kvk)}<br>` : ''}${seller.vatId ? `VAT ${esc(seller.vatId)}<br>` : ''}${seller.email ? esc(seller.email) : ''}</div></div>
<div><span class="muted">Billed to</span><br>${esc(invoice.buyer_name ?? '')}${invoice.buyer_name ? '<br>' : ''}${esc(invoice.buyer_email ?? '')}<br>${invoice.buyer_country ? `Country: ${esc(invoice.buyer_country)}` : ''}</div>
${invoice.status === 'refunded' ? `<p class="flag refund">Refunded in full on ${esc(new Date(invoice.refunded_at!).toLocaleDateString('en-GB', { timeZone: 'Europe/Amsterdam' }))}. This ${title.toLowerCase()} is cancelled.</p>` : ''}
${seller.complete ? '' : '<p class="flag">The seller\'s registration details are being completed; a full VAT invoice is available on request.</p>'}
<table><thead><tr><th>Item</th><th class="n">Net</th><th class="n">VAT</th><th class="n">VAT amount</th><th class="n">Total</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr><td>Total</td><td class="n">${money(invoice.amount_net, invoice.currency)}</td><td></td><td class="n">${money(invoice.amount_vat, invoice.currency)}</td><td class="n">${money(invoice.amount_gross, invoice.currency)}</td></tr></tfoot></table>
<p class="muted">${esc(VAT_NOTE[invoice.vat_scheme])} Paid by card or local payment method via Stripe. Stripe checkout ${esc(invoice.checkout_session_id.slice(0, 16))}….</p>
<p class="noprint muted">To keep a PDF copy, use your browser's Print and choose "Save as PDF".</p></body></html>`;
}
