// The children's focus gym in the young readers' language (2026-11-27): games and breathing practices translated,
// and each breathing step said aloud by the voice in that language. The device voice is a fake that records.
// Run: node --test tests/browser/focus-kids.test.mjs   (BASE_URL overrides http://localhost:5173)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.BASE_URL || 'http://localhost:5173';

test('in French, the children’s gym and its breathing are in French and the steps are said aloud', async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: 'fr-FR' });
    await context.route(/\/audio\//, (r) => r.abort());
    await context.addInitScript(() => {
      localStorage.setItem('bookatlas:young-lang', 'fr');
      window.__said = [];
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [{ name: 'Test FR', lang: 'fr-FR', voiceURI: 'fr', default: true, localService: true }],
        addEventListener() {}, removeEventListener() {}, pause() {}, resume() {}, cancel() {},
        speak(u) { window.__said.push({ text: u.text, lang: u.lang }); setTimeout(() => u.onend?.({}), 200); },
      } });
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/reading-intelligence/young-readers?tab=focus', { waitUntil: 'load' });
    const gym = page.getByTestId('focus-gym');
    await gym.waitFor({ timeout: 15000 });
    await gym.getByText('Respiration calme').first().waitFor({ timeout: 10000 }); // the French texts load after the page
    const text = await gym.innerText();
    for (const w of ['Respiration calme', 'Chasse aux nombres', 'Attrape les étoiles', 'Commencer']) assert.ok(text.includes(w), `shows “${w}”`);
    assert.deepEqual((await new AxeBuilder({ page }).include('[data-testid="focus-gym"]').analyze()).violations.map((v) => v.id), []);
    await page.getByTestId('focus-start-breath').click();
    await page.getByTestId('breath-bunny').waitFor();
    assert.match(await page.getByTestId('breath-bunny').innerText(), /Les respirations du lapin/);
    assert.ok(await page.getByTestId('breath-voice').isChecked(), 'steps are said aloud by default for children');
    await page.getByTestId('breath-bunny').click();
    await page.waitForFunction(() => window.__said.some((x) => x.text === 'Une longue expiration'), null, { timeout: 8000 });
    assert.equal(await page.getByTestId('breath-cue').innerText().then((c) => /Renifle|Une longue expiration/.test(c)), true);
    const said = await page.evaluate(() => window.__said);
    assert.deepEqual(said.slice(0, 2).map((x) => x.text), ['Renifle', 'Une longue expiration'], 'repeated sniffs are said once');
    assert.ok(said.every((x) => x.lang.startsWith('fr')), 'in French');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
