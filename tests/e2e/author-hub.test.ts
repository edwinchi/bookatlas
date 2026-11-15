import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';

after(async () => { await closeSharedTestServer(); });

const json = (body: unknown, role = 'admin', method = 'POST') => ({ method, headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body) });
const as = (role: string) => ({ headers: { 'x-test-role': role } });

async function publishBook(fetch: (path: string, init?: RequestInit) => Promise<Response>, title: string) {
  const file = epub2(5);
  const intake = {
    title, author: 'Hub Author', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
    categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
    price: 9.99, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
  };
  const s = await (await fetch('/api/ebook-submissions', json({ intake, fileName: 'h.epub', size: file.byteLength }))).json();
  for (let part = 0; part < s.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${s.id}/upload/${part}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'admin' }, body: file.subarray(part * s.partBytes, (part + 1) * s.partBytes) });
  }
  await fetch(`/api/ebook-submissions/${s.id}/prepare`, json({}));
  return (await (await fetch(`/api/ebook-submissions/${s.id}/publish`, json({}))).json()).bookId as string;
}

test('author hub: sales CSV (formula-safe), monthly royalty statement, payout details validated and masked', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch, '=HYPERLINK("x") Codex');
  const { issueInvoice } = await import('../../artifacts/api-server/src/bookatlas/payments/invoices.ts');
  await issueInvoice({
    checkoutSessionId: 'cs_test_authorhub_0001', paymentIntentId: 'pi_test_authorhub_1', userId: 'test-reader-1', buyerEmail: 'r@example.com',
    buyerName: 'R', buyerCountry: 'DE', currency: 'eur', withdrawalWaiverAt: new Date().toISOString(), lines: [{ bookId, title: 'x', gross: 999 }],
  });

  assert.equal((await fetch('/api/author/sales.csv', as('unauthenticated'))).status, 401);
  const csvRes = await fetch('/api/author/sales.csv', as('admin'));
  assert.equal(csvRes.status, 200);
  assert.match(csvRes.headers.get('content-type') ?? '', /text\/csv/);
  assert.match(csvRes.headers.get('content-disposition') ?? '', /attachment; filename="booksatlas-sales-/);
  const csv = await csvRes.text();
  const row = csv.split('\r\n').find((l) => l.includes(bookId))!;
  assert.ok(row, 'the sale is in the export');
  assert.ok(row.includes(`"'=HYPERLINK(""x"") Codex"`), 'a title starting with = cannot run as a formula');
  assert.ok(row.includes('"DE"') && row.includes('"9.99"') && row.includes('"paid"'));
  // The author share is 67% of the price excluding VAT.
  const [net, share] = row.split(',').slice(6, 8).map((c) => Number(c.replace(/"/g, '')));
  assert.equal(Math.round(net! * 100 * 0.67), Math.round(share! * 100));
  const readerCsv = await (await fetch('/api/author/sales.csv', as('reader'))).text();
  assert.ok(!readerCsv.includes(bookId), 'another account never sees these sales');

  const month = new Date().toISOString().slice(0, 7);
  assert.equal((await fetch('/api/author/statements/2026-13', as('admin'))).status, 400);
  assert.equal((await fetch('/api/author/statements/2999-01', as('admin'))).status, 400, 'no statements for future months');
  const st = await (await fetch(`/api/author/statements/${month}?format=json`, as('admin'))).json();
  const line = st.lines.find((l: { bookId: string }) => l.bookId === bookId);
  assert.deepEqual([line.units, line.grossCents, st.final], [1, 999, false]);
  const html = await (await fetch(`/api/author/statements/${month}`, as('admin'))).text();
  assert.match(html, /<title>Royalty statement .* \| BooksAtlas<\/title>/);
  assert.ok(html.includes('=HYPERLINK(&quot;x&quot;) Codex') && html.includes('Month in progress') && html.includes('NL004725111B38'));

  // Payout details.
  assert.deepEqual(await (await fetch('/api/author/payout', as('admin'))).json(), { configured: false });
  const bad = await fetch('/api/author/payout', json({ accountHolder: 'Hub Author', iban: 'NL91 ABNA 0417 1643 01', address: 'Main street 1, Zwolle', country: 'NL', business: false }, 'admin', 'PUT'));
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).fields.iban, 'Enter a valid IBAN (check the digits).');
  const good = await (await fetch('/api/author/payout', json({ accountHolder: 'Hub Author', iban: 'nl91 abna 0417 1643 00', bic: 'abnanl2a', address: 'Main street 1, 8031 DJ Zwolle', country: 'NL', taxId: '123456782', business: false }, 'admin', 'PUT'))).json();
  assert.deepEqual([good.configured, good.iban, good.bic, good.taxId], [true, 'NL91 •••• •••• 4300', 'ABNANL2A', '•••782'], 'shown masked');
  assert.ok(!JSON.stringify(await (await fetch('/api/author/payout', as('admin'))).json()).includes('NL91ABNA0417164300'), 'the full IBAN is never sent back');
  assert.deepEqual(await (await fetch('/api/author/payout', as('reader'))).json(), { configured: false }, 'own details only');

  const exported = await (await fetch('/api/account/export', as('admin'))).json();
  assert.ok(exported.purchases.some((p: { record?: string; iban?: string }) => p.record === 'payout-details' && p.iban === 'NL91ABNA0417164300'), 'the owner gets their full details in the data export');
});
