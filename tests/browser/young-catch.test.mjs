// Listen and catch (2026-11-26, attention training for young readers): one word comes back in the story; the child
// taps "I heard it!" each time it is read aloud. The device voice is replaced by a fake one that reports each word.
// Run: node --test tests/browser/young-catch.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

test('a story read aloud: catching every time the word is said earns 2 stars', async () => {
const base = process.env.BASE_URL || 'http://localhost:5173';
const browser = await chromium.launch();
try {
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await context.route(/\/audio\//, (r) => r.abort());
await context.addInitScript(() => {
  window.__words = [];
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } addEventListener(e, f) { this['on' + e] = f; } };
  const voices = [{ name: 'Test', lang: 'en-GB', voiceURI: 't', default: true, localService: true }];
  let timers = [];
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices, addEventListener() {}, removeEventListener() {}, pause() {}, resume() {}, speaking: false, pending: false,
    speak(u) {
      const ms = [...u.text.matchAll(/\S+/g)];
      ms.forEach((m, k) => timers.push(setTimeout(() => { window.__words.push(m[0]); u.onboundary?.({ name: 'word', charIndex: m.index }); }, 50 + k * 300)));
      timers.push(setTimeout(() => u.onend?.({}), 100 + ms.length * 300));
      setTimeout(() => u.onstart?.({}), 10);
    },
    cancel() { timers.forEach(clearTimeout); timers = []; },
  } });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base + '/reading-intelligence/young-readers?story=red-hat', { waitUntil: 'load' });
const panel = page.getByTestId('listen-catch');
await panel.waitFor({ timeout: 10000 });
const word = (await panel.locator('strong').innerText()).trim();
assert.equal(word, 'Sam', 'shown as the story writes it');
await page.getByTestId('catch-start').click();
await page.getByTestId('catch-heard').waitFor();
let seen = 0, wrongTapped = false;
const t0 = Date.now();
while (Date.now() - t0 < 25000) {
  const words = await page.evaluate(() => window.__words);
  for (; seen < words.length; seen += 1) {
    const w = words[seen].toLowerCase().replace(/[^a-z]/g, '');
    if (w === word.toLowerCase()) await page.getByTestId('catch-heard').click();
    else if (!wrongTapped && seen > 2) { wrongTapped = true; await page.waitForTimeout(2100); }
  }
  if (!(await page.getByTestId('catch-heard').count())) break;
  await page.waitForTimeout(80);
}
assert.match(await panel.getByRole('status').innerText(), /caught all 3/);
assert.equal(await page.getByTestId('young-stars').innerText(), '2');
const axe = await new AxeBuilder({ page }).include('[data-testid="listen-catch"]').analyze();
assert.deepEqual(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ') + ' ' + (n.failureSummary || '').slice(0, 160)).join(' | ')}`), []);
assert.deepEqual(errors, []);
} finally { await browser.close(); }
});
