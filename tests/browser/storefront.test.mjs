// Real-browser checks against a running stack (Docker: `docker compose --env-file .env.local up -d`).
// Run with `pnpm test:browser`; BASE_URL overrides the default http://localhost:5173.
// Signed-in flows need a working Clerk development instance and are not covered here.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test('pop-ups are Radix dialogs: Escape and a click outside close them, and they are labelled', async () => {
  const page = await open('/');
  await page.getByRole('button', { name: /add to cart/i }).first().click();
  const cart = page.getByRole('dialog', { name: 'Shopping cart' });
  await cart.waitFor();
  await page.keyboard.press('Escape');
  await cart.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: /^Open shopping cart/ }).click();
  await cart.waitFor();
  // The cart slides in on the right; the backdrop on the left is outside it.
  await page.mouse.click(20, 400);
  await cart.waitFor({ state: 'detached' });

  // A book's details: opened from its title on a card, closed with Escape, then reopened and closed by a click outside.
  const title = page.locator('[data-testid="book-card-title"]').first();
  const name = (await title.getAttribute('title')) ?? '';
  await title.click();
  const details = page.getByRole('dialog', { name });
  await details.waitFor();
  await page.keyboard.press('Escape');
  await details.waitFor({ state: 'detached' });
  await title.click();
  await details.waitFor();
  await page.mouse.click(5, 5);
  await details.waitFor({ state: 'detached' });
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

test('the publishing landing leads the front page and its estimator responds', async () => {
  const page = await open('/');
  assert.ok(await page.getByRole('heading', { level: 1, name: /ready for every shelf/i }).isVisible());
  assert.equal(await page.getByRole('link', { name: /prepare my book/i }).getAttribute('href'), 'mailto:getintouch@apps-pilot.nl?subject=Prepare%20my%20book%20(early%20access)');
  const copies = page.getByLabel('Copies sold a month');
  await copies.scrollIntoViewIfNeeded();
  await copies.fill('5');
  assert.match(await page.locator('#earnings').innerText(), /Best for you/i);
  assert.match(await page.getByText(/Author Pro pays more from \d+ copies/).innerText(), /from 13 copies/);
  await page.getByRole('button', { name: 'Browse the bookstore' }).click();
  await page.waitForFunction(() => Math.abs(document.getElementById('bookstore').getBoundingClientRect().top) < 200, null, { timeout: 5_000 });
});

test('the site menu row opens on hover and click, and its links reach the landing sections', async () => {
  const page = await open('/');
  const site = page.getByRole('navigation', { name: 'Site' });
  const publish = site.getByRole('button', { name: 'Publish', exact: true });
  // A mouse click lands after the hover has already opened the menu; it must stay open.
  await publish.click();
  assert.equal(await publish.getAttribute('aria-expanded'), 'true');
  await site.getByRole('button', { name: /^Pricing and royalties/ }).click();
  await page.waitForFunction(() => Math.abs(document.getElementById('earnings').getBoundingClientRect().top) < 260, null, { timeout: 5_000 });
  await page.keyboard.press('Escape');
  const hub = site.getByRole('button', { name: 'Author hub', exact: true });
  await hub.focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => document.activeElement?.textContent?.includes('Join early access'));
  await page.keyboard.press('Escape');
  assert.equal(await hub.getAttribute('aria-expanded'), 'false');
});

test('the storefront has no serious or critical accessibility violations (WCAG 2.2 AA)', async () => {
  for (const mobile of [false, true]) {
    // A context of its own: axe injects a script, which must not count as a CSP violation of the site.
    const context = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading your Bookatlas account'), null, { timeout: 10_000 });
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    assert.deepEqual(serious.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`), [], mobile ? 'mobile' : 'desktop');
    await context.close();
  }
});

test('listening reads sentence by sentence, highlights the paragraph and stops on request', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // A fake voice: each sentence "ends" after 400 ms, so the test can stop it mid-way.
  await context.addInitScript(() => {
    window.__spoken = [];
    const fake = {
      speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(new Event('end')), 400); },
      cancel() {}, pause() {}, resume() {}, getVoices: () => [], speaking: false, pending: false, paused: false,
      addEventListener() {}, removeEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  });
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('[title="Read Free Preview in Browser"]').first().click();
  const toolbar = page.getByRole('button', { name: 'Read chapter with device voice' });
  await toolbar.click();
  await page.waitForFunction(() => window.__spoken.length >= 1, null, { timeout: 10_000 });
  assert.ok(await page.locator('[data-para][aria-current="true"]').count() === 1, 'the paragraph being read is highlighted');
  await page.getByRole('button', { name: 'Stop device read-aloud' }).click();
  await page.getByRole('button', { name: 'Read chapter with device voice' }).waitFor();
  const stoppedAt = await page.evaluate(() => window.__spoken.length);
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => window.__spoken.length), stoppedAt, 'stop really stops');
  const spoken = await page.evaluate(() => window.__spoken);
  assert.ok(spoken.every((t) => t.length > 0 && t.length < 2000), 'speaks sentence by sentence');
  await context.close();
});

test('the offline service worker registers', async () => {
  const page = await open('/');
  await page.reload({ waitUntil: 'networkidle' });
  const registered = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  assert.ok(registered);
});

test('the service worker never replays API answers that change: payments, prices, submissions', async () => {
  const page = await open('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => Promise.all(['/api/payments/config', '/api/catalog/search?q=codex'].map((u) => fetch(u))));
  await page.waitForTimeout(300);
  const cached = await page.evaluate(async () => {
    const paths = [];
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) paths.push(new URL(req.url).pathname);
    return paths;
  });
  assert.ok(!cached.some((p) => /^\/api\/(?!books$|categories$|catalog\/(?:search|facets|shelves|books\/[^/]+|covers\/[^/]+)$)/.test(p)),
    `only the public catalogue may be cached: ${cached.filter((p) => p.startsWith('/api/')).join(', ')}`);
  assert.equal(await page.evaluate(async () => (await (await fetch('/api/payments/config')).json()).enabled !== undefined), true);
});

test('the app shell and catalog load from the service worker cache when offline', async () => {
  const page = await open('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // A controlled reload lets the worker cache the hashed scripts, styles and catalog responses.
  await page.reload({ waitUntil: 'networkidle' });
  assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'the page is controlled by the worker');
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1, name: /ready for every shelf/i }).waitFor({ timeout: 10_000 });
  // The cached catalog renders offline.
  await page.getByRole('button', { name: /add to cart/i }).first().waitFor({ timeout: 10_000 });
  await page.context().setOffline(false);
});

test('no Content Security Policy violations or page errors occurred', () => {
  assert.deepEqual([...new Set(cspViolations)], []);
  assert.deepEqual(pageErrors, []);
});
