// Read in your language (2026-11-28): the page on screen, translated beside the book, following the page.
// The browser's own translator is replaced by a stand-in that tags each paragraph, so no AI is called.
// Run: node --test tests/browser/translate-page.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const fakeTranslator = () => {
  window.Translator = {
    availability: async () => 'available',
    create: async ({ targetLanguage }) => ({ translate: async (t) => `[${targetLanguage}] ${t}` }),
  };
};

// A book of several pages, so the translation can be seen following the page.
const longChapters = [0, 1].map((c) => ({ id: `c${c}`, title: `Chapter ${c + 1}`, content: Array.from({ length: 24 }, (_, i) => `Paragraph ${i + 1} of chapter ${c + 1}. ${'The river carried the stories of the people from the mountains down to the sea. '.repeat(3)}`) }));

async function openReader(browser, { viewport, translator, longBook = false }) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', isMobile: viewport.width < 600, hasTouch: viewport.width < 600, locale: 'fr-FR' });
  await context.route(/\.protect\.clerk\.com|\/audio\//, (r) => r.abort());
  if (translator) await context.addInitScript(fakeTranslator);
  await context.addInitScript(() => { try { localStorage.removeItem('bookatlas:reader-translate-to'); } catch { /* none */ } });
  const page = await context.newPage();
  if (longBook) {
    const mark = (b) => (b ? { ...b, hasReaderContent: true, format: 'bundle' } : b);
    await page.route(/\/api\/catalog\/(search|books\/[^/?]+)/, async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      if (Array.isArray(body.books)) body.books = body.books.map(mark);
      if (body.book) body.book = mark(body.book);
      await route.fulfill({ response: res, json: body });
    });
    await page.route('**/api/reader/catalog/*/content', (route) => route.fulfill({ json: { chapters: longChapters, access: 'full' } }));
    await page.route('**/api/reader/catalog/*/narration', (route) => route.fulfill({ status: 404, json: { error: 'none' } }));
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.locator('[title="Read Free Preview in Browser"]').first().click();
  await page.getByLabel('Font & Theme Settings').waitFor({ timeout: 20000 });
  return { context, page, errors };
}

test('read in your language: the page on screen in French, following the page, in another language on request', async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openReader(browser, { viewport: { width: 1280, height: 900 }, translator: true, longBook: true });
    await page.getByText('Paragraph 1 of chapter 1.', { exact: false }).first().waitFor({ timeout: 15000 });
    await page.getByTestId('button-translate').click();
    const panel = page.getByTestId('translate-panel');
    await panel.waitFor();
    const paras = panel.getByTestId('translated-para');
    await paras.first().waitFor({ timeout: 10000 });
    const first = await paras.allInnerTexts();
    assert.ok(first.length > 0 && first.every((t) => t.startsWith('[fr] ')), `the device language first (${first[0]})`);
    assert.match(await panel.innerText(), /Translated on this device, privately/);
    const axe = await new AxeBuilder({ page }).include('[data-testid="translate-panel"]').analyze();
    assert.deepEqual(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), []);

    // Turning the page brings that page's translation.
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction((was) => {
      const now = [...document.querySelectorAll('[data-testid="translated-para"]')].map((e) => e.textContent).join('|');
      return now && now !== was;
    }, first.join('|'), { timeout: 10000 });

    // Another language.
    await panel.getByRole('combobox', { name: 'Language' }).click();
    await page.getByRole('option', { name: 'Dutch' }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="translated-para"]')].some((e) => e.textContent.startsWith('[nl] ')), null, { timeout: 10000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('bookatlas:reader-translate-to')), 'nl', 'the choice is remembered');

    // Escape closes the panel first; the reader stays open.
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'detached' });
    assert.ok(await page.getByLabel('Font & Theme Settings').isVisible(), 'the reader is still open');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('read in your language: on a phone it opens from the tools menu; without a device translator a guest is asked to sign in', async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openReader(browser, { viewport: { width: 390, height: 844 }, translator: false });
    await page.getByRole('button', { name: 'More reading tools' }).click();
    await page.getByRole('menuitem', { name: 'Read in your language' }).click();
    const panel = page.getByTestId('translate-panel');
    await panel.waitFor();
    await panel.getByText(/Sign in to read this page in your language/).waitFor({ timeout: 10000 });
    assert.ok(await panel.getByRole('button', { name: 'Sign in' }).isVisible());
    const box = await panel.boundingBox();
    assert.ok(box && box.width <= 390 && box.y > 300, 'a sheet at the bottom of the screen');
    await panel.getByRole('button', { name: 'Close the translation' }).click();
    await panel.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
