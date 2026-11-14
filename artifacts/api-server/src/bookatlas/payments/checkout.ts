import Stripe from 'stripe';
import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { logger } from '../../lib/logger.js';
import { PaymentError, markRefunded, purchasedBookIds, recordPaid } from './purchases.js';

/** The parts of the Stripe client BookAtlas uses; tests substitute a fake. */
export type StripeClient = {
  checkout: { sessions: Pick<Stripe['checkout']['sessions'], 'create' | 'retrieve' | 'listLineItems'> };
  webhooks: Pick<Stripe['webhooks'], 'constructEvent'>;
};

let client: StripeClient | null = null;
export function setStripeClient(next: StripeClient | null) { client = next; }

/** Live only with both the key and the webhook secret: a paid order must always be fulfilled. */
export const paymentsConfigured = () => !!client || (!!process.env.STRIPE_SECRET_KEY?.trim() && !!process.env.STRIPE_WEBHOOK_SECRET?.trim());
/** Stripe Tax stays off until the owner has added the tax registrations in Stripe (STRIPE_TAX=on). */
const taxEnabled = () => process.env.STRIPE_TAX?.trim() === 'on';
/** Stripe tax code "Digital Books - downloaded - non subscription - with permanent rights", set by BookAtlas on every eBook. */
export const EBOOK_TAX_CODE = 'txcd_10302000';
/** iDEAL charges in euros only; Adaptive Pricing in Stripe shows other buyers their own currency. */
const CURRENCY = 'eur';
const MAX_BOOKS = 20;
/** The Stripe account also serves other sites; their events reach this webhook too and are ignored. */
const APP_TAG = 'bookatlas';

function stripe(): StripeClient {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new PaymentError('Payments are not set up yet.', 503);
  client = new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
  return client;
}

/** Only real BookAtlas eBooks with a prepared file are sold; the demo catalogue is not. */
const sellable = (book: Book | null | undefined): book is Book => !!book?.hasReaderContent && book.price > 0;

export async function createCheckout(who: Identity, requested: unknown, findBook: (id: string) => Promise<Book | null | undefined>, appUrl: string) {
  const ids = [...new Set(Array.isArray(requested) ? requested.map(String) : [])];
  if (!ids.length || ids.length > MAX_BOOKS) throw new PaymentError(`Choose between 1 and ${MAX_BOOKS} books.`);
  const books = await Promise.all(ids.map((id) => findBook(id)));
  const unsellable = books.findIndex((b) => !sellable(b));
  if (unsellable >= 0) {
    const title = books[unsellable]?.title;
    throw new PaymentError(title ? `"${title}" is a preview title and cannot be bought yet. Remove it from your cart.` : 'One of these books is no longer available.', 422);
  }
  const owned = new Set(await purchasedBookIds(who.id));
  const already = (books as Book[]).find((b) => owned.has(b.id));
  if (already) throw new PaymentError(`You already own "${already.title}".`, 409);

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    client_reference_id: who.id,
    customer_email: who.email,
    line_items: (books as Book[]).map((book) => ({
      quantity: 1,
      price_data: {
        currency: CURRENCY,
        // Prices are set on the server from the catalogue, VAT included as EU consumer prices must be.
        unit_amount: Math.round(book.price * 100),
        tax_behavior: 'inclusive',
        product_data: {
          name: book.title,
          tax_code: EBOOK_TAX_CODE,
          metadata: { bookId: book.id },
          ...(book.coverImage.startsWith('/') && appUrl.startsWith('https://') ? { images: [`${appUrl}${book.coverImage}`] } : {}),
        },
      },
    })),
    automatic_tax: { enabled: taxEnabled() },
    // BookAtlas, not Stripe, is the seller and sets VAT-inclusive prices. The Stripe account enables Managed
    // Payments (Stripe as merchant of record) by default, which refuses automatic_tax[enabled]=false.
    managed_payments: { enabled: false },
    allow_promotion_codes: true,
    metadata: { app: APP_TAG, userId: who.id, bookIds: ids.join(',') },
    payment_intent_data: { metadata: { app: APP_TAG, userId: who.id, bookIds: ids.join(',') } },
    success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/?checkout=cancelled`,
  });
  if (!session.url) throw new PaymentError('Stripe did not return a checkout page. Please retry.', 503);
  return { url: session.url, id: session.id };
}

/** Store every book of a paid session. Called by the webhook and by the success page; both are idempotent. */
async function fulfil(session: Stripe.Checkout.Session) {
  if (session.metadata?.app !== APP_TAG) return false;
  if (session.payment_status !== 'paid' || !session.client_reference_id) return false;
  const items = await stripe().checkout.sessions.listLineItems(session.id, { limit: 100, expand: ['data.price.product'] });
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
  const lines = items.data.flatMap((item) => {
    const product = item.price?.product;
    const bookId = product && typeof product === 'object' && 'metadata' in product ? product.metadata?.bookId : undefined;
    return bookId ? [{
      user_id: session.client_reference_id!, book_id: bookId, checkout_session_id: session.id,
      payment_intent_id: paymentIntent, amount_total: item.amount_total, currency: item.currency,
    }] : [];
  });
  await recordPaid(lines);
  logger.info({ event: 'payments.fulfilled', session: session.id, books: lines.length }, 'Checkout fulfilled');
  return true;
}

export async function handleWebhook(rawBody: Buffer, signature: string | undefined) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new PaymentError('Payments are not set up yet.', 503);
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature ?? '', secret);
  } catch {
    logger.warn({ event: 'payments.webhook_rejected' }, 'Stripe webhook with an invalid signature');
    throw new PaymentError('Invalid Stripe signature.', 400);
  }
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await fulfil(event.data.object);
      break;
    case 'charge.refunded': {
      const charge = event.data.object;
      const intent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (charge.refunded && intent) {
        await markRefunded(intent);
        logger.info({ event: 'payments.refunded', paymentIntent: intent }, 'Purchase refunded; the book is locked again');
      }
      break;
    }
    default:
      break;
  }
  return { received: true };
}

/** The success page asks whether the payment went through; paid sessions are fulfilled here too. */
export async function checkoutStatus(who: Identity, sessionId: string) {
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) throw new PaymentError('Unknown checkout.', 404);
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== who.id) throw new PaymentError('Unknown checkout.', 404);
  const paid = await fulfil(session);
  return {
    paid,
    pending: !paid && session.status === 'complete',
    bookIds: (session.metadata?.bookIds ?? '').split(',').filter(Boolean),
  };
}
