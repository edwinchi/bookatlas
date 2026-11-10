import test, { after } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
process.env.UNSUBSCRIBE_TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET;

import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';

after(closeSharedTestServer);

const json = (body: unknown, role = 'reader') => ({
  method: 'POST', headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body),
});
const intake = {
  title: 'The Erased Codex', author: 'Ada Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
  categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
  price: 3.5, rightsConfirmed: true, aiContent: 'none', wantsPrint: false,
};

async function prepared(fetch: (p: string, i?: RequestInit) => Promise<Response>, title: string) {
  const file = epub2(5);
  const s = await (await fetch('/api/ebook-submissions', json({ intake: { ...intake, title }, fileName: 'erase.epub', size: file.byteLength }))).json();
  for (let part = 0; part < s.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${s.id}/upload/${part}`, {
      method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'reader' }, body: file.subarray(part * s.partBytes, (part + 1) * s.partBytes),
    });
  }
  const ready = await (await fetch(`/api/ebook-submissions/${s.id}/prepare`, json({}))).json();
  assert.equal(ready.status, 'ready');
  return s.id as string;
}

test('account erasure deletes unpublished submissions and anonymises published books and purchases', async () => {
  const { fetch } = await getSharedTestServer();
  // The same module instances the server uses (ES modules), as the account route calls them.
  const { eraseAuthorData } = await import('../../artifacts/api-server/src/bookatlas/ebookPrep/service.ts');
  const { anonymisePurchases, purchasesOf, recordPaid } = await import('../../artifacts/api-server/src/bookatlas/payments/purchases.ts');

  const draft = await prepared(fetch, 'The Erased Draft');
  const live = await prepared(fetch, 'The Erased Codex');
  const { bookId } = await (await fetch(`/api/ebook-submissions/${live}/publish`, json({}, 'admin'))).json();
  await recordPaid([{ user_id: 'test-reader-1', book_id: bookId, checkout_session_id: 'cs_test_erasure_0001', payment_intent_id: 'pi_erasure', amount_total: 350, currency: 'eur' }]);
  assert.equal((await purchasesOf('test-reader-1')).length, 1);

  await anonymisePurchases('test-reader-1');
  await eraseAuthorData('test-reader-1');

  const admin = { headers: { 'x-test-role': 'admin' } };
  assert.equal((await fetch(`/api/ebook-submissions/${draft}`, admin)).status, 404, 'the unpublished submission is gone');
  const kept = await (await fetch(`/api/ebook-submissions/${live}`, admin)).json();
  assert.equal(kept.status, 'published', 'the published book stays');
  assert.equal(kept.ownerEmail, '', 'without the author\'s email');
  assert.equal((await fetch(`/api/catalog/books/${bookId}`)).status, 200, 'and stays on sale');
  assert.equal((await fetch(`/api/ebook-submissions/${live}`, { headers: { 'x-test-role': 'reader' } })).status, 404, 'no longer linked to the account');
  assert.deepEqual(await purchasesOf('test-reader-1'), [], 'purchases no longer point to the reader');
});
