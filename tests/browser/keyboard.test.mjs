// Keyboard use (2026-11-28): a book's page and the reader open from the keyboard, take the focus, keep Tab inside,
// close with Escape and give the focus back to what opened them.
// Run: node --test tests/browser/keyboard.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

test('the book window and the reader work from the keyboard alone', async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    await context.route(/\.protect\.clerk\.com|\/audio\//, (r) => r.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/', { waitUntil: 'load' });
    const focused = () => page.evaluate(() => {
      const a = document.activeElement;
      return { inDialog: !!a?.closest('[role="dialog"]'), label: a?.getAttribute('aria-label') || a?.getAttribute('title') || (a?.textContent || '').trim().slice(0, 60) };
    });

    for (const [what, opener] of [['book window', page.getByTestId('book-card-title').first()], ['reader', page.locator('[title="Read Free Preview in Browser"]').first()]]) {
      await opener.waitFor({ timeout: 20000 });
      const name = (await opener.getAttribute('title')) || '';
      await opener.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog').first().waitFor();
      await page.waitForTimeout(1000);
      assert.equal((await focused()).inDialog, true, `${what}: the focus moves into it`);
      for (let i = 0; i < 60; i += 1) {
        await page.keyboard.press(i % 3 === 2 ? 'Shift+Tab' : 'Tab');
        assert.equal((await focused()).inDialog, true, `${what}: Tab stays inside (step ${i})`);
      }
      // Leave any menu or panel Tab may have reached, then the window.
      for (let i = 0; i < 4 && await page.getByRole('dialog').count(); i += 1) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
      assert.equal(await page.getByRole('dialog').count(), 0, `${what}: Escape closes it`);
      assert.equal((await focused()).label, name, `${what}: the focus goes back to what opened it`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
