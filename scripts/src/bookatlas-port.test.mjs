import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { accessFor, authorizationStatus, canBootstrapOwner } from '../../artifacts/api-server/src/auth/policy.ts';

const origin = 'http://localhost:80';
const reader = { id: 'unit-reader', email: 'reader@example.com', name: 'Reader', role: 'reader' };
const admin = { ...reader, role: 'admin' };

test('only the intended storefront routes are public; readers cannot access admin data or operations', async () => {
  const source = await readFile('artifacts/api-server/src/bookatlas/server.ts', 'utf8');
  for (const [, method, path] of source.matchAll(/app\.(get|post|put|patch|delete)\('([^']+)'/g)) {
    if (!path.startsWith('/api/')) continue;
    const access = accessFor(method.toUpperCase(), path);
    if (['/api/health', '/api/books', '/api/categories'].includes(path) && method === 'get') {
      assert.equal(access, 'public');
    } else if (path.includes('/unsubscribe')) {
      assert.equal(access, 'self-service');
    } else {
      assert.notEqual(access, 'public', path);
      assert.equal(authorizationStatus(access), 401, path);
      assert.equal(authorizationStatus(access, admin), 200, path);
      if (access === 'admin') assert.equal(authorizationStatus(access, reader), 403, path);
    }
  }
  for (const path of ['/api/users', '/api/subscribers', '/api/subscribers/export', '/api/manager/stats', '/api/export/documentation-data']) {
    assert.equal(accessFor('GET', path), 'admin');
    assert.equal(authorizationStatus(accessFor('GET', path), reader), 403);
  }
  assert.equal(accessFor('GET', '/api/unknown-future-endpoint'), 'admin');
  assert.equal(accessFor('DELETE', '/api/books/123/'), 'admin');
  assert.equal(canBootstrapOwner('owner@example.com', false, 'owner@example.com', false), false);
  assert.equal(canBootstrapOwner('attacker@example.com', true, 'owner@example.com', false), false);
  assert.equal(canBootstrapOwner('owner@example.com', true, undefined, false), false);
  assert.equal(canBootstrapOwner('owner@example.com', true, 'OWNER@example.com', false), true);
  assert.equal(canBootstrapOwner('owner@example.com', true, 'owner@example.com', true), false, 'revoked roles must not be re-granted');
});

test('live API rejects unauthenticated administrative actions, identity spoofing, and forged unsubscribe links', async () => {
  for (const path of ['/api/healthz', '/api/health', '/api/books', '/api/categories']) {
    assert.equal((await fetch(origin + path)).status, 200, path);
  }
  const protectedRequests = [
    ['GET', '/api/auth/me'], ['GET', '/api/users'], ['GET', '/api/subscribers'],
    ['GET', '/api/subscribers/export'], ['GET', '/api/manager/stats'],
    ['GET', '/api/export/documentation-data'], ['POST', '/api/books'],
    ['DELETE', '/api/books/nonexistent-auth-test-book'], ['POST', '/api/books/reset-default'],
    ['POST', '/api/subscribers/single'], ['POST', '/api/users/register'],
    ['POST', '/api/manager/autopilot/toggle'], ['POST', '/api/ai/matchmaker'],
    ['POST', '/api/account/membership'],
  ];
  for (const [method, path] of protectedRequests) {
    const response = await fetch(origin + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'admin', 'x-user-role': 'admin' },
      ...(method === 'POST' ? { body: JSON.stringify({ email: 'owner@example.com', role: 'admin' }) } : {}),
    });
    assert.equal(response.status, 401, `${method} ${path}`);
  }
  const email = 'reader@example.com';
  const oldToken = 'unsub_' + createHmac('sha256', 'bookatlas_unsub_hmac_default_secret_2026').update(email).digest('hex').slice(0, 32);
  for (const token of ['', oldToken]) {
    assert.equal((await fetch(`${origin}/api/subscribers/unsubscribe-info?email=${email}&token=${token}`)).status, 403);
    assert.equal((await fetch(`${origin}/api/subscribers/unsubscribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, token }),
    })).status, 403);
  }
  assert.equal((await fetch(`${origin}/api/users/register`, {
    method: 'POST', headers: { Origin: 'https://untrusted.example' },
  })).status, 403, 'cross-origin mutations must be rejected');
});

test('public browsing, branded auth routes, callback paths, and fake legacy sessions are safe', { timeout: 90_000 }, async () => {
  const directory = 'generated-artifacts/bookatlas-auth-tests';
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await expect(page.getByRole('link', { name: 'Create account', exact: true })).toBeVisible({ timeout: 30_000 });
    assert.equal(new URL(page.url()).pathname, '/', 'visitors must land on the storefront, not a forced login');
    await page.screenshot({ path: `${directory}/storefront.jpg` });
    await page.evaluate(() => {
      localStorage.setItem('bookatlas_admin_session', JSON.stringify({ isAuthenticated: true, role: 'super_admin' }));
      sessionStorage.setItem('bookatlas_admin_session', JSON.stringify({ isAuthenticated: true }));
      localStorage.setItem('bookatlas_registered_user', JSON.stringify({ email: 'forged@example.com' }));
    });
    await page.reload();
    await page.getByRole('button', { name: 'Admin Login', exact: true }).first().click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.locator('.cl-signIn-root')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${directory}/sign-in.jpg` });
    await page.goto(`${origin}/sign-up`);
    await expect(page.locator('.cl-signUp-root')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${directory}/sign-up.jpg` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${directory}/mobile-sign-up.jpg` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'auth page must fit a phone');
    for (const path of ['/sign-in/sso-callback', '/sign-up/verify-email-address']) {
      assert.equal((await page.request.get(origin + path)).status(), 200);
    }
    await page.goto(`${origin}/user-portal`);
    await expect(page).toHaveURL(`${origin}/`);
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
