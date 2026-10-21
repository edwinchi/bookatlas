import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { accessFor, authorizationStatus } from '../../artifacts/api-server/src/auth/policy.ts';
import { eligibleReader, unsubscribeEmail } from '../../artifacts/api-server/src/bookatlas/publishing/campaigns.ts';

test('job history, drafts, mutations and administrator downloads remain administrator-only', () => {
  const reader = { id: 'reader-test', email: 'reader@example.test', name: 'Reader', role: 'reader' };
  for (const [method, path] of [
    ['GET', '/api/manager/publishing-jobs'],
    ['POST', '/api/manager/publishing-jobs'],
    ['GET', '/api/manager/publishing-jobs/test-id/assets/book.epub'],
    ['POST', '/api/manager/publishing-jobs/test-id/actions'],
    ['DELETE', '/api/reader/books/test-id/publication'],
  ]) {
    const access = accessFor(method, path);
    assert.equal(access, 'admin');
    assert.equal(authorizationStatus(access), 401);
    assert.equal(authorizationStatus(access, reader), 403);
  }
});

test('published-reader endpoints and consent need sign-in; browse and signed unsubscribe do not', () => {
  for (const path of ['/api/reader/books/test-id/publication', '/api/reader/books/test-id/assets/chapter-1.wav', '/api/account/reading-updates']) {
    assert.equal(accessFor('GET', path), 'reader');
    assert.equal(authorizationStatus(accessFor('GET', path)), 401);
  }
  assert.equal(accessFor('GET', '/api/books'), 'public');
  assert.equal(accessFor('GET', '/api/reader-unsubscribe'), 'self-service');
  assert.equal(accessFor('POST', '/api/reader-unsubscribe'), 'self-service');
});

test('only real, active, explicitly consented and unsuppressed contacts are eligible', () => {
  const good = { status: 'subscribed', is_demo: false, suppressed: false,
    marketing_consent_at: '2026-10-21T00:00:00Z', marketing_consent_source: 'explicit_opt_in' };
  assert.equal(eligibleReader(good), true);
  for (const patch of [
    { status: 'unsubscribed' }, { status: 'bounced' }, { is_demo: true },
    { suppressed: true }, { marketing_consent_at: null },
    { marketing_consent_source: null }, { marketing_consent_source: ' ' },
    { marketing_consent_at: 'invalid' }, { is_demo: undefined },
  ]) assert.equal(eligibleReader({ ...good, ...patch }), false);
  assert.equal(eligibleReader(null), false);
});

test('unsubscribe accepts only the signed purpose-bound token and rejects reflected HTML or altered payloads', () => {
  // Synthetic per-test-process key only; never reads or changes stored Replit Secrets.
  process.env.SESSION_SECRET = 'synthetic-test-signing-key';
  const payload = Buffer.from(JSON.stringify({ email: 'reader@example.test', purpose: 'marketing-unsubscribe' })).toString('base64url');
  const signature = createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
  const token = `${payload}.${signature}`;
  assert.equal(unsubscribeEmail(token), 'reader@example.test');
  for (const invalid of [token + '."><script>', 'bad', `x${token}`, `${payload}.${'0'.repeat(64)}`]) {
    assert.throws(() => unsubscribeEmail(invalid));
  }
});
