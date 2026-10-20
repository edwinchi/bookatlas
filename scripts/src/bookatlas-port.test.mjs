import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const origin = 'http://localhost:80';
const evidenceDir = 'generated-artifacts/bookatlas-tests';

test('all imported API routes and storefront components are preserved', async () => {
  const original = await readFile('.migration-backup/server.ts', 'utf8');
  const migrated = await readFile('artifacts/api-server/src/bookatlas/server.ts', 'utf8');
  const routes = text => [...text.matchAll(/app\.(get|post|put|patch|delete)\('([^']+)'/g)]
    .filter(([, , path]) => path.startsWith('/api/'))
    .map(([, method, path]) => `${method} ${path}`).sort();
  assert.deepEqual(routes(migrated), routes(original));
  assert.equal(
    await readFile('artifacts/bookatlas/src/App.tsx', 'utf8'),
    await readFile('.migration-backup/src/App.tsx', 'utf8'),
    'the imported application state and main flows changed',
  );
  async function checkComponents(dir = '') {
    for (const item of await readdir(`.migration-backup/src/components/${dir}`, { withFileTypes: true })) {
      const relative = `${dir}${item.name}`;
      if (item.isDirectory()) await checkComponents(`${relative}/`);
      else assert.equal(
        await readFile(`artifacts/bookatlas/src/components/${relative}`, 'utf8'),
        await readFile(`.migration-backup/src/components/${relative}`, 'utf8'),
        `${relative} changed during the port`,
      );
    }
  }
  await checkComponents();
});

test('health, catalog, filtering, categories, and manager APIs work through the shared proxy', async () => {
  async function json(path) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /application\/json/);
    return response.json();
  }
  assert.equal((await json('/api/healthz')).status, 'ok');
  assert.equal((await json('/api/health')).status, 'ok');
  const catalog = await json('/api/books');
  assert.equal(catalog.success, true);
  assert.ok(catalog.books.length > 0);
  const filtered = await json(`/api/books?search=${encodeURIComponent(catalog.books[0].title)}`);
  assert.ok(filtered.books.some(book => book.id === catalog.books[0].id));
  assert.ok((await json('/api/categories')).allCategories.length > 0);
  assert.equal((await json('/api/manager/stats')).success, true);
});

test('reader can register, preview, purchase, and reopen their library on desktop and mobile', { timeout: 120_000 }, async (t) => {
  await mkdir(evidenceDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.locator('input[type="email"]').fill(`port-test-${Date.now()}@example.com`);
    await page.getByRole('button', { name: 'Unlock & Explore Bookatlas' }).click();
    await expect(page.getByRole('heading', { name: /Registration Required/ })).toHaveCount(0);
    await page.screenshot({ path: `${evidenceDir}/storefront.jpg` });
    const title = 'The Celestial Griot of Sirius B';
    await page.getByPlaceholder('Search by Title, Author, ISBN, Dutch translations, or AI Mood...').fill(title);
    await page.getByRole('heading', { name: title, exact: true }).first().click();
    await page.getByRole('button', { name: 'Read Free Instant Sample' }).click();
    await expect(page.locator('.fixed.inset-0').last()).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/reader.jpg` });
    await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).last().click();
    // The sample reader replaces the detail modal; reopen it when necessary.
    if (!(await page.getByRole('button', { name: /Buy Now for/ }).isVisible())) {
      await page.getByRole('heading', { name: title, exact: true }).first().click();
    }
    await page.getByRole('button', { name: /Buy Now for/ }).click();
    await expect(page.getByRole('heading', { name: 'Your Shopping Cart' })).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/cart.jpg` });
    await page.getByRole('button', { name: 'Complete Instant Purchase' }).click();
    await expect(page.getByRole('heading', { name: 'Your Shopping Cart' })).toHaveCount(0);
    if (await page.getByRole('button', { name: /Buy Now for/ }).isVisible()) {
      await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).last().click();
    }
    await page.getByRole('button', { name: 'My Bookshelf & Reading Progress', exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'My Bookshelf & Reading Progress', exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/library.jpg` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${evidenceDir}/mobile-library.jpg` });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
      t.diagnostic('The unchanged imported header overflows narrow screens; responsive redesign is outside the parity-only port.');
    }
    await page.getByRole('button', { name: /Continue Reading|Start Reading/ }).first().click();
    await expect(page.locator('.fixed.inset-0').last()).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/mobile-reader.jpg` });
    assert.deepEqual(errors, [], 'uncaught browser errors');
  } finally {
    await browser.close();
  }
});
