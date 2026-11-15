import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';
import type { CoinGateClient } from '../../artifacts/api-server/src/bookatlas/payments/crypto.ts';

// A fake CoinGate: orders are created as 'new'; the test decides when one is paid.
const orders = new Map<number, Record<string, any>>();
const fake: CoinGateClient = {
  createOrder: async (params) => {
    const id = 1000 + orders.size;
    orders.set(id, { id, status: 'new', ...params });
    return { id, payment_url: `https://pay-sandbox.coingate.com/invoice/${id}`, status: 'new' };
  },
  getOrder: async (id) => {
    const o = orders.get(id)!;
    return { id, order_id: o.order_id, status: o.status, price_amount: o.price_amount, price_currency: o.price_currency };
  },
};
let setClient: (c: CoinGateClient | null) => void = () => undefined;
before(async () => {
  ({ setCoinGateClient: setClient } = await import('../../artifacts/api-server/src/bookatlas/payments/crypto.ts'));
  setClient(fake);
});
after(async () => { setClient(null); await closeSharedTestServer(); });

const json = (body: unknown, role = 'reader') => ({ method: 'POST', headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body) });
const as = (role: string) => ({ headers: { 'x-test-role': role } });
const form = (body: Record<string, string>) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-test-role': 'unauthenticated' }, body: new URLSearchParams(body).toString() });

async function publishBook(fetch: (path: string, init?: RequestInit) => Promise<Response>) {
  const file = epub2(5);
  const intake = {
    title: 'The Crypto Codex', author: 'Ada Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
    categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
    price: 6.99, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
  };
  const s = await (await fetch('/api/ebook-submissions', json({ intake, fileName: 'c.epub', size: file.byteLength }, 'admin'))).json();
  for (let part = 0; part < s.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${s.id}/upload/${part}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'admin' }, body: file.subarray(part * s.partBytes, (part + 1) * s.partBytes) });
  }
  await fetch(`/api/ebook-submissions/${s.id}/prepare`, json({}, 'admin'));
  return (await (await fetch(`/api/ebook-submissions/${s.id}/publish`, json({}, 'admin'))).json()).bookId as string;
}

test('crypto checkout through CoinGate: euro price from the server, books open only when CoinGate says paid, invoice and refund', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch);
  assert.equal((await (await fetch('/api/payments/config')).json()).crypto, true);

  assert.equal((await fetch('/api/crypto/orders', json({ bookIds: [bookId], withdrawalWaiver: true }, 'unauthenticated'))).status, 401);
  assert.equal((await fetch('/api/crypto/orders', json({ bookIds: [bookId] }))).status, 400, 'the withdrawal waiver is required, as for cards');

  const started = await fetch('/api/crypto/orders', json({ bookIds: [bookId], withdrawalWaiver: true }));
  assert.equal(started.status, 201);
  const { url, id } = await started.json();
  assert.match(url, /^https:\/\/pay-sandbox\.coingate\.com\/invoice\/\d+$/);
  const cg = [...orders.values()].find((o) => o.order_id === id)!;
  assert.deepEqual([cg.price_amount, cg.price_currency, cg.receive_currency], ['6.99', 'EUR', 'EUR'], 'the price comes from the catalogue, in euros');
  assert.match(cg.callback_url, /\/api\/crypto\/callback$/);
  assert.ok(cg.success_url.includes(`order=${id}`));

  const status = async (role = 'reader') => fetch(`/api/crypto/orders/${id}`, as(role));
  assert.equal((await status('admin')).status, 404, 'only the buyer can see the order');
  assert.deepEqual(await (await status()).json(), { paid: false, pending: true, status: 'new', bookIds: [bookId] });

  // A forged callback (wrong token) is refused; a right token with status "paid" is still checked with CoinGate.
  assert.equal((await fetch('/api/crypto/callback', form({ id: String(cg.id), order_id: id, status: 'paid', token: 'forged' }))).status, 400);
  assert.equal((await fetch('/api/crypto/callback', form({ id: String(cg.id), order_id: id, status: 'paid', token: cg.token }))).status, 200);
  assert.equal((await (await fetch('/api/purchases', as('reader'))).json()).bookIds.includes(bookId), false, 'CoinGate still says new: nothing unlocked');

  cg.status = 'paid';
  assert.equal((await fetch('/api/crypto/callback', form({ id: String(cg.id), order_id: id, status: 'paid', token: cg.token }))).status, 200);
  await fetch('/api/crypto/callback', form({ id: String(cg.id), order_id: id, status: 'paid', token: cg.token }));
  assert.equal((await (await status()).json()).paid, true);
  assert.ok((await (await fetch('/api/purchases', as('reader'))).json()).bookIds.includes(bookId), 'the book is unlocked');

  const invoices = (await (await fetch('/api/invoices', as('reader'))).json()).invoices;
  const mine = invoices.filter((i: any) => i.books.some((b: any) => b.bookId === bookId));
  assert.equal(mine.length, 1, 'one invoice, even with repeated callbacks');
  assert.deepEqual([mine[0].method, mine[0].grossCents, mine[0].refund.statutoryWithdrawal], ['crypto', 699, false]);

  // Already owned: a second crypto order is refused.
  assert.equal((await fetch('/api/crypto/orders', json({ bookIds: [bookId], withdrawalWaiver: true }))).status, 409);

  // Refund: approving closes access; the money goes back from the CoinGate dashboard.
  assert.equal((await fetch(`/api/invoices/${mine[0].seq}/refund-request`, json({ reason: 'The file does not open on my e-reader.' }))).status, 202);
  const decided = await (await fetch(`/api/manager/refund-requests/${mine[0].seq}/approve`, json({}, 'admin'))).json();
  assert.equal(decided.status, 'refunded');
  assert.equal((await (await fetch('/api/purchases', as('reader'))).json()).bookIds.includes(bookId), false, 'access closed after the refund');
});
