// Quick set-ups in Reading aids (2026-11-28): dyslexia, attention (ADHD) and low vision, one tap each.
// Run: node --test tests/browser/aid-presets.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

test('reading aids: the three quick set-ups change the reader and show which one is on', async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    await context.route(/\.protect\.clerk\.com|\/audio\//, (r) => r.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.locator('[title="Read Free Preview in Browser"]').first().click();
    const settings = page.getByLabel('Font & Theme Settings');
    await settings.waitFor({ timeout: 20000 });
    await settings.click();
    await page.getByTestId('tab-reading-aids').click();
    const presets = page.getByTestId('aid-presets');
    await presets.waitFor();
    const axe = await new AxeBuilder({ page }).include('[data-testid="aid-presets"]').analyze();
    assert.deepEqual(axe.violations.map((v) => v.id), []);

    await page.getByTestId('aid-preset-dyslexia').click();
    assert.equal(await page.getByTestId('aid-preset-dyslexia').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByTestId('aid-preset-lowVision').getAttribute('aria-pressed'), 'false');

    await page.getByTestId('aid-preset-lowVision').click();
    assert.equal(await page.getByTestId('aid-preset-lowVision').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByTestId('aid-preset-dyslexia').getAttribute('aria-pressed'), 'false', 'one set-up shown at a time');
    const size = await page.locator('[data-para]').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    assert.ok(size >= 26, `large letters (${size}px)`);

    await page.getByTestId('aid-preset-attention').click();
    assert.equal(await page.getByTestId('aid-preset-attention').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('switch', { name: 'Zen' }).getAttribute('aria-checked'), 'true');
    assert.equal(await page.getByRole('switch', { name: 'Bold word starts' }).getAttribute('aria-checked'), 'true');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
