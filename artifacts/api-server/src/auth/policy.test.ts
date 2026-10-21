import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accessFor, authorizationStatus } from './policy';

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
