// Continue where you left off (2026-11-27): books started on this device show on the home page and open at the saved place.
// Run: node --test tests/browser/continue-shelf.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

test('a started book shows on the home page, opens at its place, and can be removed from the row', async () => {
  const base = process.env.BASE_URL || 'http://localhost:5173';
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await context.route(/\/audio\//, (r) => r.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/', { waitUntil: 'load' });
    assert.equal(await page.getByTestId('continue-shelf').count(), 0, 'nothing started yet');

    // Open a book: the reader saves its place with the title and cover.
    await page.locator('[title="Read Free Preview in Browser"]').first().click();
    await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('bookatlas:places') || '{}')).length > 0, null, { timeout: 15000 });
    const [id, place] = await page.evaluate(() => Object.entries(JSON.parse(localStorage.getItem('bookatlas:places'))))
      .then((e) => e[0]);
    assert.ok(place.book && place.book.title, `the place carries the book (${JSON.stringify(place)})`);

    // Leave it further on, then come back to the home page.
    // (Leaving the reader saves its place on the way out, so the seed goes in after.)
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.evaluate(([bookId, p]) => localStorage.setItem('bookatlas:places', JSON.stringify({ [bookId]: { ...p, chapter: 1, paragraph: 0, book: { ...p.book, pct: 37 } } })), [id, place]);
    await page.reload({ waitUntil: 'load' });
    const shelf = page.getByTestId('continue-shelf');
    await shelf.waitFor({ timeout: 15000 });
    assert.match(await shelf.innerText(), new RegExp(place.book.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 30)));
    assert.match(await shelf.innerText(), /37% read/);
    const axe = await new AxeBuilder({ page }).include('[data-testid="continue-shelf"]').analyze();
    assert.deepEqual(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), []);

    await shelf.getByTestId('continue-read').click();
    await page.getByRole('dialog').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const after = await page.evaluate((bookId) => JSON.parse(localStorage.getItem('bookatlas:places'))[bookId], id);
    assert.equal(after.chapter, 1, 'opened at the saved chapter, not the start');

    // When chapter 2 is the end of the free sample, the book counts as finished and leaves the row.
    await page.goto(base + '/', { waitUntil: 'load' });
    const pct = await page.evaluate((bookId) => JSON.parse(localStorage.getItem('bookatlas:places'))[bookId].book.pct, id);
    if (pct === 100) assert.equal(await page.getByTestId('continue-shelf').count(), 0, 'finished books leave the row');
    await page.evaluate(([bookId, p]) => localStorage.setItem('bookatlas:places', JSON.stringify({ [bookId]: { ...p, chapter: 1, paragraph: 0, book: { ...p.book, pct: 37 } } })), [id, place]);
    await page.reload({ waitUntil: 'load' });
    await shelf.waitFor({ timeout: 15000 });
    await shelf.getByRole('button', { name: /remove .* from this row/i }).click();
    await shelf.waitFor({ state: 'detached' });
    const kept = await page.evaluate((bookId) => JSON.parse(localStorage.getItem('bookatlas:places'))[bookId], id);
    assert.equal(kept.chapter, 1, 'the place itself is kept');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
