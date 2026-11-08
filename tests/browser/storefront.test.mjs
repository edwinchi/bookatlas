// Real-browser checks against a running stack (Docker: `docker compose --env-file .env.local up -d`).
// Run with `pnpm test:browser`; BASE_URL overrides the default http://localhost:5173.
// Signed-in flows need a working Clerk development instance and are not covered here.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
let browser;
const cspViolations = [];
const pageErrors = [];

async function open(path, { mobile = false } = {}) {
  const context = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('console', msg => { if (/Content.Security.Policy/i.test(msg.text())) cspViolations.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  // The store must leave the loading screen within the sign-in timeout (6 s) even if sign-in never loads.
  await page.waitForFunction(() => !document.body.innerText.includes('Loading your Bookatlas account'), null, { timeout: 10_000 });
  return page;
}

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

test('the public storefront renders for guests even when sign-in is unavailable', async () => {
  const page = await open('/');
  assert.equal(await page.getByText('Loading your Bookatlas account').isVisible(), false);
  assert.ok(await page.getByRole('button', { name: /add to cart/i }).first().isVisible());
});

test('mobile navigation, cart badge and cart drawer work together', async () => {
  const page = await open('/', { mobile: true });
  const nav = page.getByRole('navigation', { name: 'Mobile Navigation Bar' });
  assert.ok(await nav.isVisible());
  const cart = nav.locator('[aria-label^="Cart ("]');
  assert.equal(await cart.getAttribute('aria-label'), 'Cart (0 items)');
  await page.getByRole('button', { name: /add to cart/i }).first().click();
  assert.ok(await page.getByLabel('Close shopping cart').isVisible(), 'adding opens the cart');
  await page.getByLabel('Close shopping cart').click();
  assert.equal(await cart.getAttribute('aria-label'), 'Cart (1 items)');
  await cart.click();
  assert.ok(await page.getByLabel('Close shopping cart').isVisible());
});

test('reader display settings persist across reloads', async () => {
  const page = await open('/', { mobile: true });
  await page.locator('[title="Read Free Preview in Browser"]').first().click();
  await page.getByLabel('Font & Theme Settings').click();
  await page.getByRole('button', { name: /sepia/i }).first().click();
  const saved = await page.evaluate(() => localStorage.getItem('bookatlas:reader-display:v1'));
  assert.match(saved ?? '', /"theme":"sepia"/);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => localStorage.getItem('bookatlas:reader-display:v1')), saved);
});

test('the audiobook dock plays samples and cycles playback speed', async () => {
  const page = await open('/');
  await page.locator('[title="Listen to Audio Sample"]').first().click();
  const speed = page.locator('[title="Change Playback Speed"]');
  const before = await speed.innerText();
  await speed.click();
  assert.notEqual(await speed.innerText(), before);
  await page.locator('[title="Close Audiobook Player"]').click();
});

test('the privacy notice is linked from the footer and explains rights and retention', async () => {
  const page = await open('/');
  await page.locator('footer a', { hasText: 'Privacy Notice' }).click();
  await page.waitForURL('**/privacy');
  assert.ok(await page.getByRole('heading', { name: 'Privacy Notice', level: 1 }).isVisible());
  assert.ok(await page.getByRole('heading', { name: 'Your rights' }).isVisible());
  assert.ok(await page.getByRole('heading', { name: 'How long we keep it' }).isVisible());
  assert.ok(await page.locator('a[href="mailto:getintouch@apps-pilot.nl"]').first().isVisible());
});

test('the legal notice is linked from the footer and names the operator', async () => {
  const page = await open('/');
  await page.locator('footer a', { hasText: 'Legal Notice' }).click();
  await page.waitForURL('**/legal');
  assert.ok(await page.getByRole('heading', { name: 'Legal Notice', level: 1 }).isVisible());
  assert.match(await page.locator('address').innerText(), /Atlantean Globals Services[\s\S]*8031 DJ Zwolle[\s\S]*KvK\) 89423496/);
});

test('sign-up requires the age and privacy confirmation before the form', async () => {
  const page = await open('/sign-up');
  const proceed = page.getByRole('button', { name: 'Continue to sign up' });
  assert.ok(await proceed.isDisabled());
  await page.getByRole('checkbox').check();
  await proceed.click();
  const stored = await page.evaluate(() => sessionStorage.getItem('bookatlas:signup-consent:v1'));
  assert.match(stored ?? '', /"ageConfirmed":true/);
  assert.equal(await proceed.isVisible(), false);
});

test('the offline service worker registers', async () => {
  const page = await open('/');
  await page.reload({ waitUntil: 'networkidle' });
  const registered = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  assert.ok(registered);
});

test('no Content Security Policy violations or page errors occurred', () => {
  assert.deepEqual([...new Set(cspViolations)], []);
  assert.deepEqual(pageErrors, []);
});
