/**
 * Printed-book orders (owner request 2026-11-24): the reader picks copies, delivery address and speed; the price
 * comes from Lulu's live cost (printing, shipping) and the author's price; the reader pays through Stripe; the paid
 * order goes to Lulu, which prints and ships it. Lulu's status (in production, shipped, tracking) is kept on the
 * order through Lulu's webhook and on request.
 */
import { randomUUID } from 'node:crypto';
import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { logger } from '../../lib/logger.js';
import { bookatlasDb } from '../db/supabaseClient.js';
import { issueInvoice } from '../payments/invoices.js';
import { downloadUrl } from './files.js';
import { editionForOrder, PrintError } from './editions.js';
import { lulu, luluConfigured, validLuluSignature, type LuluJob } from './lulu.js';
import { MAX_COPIES, SHIPPING_LEVELS, isShippingLevel, printOrderSplit, shippingAddressFrom, type ShippingAddress, type ShippingLevel } from './pricing.js';

export type PrintOrderStatus = 'awaiting_payment' | 'paid' | 'submitted' | 'in_production' | 'shipped' | 'canceled' | 'refunded' | 'needs_attention';

export interface PrintOrder {
  id: string;
  user_id: string;
  book_id: string;
  title: string;
  quantity: number;
  shipping_level: ShippingLevel;
  address: ShippingAddress;
  /** Cents: the reader's price per copy, the totals charged and the split (see pricing.ts). */
  quote: { unitPrice: number; bookGross: number; shippingGross: number; totalGross: number; rateBp: number; productionExcl: number; shippingExcl: number; authorShare: number; luluTotalIncl: number };
  status: PrintOrderStatus;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  lulu_job_id: number | null;
  lulu_status: string | null;
  tracking: LuluJob['tracking'];
  error: string | null;
  created_at: string;
  updated_at: string;
}

const memory: PrintOrder[] = [];
export const memoryPrintOrders = () => memory;

async function insert(order: PrintOrder) {
  if (!bookatlasDb) { memory.push(structuredClone(order)); return; }
  const r = await bookatlasDb.from('print_orders').insert(order);
  if (r.error) throw new PrintError('The order could not be saved. Please retry.', 503);
}

async function update(id: string, changes: Partial<PrintOrder>, onlyIfStatus?: PrintOrderStatus[]) {
  const patch = { ...changes, updated_at: new Date().toISOString() };
  if (!bookatlasDb) {
    const o = memory.find((x) => x.id === id);
    if (!o || (onlyIfStatus && !onlyIfStatus.includes(o.status))) return null;
    Object.assign(o, patch);
    return structuredClone(o);
  }
  let q = bookatlasDb.from('print_orders').update(patch).eq('id', id);
  if (onlyIfStatus) q = q.in('status', onlyIfStatus);
  const r = await q.select('*');
  if (r.error) throw new PrintError('The order could not be updated.', 503);
  return ((r.data as PrintOrder[])[0]) ?? null;
}

async function find(column: 'id' | 'lulu_job_id' | 'payment_intent_id', value: string | number): Promise<PrintOrder | null> {
  if (!bookatlasDb) return structuredClone(memory.find((o) => o[column] === value) ?? null);
  const r = await bookatlasDb.from('print_orders').select('*').eq(column, value).limit(1);
  if (r.error) throw new PrintError('The order could not be read.', 503);
  return ((r.data as PrintOrder[])[0]) ?? null;
}

export async function printOrdersOf(userId: string): Promise<PrintOrder[]> {
  if (!bookatlasDb) return memory.filter((o) => o.user_id === userId && o.status !== 'awaiting_payment').map((o) => structuredClone(o)).reverse();
  const r = await bookatlasDb.from('print_orders').select('*').eq('user_id', userId).neq('status', 'awaiting_payment').order('created_at', { ascending: false }).limit(100);
  if (r.error) throw new PrintError('Your printed-book orders could not be read.', 503);
  return r.data as PrintOrder[];
}

export async function allPrintOrders(): Promise<PrintOrder[]> {
  if (!bookatlasDb) return memory.filter((o) => o.status !== 'awaiting_payment').map((o) => structuredClone(o)).reverse();
  const r = await bookatlasDb.from('print_orders').select('*').neq('status', 'awaiting_payment').order('created_at', { ascending: false }).limit(500);
  if (r.error) throw new PrintError('Printed-book orders could not be read.', 503);
  return r.data as PrintOrder[];
}

/** What the reader sees of an order (no costs or author share). */
export const publicOrder = (o: PrintOrder) => ({
  id: o.id, bookId: o.book_id, title: o.title, quantity: o.quantity, shippingLevel: o.shipping_level,
  shipTo: { name: o.address.name, city: o.address.city, countryCode: o.address.countryCode },
  totalCents: o.quote.totalGross, shippingCents: o.quote.shippingGross, status: o.status, tracking: o.tracking, createdAt: o.created_at, updatedAt: o.updated_at,
});

/** The live price of an order, from the author's price and Lulu's cost for this address and speed. */
export async function quoteOrder(who: Identity, body: unknown, findBook: (id: string) => Promise<Book | null>) {
  if (!luluConfigured()) throw new PrintError('Printed copies are not available yet.', 503);
  const b = (body ?? {}) as Record<string, unknown>;
  const bookId = String(b.bookId ?? '');
  const quantity = Number(b.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_COPIES) throw new PrintError(`Order between 1 and ${MAX_COPIES} copies.`);
  const level = b.shippingLevel ?? 'MAIL';
  if (!isShippingLevel(level)) throw new PrintError('Choose a delivery option.');
  let address: ShippingAddress;
  try { address = shippingAddressFrom(b.address, who.email); } catch (err) { throw new PrintError((err as Error).message, 422); }
  const [book, ready] = await Promise.all([findBook(bookId), editionForOrder(bookId)]);
  if (!book?.printEdition || !ready) throw new PrintError('This book is not available in print.', 404);
  const cost = await lulu().cost({ podPackageId: ready.edition.podPackageId, pageCount: ready.edition.pageCount!, quantity, level, address });
  if (cost.currency !== 'EUR') {
    logger.error({ event: 'print.currency', currency: cost.currency }, 'The Lulu account does not bill in euros');
    throw new PrintError('Printed copies are temporarily unavailable.', 503);
  }
  const unitPrice = ready.edition.priceCents!;
  const split = printOrderSplit(unitPrice, quantity, address.countryCode, cost);
  // Never sell below cost: if Lulu's price rose above the author's price, the order is refused (the author is told).
  if (split.marginExcl < 0) {
    logger.warn({ event: 'print.below_cost', book: bookId, marginExcl: split.marginExcl }, 'Print price is below the printing cost');
    throw new PrintError('This printed edition is being repriced. Please try again later.', 409);
  }
  return {
    bookId, title: ready.title, quantity, address, level,
    quote: { unitPrice, bookGross: split.bookGross, shippingGross: split.shippingGross, totalGross: split.totalGross, rateBp: split.rateBp, productionExcl: split.productionExcl, shippingExcl: cost.shippingExcl, authorShare: split.authorShare, luluTotalIncl: cost.totalIncl },
  };
}

export type PrintCheckout = (who: Identity, order: PrintOrder, appUrl: string) => Promise<{ url: string; id: string }>;

export async function createOrder(who: Identity, body: unknown, findBook: (id: string) => Promise<Book | null>, checkout: PrintCheckout, appUrl: string) {
  const q = await quoteOrder(who, body, findBook);
  const now = new Date().toISOString();
  const order: PrintOrder = {
    id: randomUUID(), user_id: who.id, book_id: q.bookId, title: q.title, quantity: q.quantity, shipping_level: q.level, address: q.address,
    quote: q.quote, status: 'awaiting_payment', checkout_session_id: null, payment_intent_id: null, lulu_job_id: null, lulu_status: null,
    tracking: [], error: null, created_at: now, updated_at: now,
  };
  await insert(order);
  const session = await checkout(who, order, appUrl);
  await update(order.id, { checkout_session_id: session.id });
  logger.info({ event: 'print.checkout', order: order.id, book: q.bookId, copies: q.quantity }, 'Printed-book checkout started');
  return { orderId: order.id, url: session.url };
}

/** Stripe reports the order paid: record it, issue the invoice and send it to the printer (idempotent). */
export async function printPaid(paid: { orderId: string; checkoutSessionId: string; paymentIntentId: string | null; userId: string; email: string | null; name: string | null }, appUrl: string) {
  const order = await update(paid.orderId, { status: 'paid', checkout_session_id: paid.checkoutSessionId, payment_intent_id: paid.paymentIntentId }, ['awaiting_payment']);
  if (!order) return; // already handled (webhook and success page both fulfil)
  try {
    const unitCost = Math.round(order.quote.productionExcl / order.quantity);
    await issueInvoice({
      checkoutSessionId: paid.checkoutSessionId, paymentIntentId: paid.paymentIntentId, userId: paid.userId,
      buyerEmail: paid.email ?? order.address.email, buyerName: paid.name ?? order.address.name,
      // Goods: VAT follows where they are delivered.
      buyerCountry: order.address.countryCode, currency: 'eur',
      lines: [
        ...Array.from({ length: order.quantity }, () => ({ bookId: `${order.book_id}.print`, title: `${order.title} (printed copy)`, gross: order.quote.unitPrice, kind: 'print' as const, cost: unitCost })),
        { bookId: 'shipping', title: `Delivery: ${SHIPPING_LEVELS.find((l) => l.id === order.shipping_level)?.label ?? order.shipping_level}`, gross: order.quote.shippingGross, kind: 'shipping' as const },
      ],
    });
  } catch (err) {
    logger.error({ err, event: 'payments.invoice_failed', order: order.id }, 'Print order invoice could not be issued');
  }
  await submitToPrinter(order, appUrl);
}

/** Sends a paid order to Lulu. On failure the order waits for the owner ("needs attention"); nobody is charged twice. */
export async function submitToPrinter(order: PrintOrder, appUrl: string) {
  try {
    const ready = await editionForOrder(order.book_id);
    if (!ready) throw new PrintError('The printed edition is no longer on sale.', 409);
    const job = await lulu().createJob({
      externalId: order.id, email: order.address.email, title: order.title, podPackageId: ready.edition.podPackageId, quantity: order.quantity,
      interiorUrl: await downloadUrl(ready.interiorPath, appUrl), coverUrl: await downloadUrl(ready.coverPath, appUrl),
      level: order.shipping_level, address: order.address,
    });
    const next = await update(order.id, { status: statusFrom(job.status), lulu_job_id: job.id, lulu_status: job.status, tracking: job.tracking, error: null });
    logger.info({ event: 'print.submitted', order: order.id, job: job.id }, 'Printed-book order sent to the printer');
    return next;
  } catch (err) {
    logger.error({ err, event: 'print.submit_failed', order: order.id }, 'Printed-book order could not be sent to the printer');
    return update(order.id, { status: 'needs_attention', error: (err as Error).message.slice(0, 300) });
  }
}

/** Lulu's job statuses, as the reader sees them. UNPAID means Lulu could not charge BooksAtlas's card. */
export function statusFrom(lulu: string): PrintOrderStatus {
  switch (lulu) {
    case 'IN_PRODUCTION': return 'in_production';
    case 'SHIPPED': return 'shipped';
    case 'CANCELED': return 'canceled';
    case 'REJECTED': case 'UNPAID': case 'ERROR': return 'needs_attention';
    default: return 'submitted';
  }
}

async function applyJob(order: PrintOrder, job: LuluJob) {
  if (['refunded', 'canceled'].includes(order.status) && job.status !== 'SHIPPED') return order;
  return update(order.id, { status: statusFrom(job.status), lulu_status: job.status, tracking: job.tracking.length ? job.tracking : order.tracking, error: job.statusMessage && statusFrom(job.status) === 'needs_attention' ? job.statusMessage.slice(0, 300) : null });
}

/** The reader (or the owner) asks for the latest status. */
export async function refreshOrder(who: Identity, id: string) {
  const order = await find('id', id);
  if (!order || (order.user_id !== who.id && who.role !== 'admin')) throw new PrintError('Order not found.', 404);
  if (!order.lulu_job_id || !luluConfigured()) return order;
  return (await applyJob(order, await lulu().getJob(order.lulu_job_id))) ?? order;
}

/** Lulu's PRINT_JOB_STATUS_CHANGED webhook, signed with the API secret. */
export async function handleLuluWebhook(raw: Buffer, signature: string | undefined) {
  if (!validLuluSignature(raw, signature)) throw new PrintError('Invalid signature.', 401);
  let body: { topic?: string; data?: { id?: number } };
  try { body = JSON.parse(raw.toString('utf8')); } catch { throw new PrintError('Invalid body.', 400); }
  const jobId = Number(body.data?.id);
  if (body.topic !== 'PRINT_JOB_STATUS_CHANGED' || !Number.isSafeInteger(jobId)) return { ignored: true };
  const order = await find('lulu_job_id', jobId);
  if (!order) return { ignored: true };
  // The webhook body is only a signal: the status is read back from Lulu.
  await applyJob(order, await lulu().getJob(jobId));
  return { received: true };
}

/** A full Stripe refund marks the order refunded (printing may already have started; the owner decides). */
export async function printRefunded(paymentIntentId: string) {
  const order = await find('payment_intent_id', paymentIntentId);
  if (order) await update(order.id, { status: 'refunded' });
}

/** Owner: send a "needs attention" order to the printer again. */
export async function retryOrder(id: string, appUrl: string) {
  const order = await find('id', id);
  if (!order) throw new PrintError('Order not found.', 404);
  if (order.status !== 'needs_attention' || order.lulu_job_id) throw new PrintError('Only orders that never reached the printer can be sent again.', 409);
  return submitToPrinter(order, appUrl);
}

/** Account export: the reader's printed-book orders, with the delivery address they gave. */
export async function printOrdersForExport(userId: string) {
  return (await printOrdersOf(userId)).map(({ user_id: _u, quote, ...o }) => ({ ...o, totalCents: quote.totalGross, shippingCents: quote.shippingGross }));
}

/**
 * Account erasure: the order stays as a sales record (amounts, country), without the account link or the delivery
 * address. The printer already has the address of an order in progress.
 */
export async function anonymisePrintOrders(userId: string, marker: string) {
  const strip = (o: PrintOrder) => ({ user_id: marker, address: { name: '', street1: '', city: '', postcode: '', countryCode: o.address.countryCode, phone: '', email: '' } as ShippingAddress, updated_at: new Date().toISOString() });
  if (!bookatlasDb) { for (const o of memory) if (o.user_id === userId) Object.assign(o, strip(o)); return; }
  const r = await bookatlasDb.from('print_orders').select('*').eq('user_id', userId);
  if (r.error) throw new PrintError('Printed-book orders could not be read.', 503);
  for (const o of r.data as PrintOrder[]) {
    const u = await bookatlasDb.from('print_orders').update(strip(o)).eq('id', o.id);
    if (u.error) throw new PrintError('Printed-book orders could not be erased.', 503);
  }
}
