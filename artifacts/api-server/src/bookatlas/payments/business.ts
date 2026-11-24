import { bookatlasDb } from '../db/supabaseClient.js';
import { listSubmissions } from '../ebookPrep/submissions.js';
import { listNarrations } from '../narration/service.js';
import { AUTHOR_SHARE, authorShareOf } from './authorSales.js';
import { memoryInvoices, type Invoice } from './invoices.js';
import { PaymentError } from './purchases.js';

/**
 * The owner's business view (cycle 5, 2026-11-15): revenue, orders, refunds, the commission (19%; 33% before 2026-11-23), narration
 * income against its Gemini cost, VAT to declare, top books and what is owed to each author (81%; 67% for sales before 2026-11-23).
 * Built from invoices, the order record kept for tax. Stripe fees are estimated (cards and iDEAL in the EEA),
 * Gemini costs are converted from US dollars at USD_EUR (default 0.92).
 */

const STRIPE_FEE = { percent: 0.015, fixedCents: 25 };
const usdToEurCents = (micros: number) => Math.round((micros / 1_000_000) * Number(process.env.USD_EUR || 0.92) * 100);

type Period = 'month' | 'quarter' | 'year' | 'all';
function periodStart(period: Period, now: Date) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  if (period === 'month') return new Date(Date.UTC(y, m, 1));
  if (period === 'quarter') return new Date(Date.UTC(y, m - (m % 3), 1));
  if (period === 'year') return new Date(Date.UTC(y, 0, 1));
  return new Date(0);
}

async function allInvoices(): Promise<Invoice[]> {
  if (!bookatlasDb) return memoryInvoices();
  const r = await bookatlasDb.from('invoices').select('seq,issued_at,status,vat_scheme,vat_rate_bp,amount_gross,amount_net,amount_vat,lines,buyer_country').order('seq', { ascending: false }).limit(100_000);
  if (r.error) throw new PaymentError('The business figures could not be loaded.', 503);
  return r.data as unknown as Invoice[];
}

export async function businessSummary(users: { total: number; newThisMonth: number }, now = new Date()) {
  const [invoices, submissions, narrations] = await Promise.all([allInvoices(), listSubmissions(), listNarrations()]);
  const owners = new Map<string, { ownerId: string; email: string; author: string }>();
  for (const s of submissions) if (s.book_id) owners.set(s.book_id, { ownerId: s.owner_id, email: s.data.ownerEmail, author: s.data.intake.author });

  const periods = (['month', 'quarter', 'year', 'all'] as Period[]).map((period) => {
    const since = periodStart(period, now).toISOString();
    const inPeriod = invoices.filter((i) => i.issued_at >= since);
    const kept = inPeriod.filter((i) => i.status === 'issued');
    const ebooks = kept.filter((i) => i.vat_scheme !== 'nl-service');
    const services = kept.filter((i) => i.vat_scheme === 'nl-service');
    const ebookNet = ebooks.reduce((n, i) => n + i.amount_net, 0);
    const authorsShare = ebooks.reduce((n, i) => n + i.lines.reduce((m, l) => m + authorShareOf(l.net, i.issued_at), 0), 0);
    const narrationCost = narrations.filter((n) => n.created_at >= since).reduce((m, n) => m + usdToEurCents(n.spent_micros), 0);
    const stripeFees = kept.reduce((n, i) => n + Math.round(i.amount_gross * STRIPE_FEE.percent) + STRIPE_FEE.fixedCents, 0);
    const commission = ebookNet - authorsShare;
    const serviceNet = services.reduce((n, i) => n + i.amount_net, 0);
    return {
      period,
      orders: kept.length,
      refunds: inPeriod.length - kept.length,
      grossCents: kept.reduce((n, i) => n + i.amount_gross, 0),
      vatCents: kept.reduce((n, i) => n + i.amount_vat, 0),
      vat: {
        ebooks9Cents: ebooks.filter((i) => i.vat_rate_bp === 900 || !i.vat_rate_bp).reduce((n, i) => n + i.amount_vat, 0),
        services21Cents: services.reduce((n, i) => n + i.amount_vat, 0),
      },
      ebookSalesNetCents: ebookNet,
      commissionCents: commission,
      authorsShareCents: authorsShare,
      narrationNetCents: serviceNet,
      narrationCostCents: narrationCost,
      stripeFeesEstimateCents: stripeFees,
      /** BooksAtlas's own result: commission + narration income − Gemini cost − estimated Stripe fees. */
      marginCents: commission + serviceNet - narrationCost - stripeFees,
    };
  });

  // Owed to authors: their share of non-refunded sales (81%; 67% before 2026-11-23), all time (payouts are not yet recorded in the app).
  const authors = new Map<string, { ownerId: string; author: string; email: string; units: number; owedCents: number }>();
  const books = new Map<string, { bookId: string; title: string; author: string; units: number; netCents: number }>();
  for (const inv of invoices) {
    if (inv.status !== 'issued' || inv.vat_scheme === 'nl-service') continue;
    for (const l of inv.lines) {
      // The natural audiobook add-on (`<id>.audio`) belongs to the eBook's author.
      const owner = owners.get(l.bookId.replace(/\.audio$/, ''));
      const book = books.get(l.bookId) ?? { bookId: l.bookId, title: l.title, author: owner?.author ?? '', units: 0, netCents: 0 };
      book.units += 1; book.netCents += l.net; books.set(l.bookId, book);
      if (!owner) continue;
      const a = authors.get(owner.ownerId) ?? { ownerId: owner.ownerId, author: owner.author, email: owner.email, units: 0, owedCents: 0 };
      a.units += 1; a.owedCents += authorShareOf(l.net, inv.issued_at); authors.set(owner.ownerId, a);
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1)).toISOString().slice(0, 7));
  const monthly = months.map((month) => {
    const kept = invoices.filter((i) => i.status === 'issued' && i.issued_at.slice(0, 7) === month);
    return { month, grossCents: kept.reduce((n, i) => n + i.amount_gross, 0), orders: kept.length };
  });
  const countries: Record<string, number> = {};
  for (const i of invoices) if (i.status === 'issued') countries[i.buyer_country ?? 'unknown'] = (countries[i.buyer_country ?? 'unknown'] ?? 0) + 1;

  return {
    currency: 'EUR',
    commissionRate: Math.round((1 - AUTHOR_SHARE) * 100),
    users,
    catalogue: { publishedBooks: submissions.filter((s) => s.status === 'published').length, waitingForReview: submissions.filter((s) => s.status === 'ready').length },
    narration: { open: narrations.filter((n) => ['paid', 'approved', 'running'].includes(n.status)).length, done: narrations.filter((n) => n.status === 'done').length },
    periods,
    monthly,
    topBooks: [...books.values()].sort((a, b) => b.netCents - a.netCents).slice(0, 10),
    authorsOwed: [...authors.values()].sort((a, b) => b.owedCents - a.owedCents),
    countries,
    notes: 'Stripe fees are estimated (1.5% + €0.25 per order); Gemini costs are converted from US dollars. Author payouts are not yet recorded in BooksAtlas, so "owed" is everything earned so far.',
  };
}
