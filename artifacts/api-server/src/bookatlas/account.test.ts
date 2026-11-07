import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { randomBytes } from 'node:crypto';
import type { Identity } from '../auth/policy';
import { maskEmail } from './account';

// In-memory mode only: these tests must never write to a configured Supabase project.
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';
process.env.SESSION_SECRET ||= randomBytes(32).toString('hex');
const { createApp } = await import('./server');

const consents: { userId: string; consent: unknown }[] = [];
const deletedIdentities: string[] = [];
let failIdentityDeletion = false;
let identity: Identity = { id: 'user_new', email: 'new.reader@example.test', name: 'New Reader', role: 'reader' };

const outer = express();
outer.use((req, _res, next) => { req.bookatlasIdentity = identity; next(); });
outer.use(await createApp({
  async recordSignupConsent(userId, consent) { consents.push({ userId, consent }); },
  async deleteIdentity(userId) {
    if (failIdentityDeletion) throw new Error('identity provider unavailable');
    deletedIdentities.push(userId);
  },
}));
const server = outer.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
after(() => { server.close(); });

// Response bodies are asserted field by field below; the test treats them as untyped JSON.
const json = async (res: Response): Promise<any> => res.json();
const send = (method: string, path: string, body?: unknown) => fetch(base + path, {
  method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test('registration creates the reader profile without subscribing them to marketing email', async () => {
  identity = { id: 'user_new', email: 'new.reader@example.test', name: 'New Reader', role: 'reader' };
  const response = await send('POST', '/api/users/register');
  assert.equal(response.status, 200);
  const body = await json(response);
  assert.equal(body.user.email, 'new.reader@example.test');
  assert.equal('totalRegistered' in body, false, 'platform-wide counts are not disclosed to readers');
  assert.equal(consents.length, 0);

  const exported = await json(await send('GET', '/api/account/export'));
  assert.equal(exported.profile.email, 'new.reader@example.test');
  assert.equal(exported.subscriber, null, 'no marketing subscription without explicit opt-in');
});

test('sign-up consent is validated and recorded server-side with a server timestamp', async () => {
  identity = { id: 'user_consent', email: 'consent@example.test', name: 'Consenting Reader', role: 'reader' };
  assert.equal((await send('POST', '/api/users/register', { consent: { ageConfirmed: false, privacyNoticeVersion: '2026-11-07' } })).status, 400);
  assert.equal((await send('POST', '/api/users/register', { consent: { ageConfirmed: true } })).status, 400);
  assert.equal(consents.length, 0);

  const response = await send('POST', '/api/users/register', { consent: { ageConfirmed: true, privacyNoticeVersion: '2026-11-07' } });
  assert.equal(response.status, 200);
  assert.equal(consents.length, 1);
  const recorded = consents[0] as { userId: string; consent: { ageConfirmed: boolean; privacyNoticeVersion: string; acceptedAt: string } };
  assert.equal(recorded.userId, 'user_consent');
  assert.equal(recorded.consent.ageConfirmed, true);
  assert.ok(Number.isFinite(Date.parse(recorded.consent.acceptedAt)));
});

test('export returns the reader\'s own records and never the unsubscribe capability token', async () => {
  identity = { id: 'user_sophie', email: 'sophie.deboer@rotterdam.nl', name: 'Sophie de Boer', role: 'reader' };
  const response = await send('GET', '/api/account/export');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition') ?? '', /attachment/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await json(response);
  assert.equal(body.identity.id, 'user_sophie');
  assert.equal(body.subscriber.email, 'sophie.deboer@rotterdam.nl');
  assert.equal('unsubscribeToken' in body.subscriber, false);
  assert.deepEqual(body.emailDeliveries, []);
});

test('account deletion requires typed confirmation and refuses administrators', async () => {
  identity = { id: 'user_sophie', email: 'sophie.deboer@rotterdam.nl', name: 'Sophie de Boer', role: 'reader' };
  assert.equal((await send('DELETE', '/api/account')).status, 400);
  assert.equal((await send('DELETE', '/api/account', { confirm: 'delete' })).status, 400);
  identity = { id: 'user_admin', email: 'eddyteddy78@gmail.com', name: 'Owner', role: 'admin' };
  assert.equal((await send('DELETE', '/api/account', { confirm: 'DELETE' })).status, 409);
  assert.deepEqual(deletedIdentities, []);
});

test('deletion erases profile and subscriber data, then the sign-in account', async () => {
  identity = { id: 'user_sophie', email: 'sophie.deboer@rotterdam.nl', name: 'Sophie de Boer', role: 'reader' };
  await send('POST', '/api/users/register');
  const response = await send('DELETE', '/api/account', { confirm: 'DELETE' });
  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), { deleted: true });
  assert.deepEqual(deletedIdentities, ['user_sophie']);

  const exported = await json(await send('GET', '/api/account/export'));
  assert.equal(exported.profile, null);
  assert.equal(exported.subscriber, null);
});

test('a failed sign-in account removal is reported, not hidden', async () => {
  identity = { id: 'user_retry', email: 'retry@example.test', name: 'Retry Reader', role: 'reader' };
  await send('POST', '/api/users/register');
  failIdentityDeletion = true;
  try {
    const response = await send('DELETE', '/api/account', { confirm: 'DELETE' });
    assert.equal(response.status, 502);
    assert.match((await json(response)).error, /sign-in account could not be removed/);
  } finally {
    failIdentityDeletion = false;
  }
});

test('reader emails are masked before they reach logs', () => {
  assert.equal(maskEmail('sophie.deboer@rotterdam.nl'), 's***@rotterdam.nl');
  assert.equal(maskEmail('not-an-email'), '***');
});
