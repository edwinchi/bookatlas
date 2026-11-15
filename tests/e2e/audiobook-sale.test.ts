import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
const WEBHOOK_SECRET = 'whsec_synthetic_test_secret_for_bookatlas_audiobook';
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';
import { stripeWebhooks } from '../../artifacts/api-server/src/bookatlas/payments/testFixtures.ts';
import type { StripeClient } from '../../artifacts/api-server/src/bookatlas/payments/checkout.ts';

// Cycle 9: the natural audiobook sold as an add-on to the eBook.
const sessions = new Map<string, Record<string, any>>();
const created: Record<string, any>[] = [];
const fakeStripe = {
  checkout: { sessions: {
    create: async (params: Record<string, any>) => {
      created.push(params);
      const id = `cs_test_${'u'.repeat(20)}${created.length}`;
      sessions.set(id, { id, object: 'checkout.session', status: 'open', payment_status: 'unpaid', client_reference_id: params.client_reference_id, metadata: params.metadata, currency: 'eur', payment_intent: `pi_audio_${created.length}`, line_items: params.line_items });
      return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
    },
    retrieve: async (id: string) => sessions.get(id),
    listLineItems: async (id: string) => ({
      data: sessions.get(id)!.line_items.map((line: any) => ({
        amount_total: line.price_data.unit_amount, currency: line.price_data.currency, description: line.price_data.product_data.name,
        price: { product: { metadata: line.price_data.product_data.metadata } },
      })),
    }),
  } },
  refunds: { create: async () => ({ id: 're_a', status: 'pending' }) },
  webhooks: stripeWebhooks,
} as unknown as StripeClient;
const voice = { async speak() { return { audio: new Uint8Array(24_000 * 2).map((_, i) => (i % 2 ? 0x10 : 0)), mimeType: 'audio/L16;codec=pcm;rate=24000' }; } };

let service: typeof import('../../artifacts/api-server/src/bookatlas/narration/service.ts');
let edition: typeof import('../../artifacts/api-server/src/bookatlas/narration/edition.ts');
let purchases: typeof import('../../artifacts/api-server/src/bookatlas/payments/purchases.ts');
before(async () => {
  (await import('../../artifacts/api-server/src/bookatlas/payments/checkout.ts')).setStripeClient(fakeStripe);
  service = await import('../../artifacts/api-server/src/bookatlas/narration/service.ts');
  edition = await import('../../artifacts/api-server/src/bookatlas/narration/edition.ts');
  purchases = await import('../../artifacts/api-server/src/bookatlas/payments/purchases.ts');
  service.setNarrationProvider(voice);
  service.setFreeTierProvider(null);
});
after(async () => { service.setNarrationProvider(null); service.setFreeTierProvider(undefined); delete process.env.STRIPE_WEBHOOK_SECRET; await closeSharedTestServer(); });

const send = (method: string, body: unknown, role: string) => ({ method, headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body) });
const as = (role: string) => ({ headers: { 'x-test-role': role } });
type Fetch = (path: string, init?: RequestInit) => Promise<Response>;

async function publishNarratedBook(fetch: Fetch) {
  const file = epub2(5);
  const intake = {
    title: 'The Spoken Codex', author: 'Ada Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
    categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
    price: 4.99, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
  };
  const s = await (await fetch('/api/ebook-submissions', send('POST', { intake, fileName: 'a.epub', size: file.byteLength }, 'author'))).json();
  for (let part = 0; part < s.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${s.id}/upload/${part}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'author' }, body: file.subarray(part * s.partBytes, (part + 1) * s.partBytes) });
  }
  await fetch(`/api/ebook-submissions/${s.id}/prepare`, send('POST', {}, 'author'));
  const bookId = (await (await fetch(`/api/ebook-submissions/${s.id}/publish`, send('POST', {}, 'admin'))).json()).bookId as string;
  return { bookId, submissionId: s.id as string };
}

async function narrate(fetch: Fetch, bookId: string) {
  const ordered = await (await fetch(`/api/narration/books/${bookId}/order`, send('POST', { voice: 'Charon' }, 'admin'))).json();
  for (let i = 0; i < 200 && (await service.getNarration(ordered.narration.id))!.status !== 'done'; i += 1) await service.step(ordered.narration.id);
  assert.equal((await service.getNarration(ordered.narration.id))!.status, 'done');
}

function paidWebhook(fetch: Fetch, id: string) {
  Object.assign(sessions.get(id)!, { status: 'complete', payment_status: 'paid', customer_details: { email: 'r@example.com', name: 'Rea', address: { country: 'NL' } } });
  const payload = JSON.stringify({ id: `evt_${id}`, object: 'event', type: 'checkout.session.completed', data: { object: sessions.get(id) } });
  return fetch('/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': stripeWebhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) }, body: payload });
}

test('a finished narration lists the book as an audiobook; the author sells it as an add-on; buyers of it hear all of it', async () => {
  const { fetch } = await getSharedTestServer();
  const { bookId } = await publishNarratedBook(fetch);
  const sale = (body: unknown, role = 'author') => fetch(`/api/narration/books/${bookId}/sale`, send('PUT', body, role));

  assert.equal((await sale({ audioPrice: 3.99 })).status, 409, 'nothing to sell before the narration is finished');
  await narrate(fetch, bookId);

  // The store: 🎧 badge, Audiobooks filter and shelf.
  const quote = await (await fetch(`/api/narration/books/${bookId}`, as('author'))).json();
  assert.deepEqual(quote.sale, { ebookPrice: 4.99, audioPrice: 0, audioPricedAt: null }, 'included with the eBook until the author prices it');
  const listed = (await (await fetch(`/api/catalog/books/${bookId}`)).json()).book;
  assert.equal(listed.format, 'bundle');
  assert.match(listed.narrator, /Charon/);
  assert.ok(listed.audioDurationMinutes >= 1);
  const audioShelf = await (await fetch('/api/catalog/search?format=audiobook&limit=60')).json();
  assert.ok(audioShelf.books.some((b: { id: string }) => b.id === bookId), 'found under Audiobooks');

  // An early eBook buyer (before the add-on goes on sale) keeps the full narration.
  await purchases.recordPaid([{ user_id: 'early-buyer', book_id: bookId, checkout_session_id: 'cs_early_buyer', payment_intent_id: 'pi_early', amount_total: 499, currency: 'eur' }]);
  await new Promise((r) => setTimeout(r, 5));

  // Pricing: only the author (or an administrator), sensible amounts.
  assert.equal((await sale({ audioPrice: 3.99 }, 'reader')).status, 404, 'another account cannot price it');
  assert.equal((await sale({ audioPrice: 0.5 })).status, 422);
  assert.equal((await sale({ audioPrice: 'free' })).status, 422);
  const priced = await (await sale({ audioPrice: 3.99 })).json();
  assert.equal(priced.audioPrice, 3.99);
  assert.ok(priced.audioPricedAt);
  assert.equal((await (await sale({ audioPrice: 5.49 })).json()).audioPricedAt, priced.audioPricedAt, 'a new price keeps the on-sale date');

  // Access: the eBook alone now gives the preview narration; the author always hears it all.
  const manifest = async (role: string) => (await (await fetch(`/api/reader/catalog/${bookId}/narration`, as(role))).json()).narration;
  assert.equal((await manifest('author')).access, 'full');
  const early = { id: 'early-buyer', role: 'reader' } as never;
  assert.equal(await edition.audioAccess(bookId, { ...listed, audioPrice: 5.49, audioPricedAt: priced.audioPricedAt }, early), 'full', 'bought before the add-on went on sale');
  const preview = await manifest('reader');
  assert.equal(preview.access, 'preview');
  assert.equal(preview.audioPrice, 5.49);

  // Checkout: the add-on needs the eBook (in the cart or owned); prices come from the server.
  const checkout = (ids: string[]) => fetch('/api/checkout/sessions', send('POST', { bookIds: ids, withdrawalWaiver: true }, 'reader'));
  const audio = `${bookId}.audio`;
  assert.equal((await checkout([audio])).status, 422, 'the audiobook alone is not sold');
  assert.equal((await checkout(['atlas-ebook-00000000.audio'])).status, 422, 'an unknown audiobook is refused');
  const res = await checkout([bookId, audio]);
  assert.equal(res.status, 201);
  const params = created.at(-1)!;
  assert.deepEqual(params.line_items.map((l: any) => [l.price_data.product_data.name, l.price_data.unit_amount]), [['The Spoken Codex', 499], ['The Spoken Codex (natural audiobook)', 549]]);
  assert.equal((await paidWebhook(fetch, [...sessions.keys()].at(-1)!)).status, 200);
  edition.forgetAudioAccess();
  assert.equal((await manifest('reader')).access, 'full', 'the audiobook buyer hears all of it');
  assert.deepEqual((await (await fetch('/api/purchases', as('reader'))).json()).bookIds.sort(), [bookId, audio].sort());
  assert.equal((await checkout([audio])).status, 409, 'not sold twice');

  // The author's sales: the add-on is its own line with the author's share.
  const sales = await (await fetch('/api/author/sales', as('author'))).json();
  const line = sales.books.find((b: { bookId: string }) => b.bookId === audio);
  assert.ok(line, 'the audiobook appears in the author dashboard');
  assert.equal(line.units, 1);
  assert.equal(line.grossCents, 549);

  // Included again (0): every eBook reader hears all of it.
  await sale({ audioPrice: 0 });
  assert.equal((await (await fetch(`/api/catalog/books/${bookId}`)).json()).book.audioPrice, undefined);
  assert.equal((await checkout([audio])).status, 422, 'no add-on on sale any more');
});
