// Accessibility of the public pages (2026-11-27): a full axe scan of each page, on a phone and on a laptop.
// Run: node --test tests/browser/pages-a11y.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const PAGES = ['/', '/reading-intelligence', '/reading-intelligence/young-readers', '/reading-intelligence/young-readers?tab=focus', '/reading-intelligence/little-ones', '/sign-up', '/privacy'];

test('public pages have no accessibility violations', async () => {
  const browser = await chromium.launch();
  const found = [];
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
      for (const path of PAGES) {
        const page = await context.newPage();
        // Not 'networkidle': the live site keeps connections open.
        await page.goto(base + path, { waitUntil: 'load' });
        await page.locator('h1').first().waitFor({ timeout: 20000 });
        await page.waitForTimeout(2500);
        const { violations } = await new AxeBuilder({ page }).analyze();
        for (const v of violations) found.push(`${viewport.width}px ${path} ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
        await page.close();
      }
      await context.close();
    }
  } finally { await browser.close(); }
  assert.deepEqual(found, []);
});

test('the open reader has no accessibility violations', async () => {
  const browser = await chromium.launch();
  const found = [];
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
      await context.route(/\/audio\//, (r) => r.abort());
      const page = await context.newPage();
      await page.goto(base + '/', { waitUntil: 'load' });
      await page.locator('[title="Read Free Preview in Browser"]').first().click();
      await page.getByRole('dialog').first().waitFor({ timeout: 20000 });
      await page.waitForTimeout(3000);
      const { violations } = await new AxeBuilder({ page }).analyze();
      for (const v of violations) found.push(`${viewport.width}px reader ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      await context.close();
    }
  } finally { await browser.close(); }
  assert.deepEqual(found, []);
});
