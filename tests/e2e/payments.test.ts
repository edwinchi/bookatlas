import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
process.env.UNSUBSCRIBE_TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET;
const WEBHOOK_SECRET = 'whsec_synthetic_test_secret_for_bookatlas_payments';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';
import type { StripeClient } from '../../artifacts/api-server/src/bookatlas/payments/checkout.ts';
import { stripeWebhooks } from '../../artifacts/api-server/src/bookatlas/payments/testFixtures.ts';

// Stripe's own signing, so the webhook check is the real one; sessions come from a fake.
const realWebhooks = stripeWebhooks;
const sessions = new Map<string, Record<string, any>>();
const created: Record<string, any>[] = [];
const fake = {
  checkout: {
    sessions: {
      create: async (params: Record<string, any>) => {
        created.push(params);
        const id = `cs_test_${'a'.repeat(20)}${created.length}`;
        sessions.set(id, { id, object: 'checkout.session', status: 'open', payment_status: 'unpaid', client_reference_id: params.client_reference_id, metadata: params.metadata, payment_intent: `pi_test_${created.length}`, line_items: params.line_items });
        return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
      },
      retrieve: async (id: string) => sessions.get(id),
      listLineItems: async (id: string) => ({
        data: sessions.get(id)!.line_items.map((line: any) => ({
          amount_total: line.price_data.unit_amount, currency: line.price_data.currency,
          price: { product: { metadata: line.price_data.product_data.metadata } },
        })),
      }),
    },
  },
  webhooks: realWebhooks,
} as unknown as StripeClient;
// Import the way the server does (ES module), so the fake reaches the same module instance.
let setStripeClient: (client: StripeClient | null) => void = () => undefined;
before(async () => {
  ({ setStripeClient } = await import('../../artifacts/api-server/src/bookatlas/payments/checkout.ts'));
  setStripeClient(fake);
});

after(async () => {
  setStripeClient(null);
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await closeSharedTestServer();
});

const json = (body: unknown, role = 'reader') => ({
  method: 'POST', headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body),
});
const as = (role: string) => ({ headers: { 'x-test-role': role } });

/** An admin publishes a paid prepared book, so the test reader is a buyer, not its author. */
async function publishPaidBook(fetch: (path: string, init?: RequestInit) => Promise<Response>) {
  const file = epub2(5);
  const intake = {
    title: 'The Bought Codex', author: 'Ada Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
    categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
    price: 4.99, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
  };
  const submission = await (await fetch('/api/ebook-submissions', json({ intake, fileName: 'bought.epub', size: file.byteLength }, 'admin'))).json();
  for (let part = 0; part < submission.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${submission.id}/upload/${part}`, {
      method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'admin' },
      body: file.subarray(part * submission.partBytes, (part + 1) * submission.partBytes),
    });
  }
  const prepared = await (await fetch(`/api/ebook-submissions/${submission.id}/prepare`, json({}, 'admin'))).json();
  assert.equal(prepared.status, 'ready', 'without an EPUBCheck worker a clean book goes straight to review');
  const published = await (await fetch(`/api/ebook-submissions/${submission.id}/publish`, json({}, 'admin'))).json();
  return published.bookId as string;
}

function signedEvent(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({ id: `evt_${type}_${Date.now()}`, object: 'event', type, data: { object } });
  return { payload, header: realWebhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) };
}

test('buying a prepared eBook through Stripe Checkout unlocks it; a refund locks it again', async () => {
  const { fetch } = await getSharedTestServer();
  assert.deepEqual(await (await fetch('/api/payments/config')).json(), { enabled: true, currency: 'EUR' });
  const bookId = await publishPaidBook(fetch);
  const access = async () => (await (await fetch(`/api/reader/catalog/${bookId}/content`, as('reader'))).json()).access;
  assert.equal(await access(), 'preview');

  const demo = await fetch('/api/checkout/sessions', json({ bookIds: ['atlas-001'] }));
  assert.equal(demo.status, 422, 'demo catalogue titles are not sold');

  const checkout = await fetch('/api/checkout/sessions', json({ bookIds: [bookId, bookId] }));
  assert.equal(checkout.status, 201);
  const { url, id } = await checkout.json();
  assert.match(url, /^https:\/\/checkout\.stripe\.com\//);
  const params = created.at(-1)!;
  assert.equal(params.mode, 'payment');
  assert.equal(params.client_reference_id, 'test-reader-1');
  assert.equal(params.line_items.length, 1, 'duplicates are dropped');
  assert.deepEqual(
    { currency: params.line_items[0].price_data.currency, amount: params.line_items[0].price_data.unit_amount, tax: params.line_items[0].price_data.tax_behavior },
    { currency: 'eur', amount: 499, tax: 'inclusive' }, 'the server sets the price, in euros, VAT included',
  );
  assert.equal(params.payment_method_types, undefined, 'payment methods come from the Stripe dashboard (iDEAL, cards, wallets…)');

  const forged = await fetch('/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=forged' }, body: '{}' });
  assert.equal(forged.status, 400);
  assert.equal(await access(), 'preview');

  assert.equal(params.metadata.app, 'bookatlas', 'BookAtlas checkouts are tagged');
  // Another site on the same Stripe account: its paid session reaches this webhook and is ignored.
  const foreign = signedEvent('checkout.session.completed', { ...sessions.get(id)!, status: 'complete', payment_status: 'paid', metadata: { bookIds: bookId } });
  assert.equal((await fetch('/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': foreign.header }, body: foreign.payload })).status, 200);
  assert.equal(await access(), 'preview', 'an untagged session unlocks nothing');

  Object.assign(sessions.get(id)!, { status: 'complete', payment_status: 'paid' });
  for (let delivery = 0; delivery < 2; delivery += 1) {
    const event = signedEvent('checkout.session.completed', sessions.get(id)!);
    const res = await fetch('/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': event.header }, body: event.payload });
    assert.equal(res.status, 200);
  }
  assert.equal(await access(), 'full');
  assert.deepEqual((await (await fetch('/api/purchases', as('reader'))).json()).bookIds, [bookId], 'a retried webhook stores the purchase once');
  assert.deepEqual(await (await fetch(`/api/checkout/sessions/${id}`, as('reader'))).json(), { paid: true, pending: false, bookIds: [bookId] });
  assert.equal((await fetch(`/api/checkout/sessions/${id}`, as('admin'))).status, 404, 'another account cannot read this checkout');
  assert.equal((await fetch('/api/checkout/sessions', json({ bookIds: [bookId] }))).status, 409, 'already owned');

  const refund = signedEvent('charge.refunded', { id: 'ch_test_1', object: 'charge', refunded: true, payment_intent: sessions.get(id)!.payment_intent });
  assert.equal((await fetch('/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': refund.header }, body: refund.payload })).status, 200);
  assert.equal(await access(), 'preview');
});
