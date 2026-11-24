import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
process.env.UNSUBSCRIBE_TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET;
const WEBHOOK_SECRET = 'whsec_synthetic_test_secret_for_bookatlas_payments';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
const LULU_SECRET = 'synthetic-lulu-secret-for-tests';
process.env.LULU_CLIENT_SECRET = LULU_SECRET;

import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';
import type { StripeClient } from '../../artifacts/api-server/src/bookatlas/payments/checkout.ts';
import type { LuluClient } from '../../artifacts/api-server/src/bookatlas/print/lulu.ts';
import { stripeWebhooks } from '../../artifacts/api-server/src/bookatlas/payments/testFixtures.ts';

// Stripe: real webhook signing, fake sessions (as in payments.test.ts).
const sessions = new Map<string, Record<string, any>>();
const created: Record<string, any>[] = [];
const stripe = {
  checkout: {
    sessions: {
      create: async (params: Record<string, any>) => {
        created.push(params);
        const id = `cs_test_${'p'.repeat(20)}${created.length}`;
        sessions.set(id, { id, object: 'checkout.session', status: 'open', payment_status: 'unpaid', client_reference_id: params.client_reference_id, metadata: params.metadata, payment_intent: `pi_print_${created.length}`, line_items: params.line_items });
        return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
      },
      retrieve: async (id: string) => sessions.get(id),
      listLineItems: async () => ({ data: [] }),
    },
  },
  webhooks: stripeWebhooks,
} as unknown as StripeClient;

// Lulu: a stand-in printer that records what it is asked.
const jobs: Record<string, any>[] = [];
let jobStatus = 'PRODUCTION_READY';
let failNextJob = false;
const lulu: LuluClient = {
  async cost({ quantity, address }) {
    return { currency: 'EUR', printExcl: 420 * quantity, fulfilmentExcl: 150, shippingExcl: address.countryCode === 'NL' ? 450 : 900, totalIncl: 0 };
  },
  async createJob(input) {
    if (failNextJob) { failNextJob = false; throw new Error('Printer offline'); }
    jobs.push(input);
    return { id: 9000 + jobs.length, status: 'CREATED', tracking: [] };
  },
  async getJob(id) {
    return { id, status: jobStatus, tracking: jobStatus === 'SHIPPED' ? [{ id: 'TRACK123', urls: ['https://tracking.example/TRACK123'], carrier: 'PostNL' }] : [] };
  },
  async validateInterior() { return { id: 1, status: 'VALIDATED', pageCount: 212, errors: [] }; },
  async interiorCheck() { return { id: 1, status: 'VALIDATED', pageCount: 212, errors: [] }; },
  async validateCover() { return { id: 2, status: 'NORMALIZED', errors: [] }; },
  async coverCheck() { return { id: 2, status: 'NORMALIZED', errors: [] }; },
  async coverDimensions() { return { widthMm: 330.6, heightMm: 234.95 }; },
};

let setStripeClient: (c: StripeClient | null) => void = () => undefined;
let setLuluClient: (c: LuluClient | null) => void = () => undefined;
before(async () => {
  ({ setStripeClient } = await import('../../artifacts/api-server/src/bookatlas/payments/checkout.ts'));
  ({ setLuluClient } = await import('../../artifacts/api-server/src/bookatlas/print/lulu.ts'));
  setStripeClient(stripe);
  setLuluClient(lulu);
});
after(async () => {
  setStripeClient(null);
  setLuluClient(null);
  delete process.env.LULU_CLIENT_SECRET;
  await closeSharedTestServer();
});

const json = (body: unknown, role = 'reader', method = 'POST') => ({ method, headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body) });
const as = (role: string) => ({ headers: { 'x-test-role': role } });
const pdf = (label: string) => new TextEncoder().encode(`%PDF-1.4\n% ${label}\n%%EOF\n`);
const address = { name: 'Rea Der', street1: 'Damrak 1', city: 'Amsterdam', postcode: '1012 LG', countryCode: 'NL', phone: '+31 6 1234 5678' };

async function publishBook(fetch: (path: string, init?: RequestInit) => Promise<Response>) {
  const file = epub2(5);
  const intake = {
    title: 'The Printed Codex', author: 'Ada Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
    categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
    price: 4.99, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
  };
  const submission = await (await fetch('/api/ebook-submissions', json({ intake, fileName: 'printed.epub', size: file.byteLength }, 'admin'))).json();
  for (let part = 0; part < submission.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${submission.id}/upload/${part}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'admin' }, body: file.subarray(part * submission.partBytes, (part + 1) * submission.partBytes) });
  }
  await fetch(`/api/ebook-submissions/${submission.id}/prepare`, json({}, 'admin'));
  return (await (await fetch(`/api/ebook-submissions/${submission.id}/publish`, json({}, 'admin'))).json()).bookId as string;
}

async function upload(fetch: (path: string, init?: RequestInit) => Promise<Response>, bookId: string, kind: 'interior' | 'cover', bytes: Uint8Array) {
  const start = await (await fetch(`/api/print/editions/${bookId}/files/${kind}/start`, json({ size: bytes.byteLength }, 'admin'))).json();
  assert.equal(start.method, 'PUT');
  const res = await fetch(start.url, { method: 'PUT', headers: { 'content-type': 'application/pdf', 'x-test-role': 'admin' }, body: bytes });
  assert.equal(res.status, 200, await res.clone().text());
  return res.json();
}

function signedStripe(type: string, object: Record<string, unknown>) {
  const payload = JSON.stringify({ id: `evt_${type}_${Date.now()}`, object: 'event', type, data: { object } });
  return { payload, header: stripeWebhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) };
}

test('printed books: the author sets up the edition, a reader orders copies, Lulu prints and ships them', async () => {
  const { fetch } = await getSharedTestServer();
  assert.equal((await (await fetch('/api/print/config')).json()).enabled, true);
  const bookId = await publishBook(fetch);
  assert.equal((await fetch(`/api/print/editions/${bookId}`, as('reader'))).status, 404, 'only the author (or the owner) manages the printed edition');

  // Format and price first; the files are still missing, so nothing is on sale.
  let edition = await (await fetch(`/api/print/editions/${bookId}`, json({ trimSize: '6x9', paper: 'cream', binding: 'paperback', price: 14.99 }, 'admin', 'PUT'))).json();
  assert.equal(edition.onSale, false);
  assert.ok(edition.missing.some((m: string) => /interior PDF/.test(m)));
  const notPdf = await fetch(`/api/print/editions/${bookId}/files/interior/start`, json({ size: 999_999_999 }, 'admin'));
  assert.equal(notPdf.status, 413, 'files over 50 MB are refused before upload');

  edition = await upload(fetch, bookId, 'interior', pdf('interior'));
  assert.equal(edition.edition.pageCount, 212, 'the page count comes from the printer\'s check');
  assert.equal(edition.edition.checks.interior.status, 'passed');
  assert.equal(edition.edition.unitCostExclCents, 570, 'one copy: printing + fulfilment');
  edition = await upload(fetch, bookId, 'cover', pdf('cover'));
  assert.equal(edition.edition.checks.cover.status, 'passed');
  assert.deepEqual(edition.coverDimensions, { widthMm: 330.6, heightMm: 234.95 });
  assert.equal(edition.onSale, true, edition.missing.join(' '));

  const tooCheap = await fetch(`/api/print/editions/${bookId}`, json({ price: 5 }, 'admin', 'PUT'));
  assert.equal(tooCheap.status, 422, 'a price below the printing cost is refused');
  assert.match((await tooCheap.json()).error, /€6\.79/);

  const card = await (await fetch(`/api/catalog/books/${bookId}`)).json();
  assert.deepEqual((card.book ?? card).printEdition, { price: 14.99, binding: 'paperback', trimSize: '6x9', paper: 'cream', pageCount: 212 }, 'the book page offers printed copies');

  // The reader asks for a price: two copies to Amsterdam.
  const bad = await fetch('/api/print/quote', json({ bookId, quantity: 2, shippingLevel: 'MAIL', address: { ...address, phone: '' } }));
  assert.equal(bad.status, 422);
  const quote = await (await fetch('/api/print/quote', json({ bookId, quantity: 2, shippingLevel: 'MAIL', address }))).json();
  assert.deepEqual({ unit: quote.unitPriceCents, books: quote.booksCents, shipping: quote.shippingCents, total: quote.totalCents, vat: quote.vatRateBp },
    { unit: 1499, books: 2998, shipping: 491, total: 3489, vat: 900 });
  assert.equal(quote.authorShare, undefined, 'readers never see costs or the author\'s share');

  // Checkout: the copies and the delivery, priced on the server.
  const order = await (await fetch('/api/print/orders', json({ bookId, quantity: 2, shippingLevel: 'MAIL', address }))).json();
  const params = created.at(-1)!;
  assert.equal(params.metadata.kind, 'print');
  assert.deepEqual(params.line_items.map((l: any) => [l.quantity, l.price_data.unit_amount, l.price_data.tax_behavior]), [[2, 1499, 'inclusive'], [1, 491, 'inclusive']]);
  assert.equal((await (await fetch('/api/print/orders', as('reader'))).json()).orders.length, 0, 'unpaid orders are not listed');

  // Paid: the order goes to the printer once, however often Stripe retries.
  const sessionId = new URL(order.url).pathname.split('/').pop()!;
  Object.assign(sessions.get(sessionId)!, { status: 'complete', payment_status: 'paid', currency: 'eur', customer_details: { email: 'reader@example.com', name: 'Rea Der', address: { country: 'NL' } } });
  for (let i = 0; i < 2; i += 1) {
    const ev = signedStripe('checkout.session.completed', sessions.get(sessionId)!);
    assert.equal((await fetch('/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': ev.header }, body: ev.payload })).status, 200);
  }
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]!.podPackageId, '0600X0900BWSTDPB060UC444MXX');
  assert.equal(jobs[0]!.quantity, 2);
  assert.equal(jobs[0]!.address.countryCode, 'NL');
  assert.match(jobs[0]!.interiorUrl, /interior/);
  let mine = (await (await fetch('/api/print/orders', as('reader'))).json()).orders;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].status, 'submitted');

  // One invoice: two printed copies and the delivery, Dutch 9% VAT.
  const invoice = (await (await fetch('/api/invoices', as('reader'))).json()).invoices.find((i: any) => i.grossCents === 3489);
  assert.ok(invoice, 'the order has an invoice');
  assert.equal(invoice.books.length, 2, 'the delivery line is not listed as a book');
  const html = await (await fetch(`/api/invoices/${invoice.seq}`, as('reader'))).text();
  assert.match(html, /Printed book, printed on demand and shipped/);

  // The author earns 81% of each copy's price excluding VAT, after printing: (1375 − 495) × 0.81 = 713 a copy.
  const sales = await (await fetch('/api/author/sales', as('admin'))).json();
  const printed = sales.books.find((b: any) => b.bookId === `${bookId}.print`);
  assert.deepEqual({ units: printed.units, share: printed.shareCents }, { units: 2, share: 1426 });

  // Lulu reports the shipment; the webhook must be signed.
  const body = JSON.stringify({ topic: 'PRINT_JOB_STATUS_CHANGED', data: { id: 9001 } });
  assert.equal((await fetch('/api/lulu/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'lulu-hmac-sha256': 'forged' }, body })).status, 401);
  jobStatus = 'SHIPPED';
  const sig = createHmac('sha256', LULU_SECRET).update(body).digest('hex');
  assert.equal((await fetch('/api/lulu/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'lulu-hmac-sha256': sig }, body })).status, 200);
  mine = (await (await fetch('/api/print/orders', as('reader'))).json()).orders;
  assert.equal(mine[0].status, 'shipped');
  assert.deepEqual(mine[0].tracking, [{ id: 'TRACK123', urls: ['https://tracking.example/TRACK123'], carrier: 'PostNL' }]);

  // An order the printer could not take waits for the owner, who sends it again.
  failNextJob = true;
  jobStatus = 'PRODUCTION_READY';
  const second = await (await fetch('/api/print/orders', json({ bookId, quantity: 1, shippingLevel: 'MAIL', address }))).json();
  const secondId = new URL(second.url).pathname.split('/').pop()!;
  Object.assign(sessions.get(secondId)!, { status: 'complete', payment_status: 'paid', currency: 'eur', customer_details: { email: 'reader@example.com', name: 'Rea Der', address: { country: 'NL' } } });
  assert.equal((await (await fetch('/api/print/confirm', json({ sessionId: secondId }))).json()).paid, true, 'the success page fulfils too');
  assert.equal((await fetch('/api/manager/print-orders', as('reader'))).status, 403);
  const managed = (await (await fetch('/api/manager/print-orders', as('admin'))).json()).orders;
  const stuck = managed.find((o: any) => o.status === 'needs_attention');
  assert.ok(stuck, 'the failed order is flagged for the owner');
  assert.match(stuck.error, /Printer offline/);
  const retried = await (await fetch(`/api/manager/print-orders/${stuck.id}/retry`, json({}, 'admin'))).json();
  assert.equal(retried.status, 'submitted');
  assert.equal(jobs.length, 2);

  // Taking the edition off sale removes it from the book page.
  await fetch(`/api/print/editions/${bookId}`, json({ wanted: false }, 'admin', 'PUT'));
  const after = await (await fetch(`/api/catalog/books/${bookId}`)).json();
  assert.equal((after.book ?? after).printEdition, undefined);
  assert.equal((await fetch('/api/print/quote', json({ bookId, quantity: 1, shippingLevel: 'MAIL', address }))).status, 404);
});
