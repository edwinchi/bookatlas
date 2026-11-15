import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { logger } from '../../lib/logger.js';
import { bookatlasDb } from '../db/supabaseClient.js';
import { validateCart } from './checkout.js';
import { issueInvoice } from './invoices.js';
import { PaymentError, markRefunded, recordPaid } from './purchases.js';
import { markInvoiceRefunded } from './invoices.js';

/**
 * Crypto payments through CoinGate (owner decision 2026-11-15: EU-based, MiCA-regulated, paid out in EUR).
 * Prices stay in euros; the reader pays the equivalent in BTC, ETH, USDC and other coins on CoinGate's page;
 * CoinGate converts at once and pays BooksAtlas in EUR, so BooksAtlas never holds crypto. A book opens only
 * when CoinGate's API itself reports the order paid (the callback alone is never trusted). Invoices and VAT
 * are the same as for card payments.
 */

export type CryptoStatus = 'new' | 'pending' | 'confirming' | 'paid' | 'invalid' | 'expired' | 'canceled' | 'refunded';
export interface CryptoOrder {
  id: string; user_id: string; email: string | null; name: string | null; book_ids: string[];
  lines: { bookId: string; title: string; gross: number }[]; amount_cents: number; waiver_at: string;
  callback_token: string; coingate_id: number | null; status: CryptoStatus; created_at: string; updated_at: string;
}

export interface CoinGateClient {
  createOrder(params: Record<string, string>): Promise<{ id: number; payment_url: string; status: string }>;
  getOrder(id: number): Promise<{ id: number; order_id: string; status: string; price_amount: string; price_currency: string }>;
}
let clientOverride: CoinGateClient | null = null;
export function setCoinGateClient(c: CoinGateClient | null) { clientOverride = c; }

export const cryptoConfigured = () => !!clientOverride || !!process.env.COINGATE_API_TOKEN?.trim();
function client(): CoinGateClient {
  if (clientOverride) return clientOverride;
  const token = process.env.COINGATE_API_TOKEN?.trim();
  if (!token) throw new PaymentError('Crypto payments are not set up yet.', 503);
  const base = process.env.COINGATE_ENV === 'sandbox' ? 'https://api-sandbox.coingate.com/v2' : 'https://api.coingate.com/v2';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const call = async (path: string, init: RequestInit = {}): Promise<any> => {
    const res = await fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) throw new PaymentError(`CoinGate: ${body?.message ?? res.status}`, 503);
    return body;
  };
  return {
    createOrder: (params) => call('/orders', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() }),
    getOrder: (id) => call(`/orders/${id}`),
  };
}

const memory = new Map<string, CryptoOrder>();
const db = () => bookatlasDb;
async function save(o: CryptoOrder) {
  if (!db()) { memory.set(o.id, structuredClone(o)); return; }
  const r = await db()!.from('crypto_orders').upsert(o);
  if (r.error) throw new PaymentError('The crypto order could not be saved.', 503);
}
export async function getCryptoOrder(id: string): Promise<CryptoOrder | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  if (!db()) return structuredClone(memory.get(id) ?? null);
  const r = await db()!.from('crypto_orders').select('*').eq('id', id).maybeSingle();
  if (r.error) throw new PaymentError('The crypto order could not be read.', 503);
  return r.data as CryptoOrder | null;
}

/** Start a crypto payment for the cart: same checks and server prices as card checkout; returns CoinGate's page. */
export async function createCryptoCheckout(who: Identity, requested: unknown, findBook: (id: string) => Promise<Book | null | undefined>, appUrl: string, withdrawalWaiver?: unknown) {
  const { ids, books, waiverAt } = await validateCart(who, requested, findBook, withdrawalWaiver);
  const lines = books.map((b) => ({ bookId: b.id, title: b.title, gross: Math.round(b.price * 100) }));
  const amount = lines.reduce((n, l) => n + l.gross, 0);
  const now = new Date().toISOString();
  const order: CryptoOrder = {
    id: randomUUID(), user_id: who.id, email: who.email, name: who.name || null, book_ids: ids, lines, amount_cents: amount,
    waiver_at: waiverAt, callback_token: randomBytes(24).toString('base64url'), coingate_id: null, status: 'new', created_at: now, updated_at: now,
  };
  await save(order);
  const cg = await client().createOrder({
    order_id: order.id,
    price_amount: (amount / 100).toFixed(2),
    price_currency: 'EUR',
    receive_currency: 'EUR',
    title: books.length === 1 ? books[0]!.title.slice(0, 150) : `${books.length} eBooks on BooksAtlas`,
    description: books.map((b) => b.title).join(', ').slice(0, 500),
    callback_url: `${appUrl}/api/crypto/callback`,
    success_url: `${appUrl}/?crypto=paid&order=${order.id}`,
    cancel_url: `${appUrl}/?crypto=cancelled`,
    token: order.callback_token,
    purchaser_email: who.email,
  });
  await save({ ...order, coingate_id: cg.id, status: 'pending', updated_at: new Date().toISOString() });
  return { url: cg.payment_url, id: order.id };
}

const KNOWN: CryptoStatus[] = ['new', 'pending', 'confirming', 'paid', 'invalid', 'expired', 'canceled', 'refunded'];

/** Ask CoinGate for the order's real status and, when paid, unlock the books and issue the invoice (idempotent). */
async function settle(order: CryptoOrder) {
  if (!order.coingate_id) return order;
  const cg = await client().getOrder(order.coingate_id);
  if (cg.order_id !== order.id) throw new PaymentError('The crypto order does not match.', 400);
  const status = (KNOWN.includes(cg.status as CryptoStatus) ? cg.status : order.status) as CryptoStatus;
  if (status === 'paid' && order.status !== 'paid') {
    // The amount CoinGate reports must be the euro price the server set.
    if (cg.price_currency !== 'EUR' || Math.round(Number(cg.price_amount) * 100) !== order.amount_cents) throw new PaymentError('The paid amount does not match the order.', 400);
    const session = `cg_${order.coingate_id}`;
    await recordPaid(order.lines.map((l) => ({ user_id: order.user_id, book_id: l.bookId, checkout_session_id: session, payment_intent_id: session, amount_total: l.gross, currency: 'eur' })));
    await issueInvoice({
      checkoutSessionId: session, paymentIntentId: session, userId: order.user_id, buyerEmail: order.email, buyerName: order.name,
      buyerCountry: null, currency: 'eur', withdrawalWaiverAt: order.waiver_at, lines: order.lines,
    }).catch((err) => logger.error({ err, event: 'payments.invoice_failed', crypto: order.id }, 'Crypto invoice failed'));
    logger.info({ event: 'payments.crypto_paid', order: order.id, books: order.lines.length }, 'Crypto payment fulfilled');
  }
  const next = { ...order, status, updated_at: new Date().toISOString() };
  if (status !== order.status) await save(next);
  return next;
}

/** CoinGate's callback: the token proves it is about our order; the status is then read from CoinGate's API. */
export async function handleCryptoCallback(body: Record<string, unknown>) {
  const order = await getCryptoOrder(String(body.order_id ?? ''));
  const given = Buffer.from(String(body.token ?? ''));
  if (!order || given.length !== Buffer.from(order.callback_token).length || !timingSafeEqual(given, Buffer.from(order.callback_token))) {
    logger.warn({ event: 'payments.crypto_callback_rejected' }, 'Crypto callback with an unknown order or wrong token');
    throw new PaymentError('Unknown order.', 400);
  }
  if (order.coingate_id && Number(body.id) !== order.coingate_id) throw new PaymentError('Unknown order.', 400);
  await settle(order);
  return { received: true };
}

/** The buyer's success page asks too, so a delayed callback does not delay the book. */
export async function cryptoOrderStatus(who: Identity, id: string) {
  const order = await getCryptoOrder(id);
  if (!order || order.user_id !== who.id) throw new PaymentError('Unknown order.', 404);
  const now = order.status === 'paid' ? order : await settle(order);
  return { paid: now.status === 'paid', pending: ['new', 'pending', 'confirming'].includes(now.status), status: now.status, bookIds: now.book_ids };
}

/** Crypto orders carry "cg_<CoinGate id>" where card orders carry a Stripe payment intent. */
export const isCryptoPayment = (paymentIntentId: string | null | undefined) => !!paymentIntentId?.startsWith('cg_');

/**
 * Approving a refund of a crypto order: CoinGate refunds are sent from the CoinGate dashboard (the buyer gives
 * a wallet address there), so BooksAtlas closes access and marks the order and invoice refunded.
 */
export async function refundCryptoPayment(paymentIntentId: string) {
  if (!isCryptoPayment(paymentIntentId)) throw new PaymentError('This is not a crypto order.', 409);
  await markRefunded(paymentIntentId);
  await markInvoiceRefunded(paymentIntentId);
  const coingateId = Number(paymentIntentId.slice(3));
  if (db()) await db()!.from('crypto_orders').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('coingate_id', coingateId);
  else for (const o of memory.values()) if (o.coingate_id === coingateId) o.status = 'refunded';
  logger.info({ event: 'payments.crypto_refund_approved', coingateId }, 'Crypto refund approved: send it from the CoinGate dashboard');
}
