import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { accessFor, authorizationStatus, canBootstrapOwner } from '../../artifacts/api-server/src/auth/policy.ts';

async function isServerReachable(url, timeoutMs = 1500) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const cleanUrl = url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/healthz`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function resolveOrigin() {
  const envUrl = process.env.APP_URL || process.env.BOOKATLAS_URL || process.env.BASE_URL;
  if (envUrl) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  }
  if (process.env.PORT) {
    return `http://localhost:${process.env.PORT.trim()}`.replace(/\/+$/, '');
  }
  if (process.env.WEB_PORT) {
    return `http://localhost:${process.env.WEB_PORT.trim()}`.replace(/\/+$/, '');
  }
  for (const candidate of ['http://localhost:80', 'http://localhost:5173']) {
    if (await isServerReachable(candidate, 500)) {
      return candidate;
    }
  }
  return 'http://localhost:80';
}

const origin = (await resolveOrigin()).replace(/\/+$/, '');
const reader = { id: 'unit-reader', email: 'reader@example.com', name: 'Reader', role: 'reader' };
const admin = { ...reader, role: 'admin' };

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(
    dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport,
    `${label}: ${JSON.stringify(dimensions)}`,
  );
}

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

test('live API rejects unauthenticated administrative actions, identity spoofing, and forged unsubscribe links', async (t) => {
  if (!(await isServerReachable(origin))) {
    const msg = `Server is not reachable at ${origin}. Start services with 'pnpm run dev:local' or set APP_URL.`;
    if (process.env.REQUIRE_SERVER === 'true') {
      assert.fail(msg);
    }
    t.skip(`Skipping: ${msg}`);
    return;
  }
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

test('public browsing, branded auth routes, callback paths, and fake legacy sessions are safe', { timeout: 90_000 }, async (t) => {
  if (!(await isServerReachable(origin))) {
    const msg = `Web application is not reachable at ${origin}. Start services with 'pnpm run dev:local' or set APP_URL.`;
    if (process.env.REQUIRE_SERVER === 'true') {
      assert.fail(msg);
    }
    t.skip(`Skipping: ${msg}`);
    return;
  }
  const directory = 'generated-artifacts/bookatlas-auth-tests';
  await mkdir(directory, { recursive: true });
  const executablePath = process.env.CHROMIUM_PATH || (existsSync('/repl/tools/bin/chromium') ? '/repl/tools/bin/chromium' : undefined);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
    ...(executablePath ? { executablePath } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await expect(page.getByRole('link', { name: 'Create account', exact: true })).toBeVisible({ timeout: 30_000 });
    assert.equal(new URL(page.url()).pathname, '/', 'visitors must land on the storefront, not a forced login');
    await assertNoHorizontalOverflow(page, 'desktop storefront at 1280px');
    await page.screenshot({ path: `${directory}/storefront.jpg` });
    await page.evaluate(() => {
      localStorage.setItem('bookatlas_admin_session', JSON.stringify({ isAuthenticated: true, role: 'super_admin' }));
      sessionStorage.setItem('bookatlas_admin_session', JSON.stringify({ isAuthenticated: true }));
      localStorage.setItem('bookatlas_registered_user', JSON.stringify({ email: 'forged@example.com' }));
    });
    await page.reload();
    await expect(page.getByRole('button', { name: /Admin Login|Manager Studio|Platform Blueprint|Download Documentation/ })).toHaveCount(0);
    await expect(page.getByText(/Veo Cover Image-to-Video Animator/)).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.getByRole('button', { name: 'Open bookstore menu' }).click();
    const languageSelect = page.locator('select[aria-label="Language"]');
    const currencySelect = page.locator('select[aria-label="Currency"]');
    await languageSelect.selectOption('nl');
    await currencySelect.selectOption('CAD');
    await page.waitForFunction(() => {
      try {
        const value = JSON.parse(localStorage.getItem('bookatlas:store-preferences:v1') || '{}');
        return value.language === 'nl' && value.currency === 'CAD';
      } catch { return false; }
    });
    await page.reload();
    await page.getByRole('button', { name: 'Open bookstore menu' }).click();
    await expect(page.locator('select[aria-label="Language"]')).toHaveValue('nl');
    await expect(page.locator('select[aria-label="Currency"]')).toHaveValue('CAD');
    await page.locator('select[aria-label="Language"]').selectOption('en');
    await page.locator('select[aria-label="Currency"]').selectOption('EUR');
    await page.waitForFunction(() => {
      try {
        const value = JSON.parse(localStorage.getItem('bookatlas:store-preferences:v1') || '{}');
        return value.language === 'en' && value.currency === 'EUR';
      } catch { return false; }
    });
    await page.getByRole('button', { name: 'Close bookstore menu' }).click();
    for (const width of [320, 360, 375, 390, 414, 430, 768, 900, 1023, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      await assertNoHorizontalOverflow(page, `storefront at ${width}px`);
      if (width < 1024) {
        await page.getByRole('button', { name: 'Open bookstore menu' }).click();
        await expect(page.getByRole('button', { name: 'My Bookshelf', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'AI reading tools' })).toBeVisible();
        await assertNoHorizontalOverflow(page, `mobile menu at ${width}px`);
        await page.getByRole('button', { name: 'Close bookstore menu' }).click();
      }
      if ([320, 390, 430, 768, 1024].includes(width)) {
        await page.screenshot({ path: `${directory}/storefront-${width}px.jpg` });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileSearch = page.getByPlaceholder('Search books, authors, genres...');
    await expect(mobileSearch).toBeVisible();
    await mobileSearch.fill('Sirius');
    await expect(mobileSearch).toHaveValue('Sirius');
    await mobileSearch.fill('');
    await page.getByRole('button', { name: /Read Instant Sample/i }).first().click();
    const readerDialog = page.getByRole('dialog', { name: /^Reader:/ });
    await expect(readerDialog).toBeVisible();
    for (const width of [320, 375, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await assertNoHorizontalOverflow(page, `sample reader at ${width}px`);
      const readerWidth = await readerDialog.evaluate(element => element.scrollWidth);
      assert.ok(readerWidth <= width, `reader contents must fit ${width}px (scroll width ${readerWidth}px)`);
    }
    await page.setViewportSize({ width: 320, height: 844 });
    await page.screenshot({ path: `${directory}/reader-320px.jpg` });
    await page.getByRole('button', { name: 'Font & Theme Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Reading Display' })).toBeVisible();
    const settingsBounds = await page.getByRole('heading', { name: 'Reading Display' }).evaluate(element => {
      const rect = element.closest('.absolute')?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right } : null;
    });
    assert.ok(settingsBounds && settingsBounds.left >= 0 && settingsBounds.right <= 320, 'reader settings must stay inside a 320px viewport');
    await page.getByRole('button', { name: 'Night', exact: true }).click();
    await page.getByRole('button', { name: 'Dyslexic / Mono' }).click();
    await page.getByRole('button', { name: 'wide', exact: true }).click();
    await page.getByRole('slider').nth(1).press('End');
    await expect(page.getByRole('slider').nth(1)).toHaveValue('26');
    await page.getByRole('button', { name: 'Close reading settings' }).click();
    await page.getByRole('button', { name: 'Open table of contents' }).click();
    await expect(page.getByRole('heading', { name: 'Table of Contents' })).toBeVisible();
    await page.getByRole('button', { name: 'Close table of contents' }).click();
    await readerDialog.getByRole('button', { name: 'Next Chapter' }).click();
    await expect(readerDialog).toContainText('Chapter 2 of 2');
    await readerDialog.getByRole('button', { name: 'Previous Chapter' }).click();
    await expect(readerDialog).toContainText('Chapter 1 of 2');
    await page.getByRole('button', { name: 'Exit reader' }).click();
    await page.reload();
    await page.getByRole('button', { name: /Read Instant Sample/i }).first().click();
    await page.getByRole('button', { name: 'Font & Theme Settings' }).click();
    await expect(page.getByRole('slider').nth(1)).toHaveValue('26');
    await expect(page.getByRole('button', { name: 'Night', exact: true })).toHaveClass(/ring-2 ring-indigo-600/);
    await expect(page.getByRole('button', { name: 'Dyslexic / Mono' })).toHaveClass(/bg-slate-900/);
    await expect(page.getByRole('button', { name: 'wide', exact: true })).toHaveClass(/bg-slate-900/);
    await page.getByRole('button', { name: 'Reset to defaults' }).click();
    await expect(page.getByRole('slider').nth(1)).toHaveValue('18');
    await expect(page.getByRole('button', { name: 'Sepia', exact: true })).toHaveClass(/ring-2 ring-indigo-600/);
    await page.getByRole('button', { name: 'Close reading settings' }).click();
    await page.getByRole('button', { name: 'Exit reader' }).click();
    await page.reload();
    await page.getByRole('button', { name: /Read Instant Sample/i }).first().click();
    await page.getByRole('button', { name: 'Font & Theme Settings' }).click();
    await expect(page.getByRole('slider').nth(1)).toHaveValue('18');
    await expect(page.getByRole('button', { name: 'Sepia', exact: true })).toHaveClass(/ring-2 ring-indigo-600/);
    await page.screenshot({ path: `${directory}/reader-settings-320px.jpg` });
    await page.getByRole('button', { name: 'Close reading settings' }).click();
    await page.getByRole('button', { name: 'Exit reader' }).click();
    await page.setViewportSize({ width: 320, height: 844 });
    await page.getByRole('button', { name: /Add eBook to cart/ }).first().click();
    await expect(page.getByRole('dialog', { name: 'Your Shopping Cart' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in to review checkout' })).toBeVisible();
    await assertNoHorizontalOverflow(page, 'shopping cart at 390px');
    await page.screenshot({ path: `${directory}/cart-320px.jpg` });
    assert.equal(new URL(page.url()).pathname, '/', 'a guest can add a book before checkout');
    await page.getByRole('button', { name: 'Sign in to review checkout' }).click();
    await expect(page).toHaveURL(/\/sign-in\?/);
    const checkoutSignIn = new URL(page.url());
    assert.equal(checkoutSignIn.searchParams.get('feature'), 'checkout');
    assert.equal(checkoutSignIn.searchParams.get('returnTo'), '/user-portal?resume=checkout');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${origin}/admin`);
    await expect(page.getByRole('heading', { name: 'Administrator sign-in' })).toBeVisible();
    await page.screenshot({ path: `${directory}/admin-sign-in.jpg` });
    await page.getByRole('link', { name: 'Sign in as administrator' }).click();
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
