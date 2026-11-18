// "Start my book" (owner request 2026-11-18): the contact buttons were mailto links that do nothing without an
// email app, so visitors send a form on the site and administrators read the enquiries on the Publish page.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { accessFor } from '../../artifacts/api-server/src/auth/policy.ts';
import { purgeOldEnquiries, listEnquiries, submitEnquiry } from '../../artifacts/api-server/src/bookatlas/enquiries/service.ts';

after(async () => { await closeSharedTestServer(); });

const post = (body: unknown, role = 'unauthenticated') => ({ method: 'POST', headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body) });
const valid = { topic: 'print', name: 'Ada Writer', email: 'Ada@Example.com', title: 'The Long Road', formats: ['paperback', 'ebook', 'nonsense'], trimSize: '6 × 9 in', paper: 'Cream', pages: 248, message: 'A finished memoir, 248 pages in Word.' };

test('only sending is public; reading and answering enquiries is for administrators', () => {
  assert.equal(accessFor('POST', '/api/book-enquiries'), 'public');
  assert.equal(accessFor('GET', '/api/book-enquiries'), 'admin');
  assert.equal(accessFor('GET', '/api/manager/book-enquiries'), 'admin');
  assert.equal(accessFor('POST', '/api/manager/book-enquiries/20261118000000-abcdef12/answered'), 'admin');
});

test('a visitor sends an enquiry without an account, and an administrator reads and answers it', async () => {
  const { fetch } = await getSharedTestServer();
  const sent = await fetch('/api/book-enquiries', post(valid));
  assert.equal(sent.status, 201);
  const { id } = await sent.json();
  assert.match(id, /^\d{14}-[0-9a-f]{8}$/);

  assert.equal((await fetch('/api/manager/book-enquiries', { headers: { 'x-test-role': 'reader' } })).status, 403, 'readers cannot read them');
  const list = (await (await fetch('/api/manager/book-enquiries', { headers: { 'x-test-role': 'admin' } })).json()).enquiries;
  const e = list.find((x: { id: string }) => x.id === id);
  assert.ok(e);
  assert.equal(e.email, 'ada@example.com');
  assert.deepEqual(e.formats, ['paperback', 'ebook'], 'unknown formats are dropped');
  assert.equal(e.pages, 248);
  assert.equal(e.status, 'new');

  const answered = (await (await fetch(`/api/manager/book-enquiries/${id}/answered`, post({ answered: true }, 'admin'))).json()).enquiry;
  assert.equal(answered.status, 'answered');
  assert.ok(answered.answeredAt);
  assert.equal((await fetch('/api/manager/book-enquiries/not-an-id/answered', post({}, 'admin'))).status, 404);
});

test('an enquiry needs a name, a reply address and a message; bots filling the hidden field are ignored', async () => {
  const { fetch } = await getSharedTestServer();
  for (const [patch, pattern] of [[{ name: '' }, /name/], [{ email: 'not-an-email' }, /email/], [{ message: 'hi' }, /tell us/]] as const) {
    const res = await fetch('/api/book-enquiries', post({ ...valid, ...patch }));
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, pattern);
  }
  const before = (await listEnquiries()).length;
  const bot = await fetch('/api/book-enquiries', post({ ...valid, website: 'http://spam.example' }));
  assert.equal(bot.status, 201, 'the bot sees success');
  assert.equal((await bot.json()).id, 'received');
  assert.equal((await submitEnquiry({ ...valid, website: 'http://spam.example' })).id, 'received');
  assert.equal((await listEnquiries()).length, before, 'nothing is stored');
});

test('enquiries are deleted 12 months after they arrive', async () => {
  const { id } = await submitEnquiry(valid);
  await purgeOldEnquiries(Date.now() + 300 * 86_400_000);
  assert.ok((await listEnquiries()).some((e) => e.id === id), 'kept for 10 months');
  await purgeOldEnquiries(Date.now() + 370 * 86_400_000);
  assert.ok(!(await listEnquiries()).some((e) => e.id === id), 'gone after 12 months');
});
