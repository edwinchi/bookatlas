import { bookatlasDb } from '../db/supabaseClient.js';
import { listSubmissions } from '../ebookPrep/submissions.js';
import { PaymentError } from './purchases.js';
import type { Invoice } from './invoices.js';

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

export async function authorSales(userId: string, memoryInvoices: () => Invoice[], now = new Date()) {
  const submissions = await listSubmissions(userId);
  const books = new Map<string, string>();
  for (const s of submissions) if (s.book_id) books.set(s.book_id, s.data.intake.title);
  const invoices = await invoicesForBooks([...books.keys()], memoryInvoices);

  const sales: Sale[] = invoices.flatMap((inv) => inv.lines.filter((l) => books.has(l.bookId)).map((l) => ({
    at: inv.issued_at, bookId: l.bookId, title: books.get(l.bookId) ?? l.title, country: inv.buyer_country,
    gross: l.gross, vat: l.vat, net: l.net, refunded: inv.status === 'refunded',
  })));

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
