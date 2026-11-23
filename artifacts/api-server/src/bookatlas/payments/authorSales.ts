import { bookatlasDb } from '../db/supabaseClient.js';
import { listSubmissions } from '../ebookPrep/submissions.js';
import { PaymentError } from './purchases.js';
import type { Invoice } from './invoices.js';
import { audioId } from '../narration/edition.js';

/**
 * Author sales dashboard (cycle 3, 2026-11-14). An author sees the sales of the books they published:
 * units, refunds, revenue with and without VAT and their share. Pricing R1 (revised 2026-11-14): the author receives 67% of the
 * net eBook price (excluding VAT). Payment fees are not deducted yet, so the share is labelled an estimate.
 * Buyers are never identified to authors; only the country is shown.
 */
/** Owner decision 2026-11-14: BooksAtlas takes a 33% commission on every sale; the author keeps 67%. */
export const AUTHOR_SHARE = 0.67;
const MONTHS = 12;

type Sale = { at: string; bookId: string; title: string; country: string | null; gross: number; vat: number; net: number; refunded: boolean };

async function invoicesForBooks(bookIds: string[], memory: () => Invoice[]): Promise<Invoice[]> {
  const ids = bookIds.filter((id) => /^[\w.-]{1,120}$/.test(id));
  if (!ids.length) return [];
  if (!bookatlasDb) return memory().filter((i) => i.lines.some((l) => ids.includes(l.bookId)));
  const filter = ids.map((id) => `lines.cs.[{"bookId":"${id}"}]`).join(',');
  const result = await bookatlasDb.from('invoices').select('seq,issued_at,status,buyer_country,lines').or(filter).order('seq', { ascending: false }).limit(10_000);
  if (result.error) throw new PaymentError('Sales could not be loaded.', 503);
  return result.data as unknown as Invoice[];
}

const share = (net: number) => Math.round(net * AUTHOR_SHARE);
const monthKey = (iso: string) => iso.slice(0, 7);

/** Every sale line of the author's own published books, newest first (shared by the dashboard, CSV and statements). */
export async function authorSaleRows(userId: string, memoryInvoices: () => Invoice[]) {
  const submissions = await listSubmissions(userId);
  const books = new Map<string, string>();
  const authorNames = new Set<string>();
  for (const s of submissions) if (s.book_id) { books.set(s.book_id, s.data.intake.title); if (s.data.intake.author) authorNames.add(s.data.intake.author); }
  // The natural audiobook add-on (cycle 9) is its own product line, with the same author share.
  const audiobooks = new Map<string, string>();
  for (const [id, title] of books) audiobooks.set(audioId(id), `${title} (natural audiobook)`);
  const invoices = await invoicesForBooks([...books.keys(), ...audiobooks.keys()], memoryInvoices);
  const sold = new Set(invoices.flatMap((inv) => inv.lines.map((l) => l.bookId)));
  for (const [id, title] of audiobooks) if (sold.has(id)) books.set(id, title);
  const sales: Sale[] = invoices.flatMap((inv) => inv.lines.filter((l) => books.has(l.bookId)).map((l) => ({
    at: inv.issued_at, bookId: l.bookId, title: books.get(l.bookId) ?? l.title, country: inv.buyer_country,
    gross: l.gross, vat: l.vat, net: l.net, refunded: inv.status === 'refunded',
  })));
  return { books, sales, authorNames: [...authorNames] };
}

export async function authorSales(userId: string, memoryInvoices: () => Invoice[], now = new Date()) {
  const { books, sales } = await authorSaleRows(userId, memoryInvoices);

  const perBook = [...books.entries()].map(([bookId, title]) => {
    const own = sales.filter((s) => s.bookId === bookId);
    const kept = own.filter((s) => !s.refunded);
    return {
      bookId, title, units: kept.length, refunds: own.length - kept.length,
      grossCents: kept.reduce((n, s) => n + s.gross, 0), vatCents: kept.reduce((n, s) => n + s.vat, 0),
      netCents: kept.reduce((n, s) => n + s.net, 0), shareCents: kept.reduce((n, s) => n + share(s.net), 0),
      lastSaleAt: own[0]?.at ?? null,
    };
  }).sort((a, b) => b.shareCents - a.shareCents || a.title.localeCompare(b.title));

  // The last 12 calendar months, oldest first, including months without sales.
  const months = Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
  const monthly = months.map((month) => {
    const kept = sales.filter((s) => !s.refunded && monthKey(s.at) === month);
    return { month, units: kept.length, netCents: kept.reduce((n, s) => n + s.net, 0), shareCents: kept.reduce((n, s) => n + share(s.net), 0) };
  });

  const window = (days: number) => {
    const since = new Date(now.getTime() - days * 86_400_000).toISOString();
    const kept = sales.filter((s) => !s.refunded && s.at >= since);
    return { units: kept.length, grossCents: kept.reduce((n, s) => n + s.gross, 0), shareCents: kept.reduce((n, s) => n + share(s.net), 0), refunds: sales.filter((s) => s.refunded && s.at >= since).length };
  };
  const kept = sales.filter((s) => !s.refunded);
  return {
    currency: 'EUR',
    authorShare: AUTHOR_SHARE,
    shareNote: 'Your share is 67% of the price excluding VAT (BooksAtlas commission 33%). Payment fees are not deducted yet, so this is an estimate until payouts start.',
    totals: {
      last30Days: window(30),
      last12Months: window(365),
      allTime: { units: kept.length, grossCents: kept.reduce((n, s) => n + s.gross, 0), shareCents: kept.reduce((n, s) => n + share(s.net), 0), refunds: sales.length - kept.length },
    },
    monthly,
    books: perBook,
    recent: sales.slice(0, 20).map((s) => ({ at: s.at, bookId: s.bookId, title: s.title, country: s.country, grossCents: s.gross, shareCents: s.refunded ? 0 : share(s.net), refunded: s.refunded })),
  };
}

// ------------------------------------------------------------------------------------------- CSV export

/** Spreadsheet-safe cell: quoted, and a leading = + - @ cannot start a formula (CSV injection). */
const cell = (v: string | number) => {
  const t = String(v);
  return `"${(/^[=+\-@\t\r]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"`;
};
const euros = (cents: number) => (cents / 100).toFixed(2);

export async function authorSalesCsv(userId: string, memoryInvoices: () => Invoice[]) {
  const { sales } = await authorSaleRows(userId, memoryInvoices);
  const header = ['Date (UTC)', 'Book ID', 'Title', 'Buyer country', 'Price incl. VAT (EUR)', 'VAT (EUR)', 'Price excl. VAT (EUR)', 'Your share (EUR)', 'Status'];
  const rows = sales.map((s) => [s.at.slice(0, 19).replace('T', ' '), s.bookId, s.title, s.country ?? '', euros(s.gross), euros(s.vat), euros(s.net), euros(s.refunded ? 0 : share(s.net)), s.refunded ? 'refunded' : 'paid']);
  // A byte-order mark so Excel opens the euro sign and accents correctly.
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

// ------------------------------------------------------------------------------------------- royalty statements

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** One calendar month of the author's sales, per book. A past month is closed (final). */
export async function royaltyStatement(userId: string, month: string, memoryInvoices: () => Invoice[], now = new Date()) {
  const current = now.toISOString().slice(0, 7);
  if (!MONTH.test(month) || month > current) throw new PaymentError('Choose a month up to this month (YYYY-MM).', 400);
  const { books, sales, authorNames } = await authorSaleRows(userId, memoryInvoices);
  const inMonth = sales.filter((s) => monthKey(s.at) === month);
  const lines = [...books.entries()].map(([bookId, title]) => {
    const own = inMonth.filter((s) => s.bookId === bookId);
    const kept = own.filter((s) => !s.refunded);
    return {
      bookId, title, units: kept.length, refunds: own.length - kept.length, grossCents: kept.reduce((n, s) => n + s.gross, 0),
      vatCents: kept.reduce((n, s) => n + s.vat, 0), netCents: kept.reduce((n, s) => n + s.net, 0), shareCents: kept.reduce((n, s) => n + share(s.net), 0),
    };
  }).filter((l) => l.units || l.refunds);
  const sum = (k: 'units' | 'refunds' | 'grossCents' | 'vatCents' | 'netCents' | 'shareCents') => lines.reduce((n, l) => n + l[k], 0);
  const totals = { units: sum('units'), refunds: sum('refunds'), grossCents: sum('grossCents'), vatCents: sum('vatCents'), netCents: sum('netCents'), shareCents: sum('shareCents') };
  return { month, author: authorNames.join(', '), currency: 'EUR', authorShare: AUTHOR_SHARE, lines, totals, final: month < current };
}

export function renderRoyaltyStatement(st: Awaited<ReturnType<typeof royaltyStatement>>, seller: { name: string; lines: string[] }) {
  const [y, m] = st.month.split('-').map(Number);
  const label = new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const eur = (c: number) => `€${euros(c)}`;
  const pct = Math.round(st.authorShare * 100);
  const rows = st.lines.length
    ? st.lines.map((l) => `<tr><td>${esc(l.title)}</td><td class="n">${l.units}</td><td class="n">${l.refunds}</td><td class="n">${eur(l.grossCents)}</td><td class="n">${eur(l.vatCents)}</td><td class="n">${eur(l.netCents)}</td><td class="n"><b>${eur(l.shareCents)}</b></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">No sales this month.</td></tr>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Royalty statement ${esc(label)} | BooksAtlas</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:860px;margin:24px auto;padding:0 16px;background:#fff}h1{font-size:22px;margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th,td{border-bottom:1px solid #e2e8f0;padding:8px 6px;text-align:left}th{background:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#475569}.n{text-align:right;white-space:nowrap}.empty{color:#64748b;text-align:center}.muted{color:#64748b;font-size:12px;line-height:1.5}.total td{font-weight:bold;border-top:2px solid #0f172a}.head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}.badge{display:inline-block;padding:2px 8px;border-radius:99px;background:${st.final ? '#dcfce7' : '#fef3c7'};font-size:11px;font-weight:bold}.wrap{overflow-x:auto}@media print{.noprint{display:none}}</style></head><body>
<div class="head"><div><p class="muted">BooksAtlas royalty statement</p><h1>${esc(label)}</h1><p>${esc(st.author || 'Author')}</p><span class="badge">${st.final ? 'Month closed' : 'Month in progress'}</span></div>
<div class="muted" style="text-align:right">${[seller.name, ...seller.lines].map(esc).join('<br>')}</div></div>
<div class="wrap"><table><thead><tr><th>Book</th><th class="n">Sold</th><th class="n">Refunded</th><th class="n">Incl. VAT</th><th class="n">VAT</th><th class="n">Excl. VAT</th><th class="n">Your share</th></tr></thead>
<tbody>${rows}<tr class="total"><td>Total</td><td class="n">${st.totals.units}</td><td class="n">${st.totals.refunds}</td><td class="n">${eur(st.totals.grossCents)}</td><td class="n">${eur(st.totals.vatCents)}</td><td class="n">${eur(st.totals.netCents)}</td><td class="n">${eur(st.totals.shareCents)}</td></tr></tbody></table></div>
<p class="muted">Your share is ${pct}% of the price excluding VAT; BooksAtlas keeps a ${100 - pct}% commission. BooksAtlas pays the VAT to the tax authorities. Refunded sales earn nothing. Payment fees are not deducted yet, so amounts are estimates until payouts start. Buyers are never identified.</p>
<p class="noprint muted">To keep a PDF copy, use your browser's Print and choose "Save as PDF".</p></body></html>`;
}
