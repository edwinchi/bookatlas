// A shared wishlist (2026-11-28): /?list=<ids>&from=<first name> shows those books at the top of the store.
// Run: node --test tests/browser/shared-wishlist.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

test('a shared wishlist link shows the books, opens them and can be hidden', async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    await context.route(/\.protect\.clerk\.com|\/audio\//, (r) => r.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const found = await (await page.request.get(base + '/api/catalog/search?limit=3')).json();
    const ids = found.books.slice(0, 2).map((b) => b.id);
    await page.goto(`${base}/?list=${ids.join(',')},no-such-book&from=Amara`, { waitUntil: 'load' });
    const shelf = page.getByTestId('shared-list');
    await shelf.waitFor({ timeout: 20000 });
    assert.match(await shelf.innerText(), /Amara's wishlist/);
    assert.equal(await shelf.getByTestId('shared-book').count(), 2, 'a book no longer in the store is left out');
    const axe = await new AxeBuilder({ page }).include('[data-testid="shared-list"]').analyze();
    assert.deepEqual(axe.violations.map((v) => v.id), []);
    await shelf.getByTestId('shared-book').first().click();
    await page.getByRole('dialog').first().waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Hide this list' }).click();
    await shelf.waitFor({ state: 'detached' });
    assert.ok(!page.url().includes('list='), 'the link is cleared when hidden');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
