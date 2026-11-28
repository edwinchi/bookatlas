// Report a copyright problem (2026-11-28, notice and action): from a book's page, with the book filled in.
// Sending is not tested here (it would store a real enquiry); the e2e test covers the server.
// Run: node --test tests/browser/copyright-report.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

test('a book page opens the copyright report with the book filled in', async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    await context.route(/\.protect\.clerk\.com|\/audio\//, (r) => r.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/', { waitUntil: 'load' });
    const title = page.getByTestId('book-card-title').first();
    await title.waitFor({ timeout: 20000 });
    const name = await title.innerText();
    await title.click();
    await page.getByTestId('report-copyright').click();
    const form = page.getByRole('dialog', { name: 'Report a copyright problem' });
    await form.waitFor();
    const book = form.getByLabel(/The book on BooksAtlas/);
    assert.ok((await book.inputValue()).startsWith(name.trim()), await book.inputValue());
    assert.match(await book.inputValue(), /\/books\//);
    await form.getByLabel(/Your name/).fill('Test');
    const axe = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    assert.deepEqual(axe.violations.map((v) => v.id), []);
    await page.keyboard.press('Escape');
    await form.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
