// The reader as an eBook app (owner request 2026-11-17): real pages, the preferences window, contents, "go to",
// and the pop-up listening player with speed, voice and language. The device voice is replaced by a fake one so
// the test does not depend on the voices of the machine running it.
// Run: node --test --test-concurrency=1 tests/browser/reader.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.BASE_URL || 'http://localhost:5173';
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

const fakeVoice = () => {
  const voices = [
    { name: 'Test English', lang: 'en-GB', voiceURI: 'test-en', default: true, localService: true },
    { name: 'Test French', lang: 'fr-FR', voiceURI: 'test-fr', default: false, localService: true },
  ];
  window.__spoken = [];
  let timer = 0;
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; this.rate = 1; this.lang = ''; this.voice = null; } };
  const synth = {
    getVoices: () => voices,
    speak(u) { window.__spoken.push({ text: u.text, rate: u.rate, lang: u.lang }); timer = setTimeout(() => u.onend?.(), 4000); },
    cancel() { clearTimeout(timer); },
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
};

async function openReader(viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', hasTouch: viewport.width < 600, isMobile: viewport.width < 600 });
  await context.addInitScript(fakeVoice);
  await context.addInitScript(() => { try { localStorage.removeItem('bookatlas:reader-layout:v1'); localStorage.removeItem('bookatlas:reader-listen:v1'); } catch { /* none */ } });
  const page = await context.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('[title="Read Free Preview in Browser"]').first().click({ force: true });
  await page.getByLabel('Font & Theme Settings').waitFor();
  return { context, page };
}

test('pages: the chapter is laid out in pages that turn with the arrow keys, and "go to" opens', async () => {
  const { context, page } = await openReader({ width: 1280, height: 640 });
  const pager = page.getByRole('button', { name: /^page 1 \/ \d+ in this chapter/i });
  await pager.waitFor();
  const total = Number((await pager.getAttribute('aria-label')).match(/\/ (\d+)/)[1]);
  if (total > 1) {
    await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: /^page 2 \//i }).waitFor();
    await page.keyboard.press('ArrowLeft');
    await pager.waitFor();
  }
  await pager.click();
  await page.getByText('Place in the book').waitFor();
  await page.keyboard.press('Escape');
  assert.ok(await page.getByLabel('Font & Theme Settings').isVisible(), 'Escape closes the pop-up, not the reader');
  await context.close();
});

test('preferences window: scroll or pages, custom colours, and Escape leaves the reader open', async () => {
  const { context, page } = await openReader({ width: 1280, height: 800 });
  await page.getByLabel('Font & Theme Settings').click();
  const prefs = page.getByRole('dialog', { name: 'Reading preferences' });
  await prefs.waitFor();
  await prefs.getByRole('tab', { name: 'Page' }).click();
  await prefs.getByRole('radio', { name: 'Scroll' }).click();
  await page.locator('[aria-label="Reading progress"] button[aria-label$="Go to a place in the book"]').waitFor();
  await prefs.getByRole('radio', { name: 'Pages' }).click();
  await prefs.getByRole('tab', { name: 'Colours' }).click();
  await prefs.getByRole('button', { name: 'Background #1d2733' }).click();
  // The colours fade over 200 ms.
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[aria-label^="Reader:"]')).backgroundColor === 'rgb(29, 39, 51)', null, { timeout: 3000 });
  await page.keyboard.press('Escape');
  await prefs.waitFor({ state: 'hidden' });
  assert.ok(await page.getByLabel('Font & Theme Settings').isVisible(), 'the reader stays open');
  await page.getByLabel('Contents: open the table of contents').click();
  await page.getByRole('dialog', { name: 'Contents' }).waitFor();
  await page.keyboard.press('Escape');
  await context.close();
});

test('listening player: pop-up with pause, back, forward, speed, voice and language, stop', async () => {
  const { context, page } = await openReader({ width: 1280, height: 800 });
  await page.getByRole('button', { name: 'Read aloud' }).click();
  const player = page.getByRole('region', { name: 'Listening controls' });
  await player.waitFor();
  await page.waitForFunction(() => window.__spoken.length >= 1);
  for (const name of ['Previous paragraph', 'Next paragraph', 'Pause listening', 'Voice and language']) {
    assert.ok(await player.getByRole('button', { name }).isVisible(), `${name} button`);
  }
  // Pause keeps the place; resume reads on.
  await player.getByRole('button', { name: 'Pause listening' }).click();
  await player.getByRole('button', { name: 'Resume listening' }).waitFor();
  const before = await page.evaluate(() => window.__spoken.length);
  await player.getByRole('button', { name: 'Resume listening' }).click();
  await page.waitForFunction((n) => window.__spoken.length > n, before);

  // Speed: + makes it faster, and the next sentence is read faster.
  await player.getByRole('button', { name: /listening speed 1\.0x/i }).click();
  await page.getByRole('button', { name: 'Faster' }).click();
  await page.getByRole('button', { name: 'Faster' }).click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__spoken.at(-1)?.rate === 1.2);

  // Voice and language: another language is offered from the device's voices.
  await player.getByRole('button', { name: 'Voice and language' }).click();
  const voices = page.getByRole('dialog', { name: 'Voice & language' });
  await voices.waitFor();
  assert.ok(await voices.getByText('French – France').isVisible(), 'French is offered');
  await voices.getByRole('button', { name: 'Hear French – France' }).click();
  await page.waitForFunction(() => window.__spoken.at(-1)?.lang === 'fr-FR');
  await page.keyboard.press('Escape');
  await voices.waitFor({ state: 'hidden' });

  await player.getByRole('button', { name: 'Stop listening' }).click();
  await player.waitFor({ state: 'hidden' });
  assert.ok(await page.getByLabel('Font & Theme Settings').isVisible());
  await context.close();
});

test('phones: one-row toolbar with the other tools in a menu, and nothing wider than the screen', async () => {
  const { context, page } = await openReader({ width: 360, height: 740 });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(wide <= 1, `no sideways scrolling (${wide}px)`);
  await page.getByRole('button', { name: 'More reading tools' }).click();
  await page.getByRole('menuitem', { name: 'Notebook' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Read aloud' }).click();
  const player = page.getByRole('region', { name: 'Listening controls' });
  await player.waitFor();
  const box = await player.boundingBox();
  assert.ok(box && box.x >= 0 && box.x + box.width <= 360, 'the player fits the screen');
  await player.getByRole('button', { name: 'Shrink the listening window' }).click();
  await page.getByRole('button', { name: 'Open the listening window' }).waitFor();
  await context.close();
});

test('the reader and its player have no serious or critical accessibility violations (WCAG 2.2 AA)', async () => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const { context, page } = await openReader(viewport);
    await page.getByRole('button', { name: 'Read aloud' }).click();
    await page.getByRole('region', { name: 'Listening controls' }).waitFor();
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).include('[aria-label^="Reader:"]').analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    assert.deepEqual(bad.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), [], `at ${viewport.width} px`);
    await context.close();
  }
});

test('after a release, a tab opened earlier reloads once when the reader file is gone, then the reader opens', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await context.addInitScript(fakeVoice);
  const page = await context.newPage();
  let blocked = 0;
  // The first request for the reader's code gets what Vercel answers for a removed file: the HTML page.
  await page.route(/EReaderModal[^/]*\.(js|tsx)(\?.*)?$/, async (route) => {
    if (blocked++ === 0) return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><p>gone</p>' });
    return route.continue();
  });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const reloaded = page.waitForEvent('framenavigated', { predicate: (f) => f === page.mainFrame(), timeout: 15_000 });
  await page.locator('[title="Read Free Preview in Browser"]').first().click({ force: true });
  await reloaded;
  await page.waitForLoadState('networkidle');
  await page.locator('[title="Read Free Preview in Browser"]').first().click({ force: true });
  await page.getByLabel('Font & Theme Settings').waitFor({ timeout: 15_000 });
  assert.ok(blocked >= 2, 'the reader was fetched again after the reload');
  await context.close();
});
