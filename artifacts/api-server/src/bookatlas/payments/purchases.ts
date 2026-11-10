import { randomUUID } from 'node:crypto';
import { bookatlasDb } from '../db/supabaseClient.js';

/** One book bought in one Stripe Checkout session; the whole book opens while it is `paid`. */
export interface Purchase {
  id: string;
  user_id: string;
  book_id: string;
  checkout_session_id: string;
  payment_intent_id: string | null;
  /** In the smallest unit of `currency`, VAT included. */
  amount_total: number;
  currency: string;
  status: 'paid' | 'refunded';
  created_at: string;
  updated_at: string;
}

export type PaidLine = Pick<Purchase, 'user_id' | 'book_id' | 'checkout_session_id' | 'payment_intent_id' | 'amount_total' | 'currency'>;

export class PaymentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const memory: Purchase[] = [];
/** Every reader image checks access; keep a buyer's books for a minute instead of querying each time. */
const owned = new Map<string, { ids: string[]; at: number }>();
const OWNED_TTL_MS = 60_000;

/** Idempotent: Stripe retries webhooks and the success page fulfils too, so a line is stored once. */
export async function recordPaid(lines: PaidLine[]) {
  const now = new Date().toISOString();
  const rows: Purchase[] = lines.map((line) => ({ ...line, id: randomUUID(), status: 'paid', created_at: now, updated_at: now }));
  if (!bookatlasDb) {
    for (const row of rows) {
      if (!memory.some((p) => p.checkout_session_id === row.checkout_session_id && p.book_id === row.book_id)) memory.push(row);
    }
  } else {
    const result = await bookatlasDb.from('purchases').upsert(rows, { onConflict: 'checkout_session_id,book_id', ignoreDuplicates: true });
    if (result.error) throw new PaymentError('The purchase could not be saved.', 503);
  }
  for (const line of lines) owned.delete(line.user_id);
}

/** A full refund locks the book again; partial refunds keep access. */
export async function markRefunded(paymentIntentId: string) {
  if (!bookatlasDb) {
    for (const p of memory) if (p.payment_intent_id === paymentIntentId) { p.status = 'refunded'; p.updated_at = new Date().toISOString(); }
  } else {
    const result = await bookatlasDb.from('purchases').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('payment_intent_id', paymentIntentId);
    if (result.error) throw new PaymentError('The refund could not be saved.', 503);
  }
  owned.clear();
}

export async function purchasedBookIds(userId: string): Promise<string[]> {
  const cached = owned.get(userId);
  if (cached && Date.now() - cached.at < OWNED_TTL_MS) return cached.ids;
  let ids: string[];
  if (!bookatlasDb) {
    ids = [...new Set(memory.filter((p) => p.user_id === userId && p.status === 'paid').map((p) => p.book_id))];
  } else {
    const result = await bookatlasDb.from('purchases').select('book_id').eq('user_id', userId).eq('status', 'paid');
    if (result.error) throw new PaymentError('Your purchases could not be read.', 503);
    ids = [...new Set((result.data as { book_id: string }[]).map((r) => r.book_id))];
  }
  if (owned.size > 5000) owned.clear();
  owned.set(userId, { ids, at: Date.now() });
  return ids;
}

/** Every purchase row of one account, refunded ones included, for the reader's data export. */
export async function purchasesOf(userId: string): Promise<Omit<Purchase, 'user_id'>[]> {
  if (!bookatlasDb) return memory.filter((p) => p.user_id === userId).map(({ user_id: _u, ...rest }) => ({ ...rest }));
  const result = await bookatlasDb.from('purchases').select('id,book_id,checkout_session_id,payment_intent_id,amount_total,currency,status,created_at,updated_at').eq('user_id', userId);
  if (result.error) throw new PaymentError('Your purchases could not be read.', 503);
  return result.data as Omit<Purchase, 'user_id'>[];
}

export async function hasPurchase(userId: string, bookId: string) {
  return (await purchasedBookIds(userId)).includes(bookId);
}
