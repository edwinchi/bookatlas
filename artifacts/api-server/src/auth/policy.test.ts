import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accessFor, authorizationStatus, isCrossSiteMutation } from './policy';

test('allows anonymous GET access only for the public Bookatlas catalog', () => {
  assert.equal(accessFor('GET', '/api/books'), 'public');
  assert.equal(accessFor('GET', '/api/categories'), 'public');
  assert.equal(accessFor('GET', '/api/auth/me'), 'reader');
  assert.equal(accessFor('GET', '/api/subscribers'), 'admin');
});

test('requires an administrator for catalog writes and unknown routes', () => {
  assert.equal(accessFor('POST', '/api/books'), 'admin');
  assert.equal(accessFor('PUT', '/api/books/book-1'), 'admin');
  assert.equal(accessFor('DELETE', '/api/books/book-1'), 'admin');
  assert.equal(accessFor('POST', '/api/unlisted'), 'admin');
});

test('requires a verified reader identity for account, membership, and AI endpoints', () => {
  assert.equal(accessFor('GET', '/api/auth/me'), 'reader');
  assert.equal(accessFor('POST', '/api/account/membership'), 'reader');
  assert.equal(accessFor('POST', '/api/ai/tts'), 'reader');
});

test('returns an honest authorization result for anonymous and reader sessions', () => {
  assert.equal(authorizationStatus('public'), 200);
  assert.equal(authorizationStatus('reader'), 401);
  assert.equal(authorizationStatus('admin'), 401);
  const reader = { id: 'reader-1', email: 'reader@example.test', name: 'Reader', role: 'reader' as const };
  assert.equal(authorizationStatus('reader', reader), 200);
  assert.equal(authorizationStatus('admin', reader), 403);
});

test('account export and deletion are available to the verified reader only', () => {
  assert.equal(accessFor('GET', '/api/account/export'), 'reader');
  assert.equal(accessFor('DELETE', '/api/account'), 'reader');
  assert.equal(accessFor('DELETE', '/api/account/'), 'reader');
  assert.equal(accessFor('DELETE', '/api/accounts'), 'admin');
});

test('cookie-authenticated mutations must prove they come from this app', () => {
  const host = 'bookatlas.example';
  const cookie = '__client_uat=1; __session=eyJ.token';
  assert.equal(isCrossSiteMutation('GET', '/api/auth/me', { cookie }, host), false);
  assert.equal(isCrossSiteMutation('POST', '/api/users/register', { origin: 'https://bookatlas.example', cookie }, host), false);
  assert.equal(isCrossSiteMutation('POST', '/api/users/register', { origin: 'https://evil.example', cookie }, host), true);
  assert.equal(isCrossSiteMutation('DELETE', '/api/account', { origin: 'not a url' }, host), true);
  // No Origin: a session cookie requires Sec-Fetch-Site: same-origin.
  assert.equal(isCrossSiteMutation('DELETE', '/api/account', { cookie }, host), true);
  assert.equal(isCrossSiteMutation('DELETE', '/api/account', { cookie: '__session_Ab12=x' }, host), true);
  assert.equal(isCrossSiteMutation('DELETE', '/api/account', { cookie, 'sec-fetch-site': 'same-origin' }, host), false);
  assert.equal(isCrossSiteMutation('DELETE', '/api/account', { cookie, 'sec-fetch-site': 'cross-site' }, host), true);
  // No ambient credentials, or a signed-token self-service link: nothing to forge.
  assert.equal(isCrossSiteMutation('POST', '/api/users/register', {}, host), false);
  assert.equal(isCrossSiteMutation('POST', '/api/users/register', { cookie: 'theme=dark' }, host), false);
  assert.equal(isCrossSiteMutation('POST', '/api/reader-unsubscribe', { cookie }, host), false);
});
