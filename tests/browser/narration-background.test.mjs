// The natural audiobook plays from part to part by itself (nothing to tap, nothing to download at the switch),
// which is what lets a phone keep playing it with the screen off, and it sets lock-screen controls (Media Session).
// Playwright always reports its tabs as visible, so a locked phone itself must be checked on a real device
// (docs/tasks/TASK-0016-lock-screen-audiobook.md). The book's content and narration are mocked in the browser,
// so no account, Gemini call or payment is involved. Run: node --test tests/browser/narration-background.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
let browser;
before(async () => { browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); });
after(async () => { await browser?.close(); });

/** A short 16-bit mono WAV tone, so each narration part lasts `seconds`. */
function wav(seconds, hz = 440) {
  const rate = 8000, n = Math.round(seconds * rate), buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 8000), 44 + i * 2);
  return buf;
}

const chapters = [0, 1, 2].map((c) => ({ id: `c${c}`, title: `Chapter ${c + 1}: Test`, content: [`Paragraph one of chapter ${c + 1}.`, `Paragraph two of chapter ${c + 1}.`] }));
const segments = [0, 1, 2].map((c) => ({ n: c, chapter: c, from: 0, to: 1, seconds: 3 }));

async function openNarratedReader() {
  // The app's service worker would answer the catalogue requests before the mocks below.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  // Record what the page asks of the Media Session API and of the audio element.
  await context.addInitScript(() => {
    const log = (window.__log = []);
    window.__handlers = {};
    const ms = navigator.mediaSession;
    if (ms) {
      const original = ms.setActionHandler.bind(ms);
      ms.setActionHandler = (action, handler) => { window.__handlers[action] = handler; original(action, handler); };
    }
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.__audio = this;
      log.push({ event: 'play', src: this.src, visibility: document.visibilityState, at: Date.now() });
      return play.call(this);
    };
  });
  const page = await context.newPage();
  let bookId = null;
  // The first book in the store becomes a prepared, narrated eBook.
  const mark = (b) => (b && b.id === bookId ? { ...b, hasReaderContent: true, format: 'bundle' } : b);
  await page.route(/\/api\/catalog\/(search|books\/[^/?]+)/, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    if (Array.isArray(body.books)) { bookId ??= body.books[0]?.id; body.books = body.books.map(mark); }
    if (body.book) body.book = mark(body.book);
    await route.fulfill({ response: res, json: body });
  });
  await page.route('**/api/reader/catalog/*/content', (route) => route.fulfill({ json: { chapters, access: 'full' } }));
  await page.route('**/api/reader/catalog/*/narration', (route) => route.fulfill({ json: { narration: { voice: 'Kore', seconds: 9, access: 'full', segments } } }));
  await page.route(/\/api\/reader\/catalog\/[^/]+\/narration\/\d+$/, (route) => route.fulfill({ status: 200, contentType: 'audio/wav', body: wav(3, 330 + 110 * Number(route.request().url().split('/').pop())) }));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('[title="Read Free Preview in Browser"]').first().click();
  await page.getByRole('button', { name: /listen to the book/i }).click();
  await page.waitForFunction(() => window.__log.length >= 1);
  assert.ok(bookId);
  return { context, page };
}

test('the natural audiobook plays part after part by itself, with the next parts already downloaded', async () => {
  const { context, page } = await openNarratedReader();
  // Wait for parts 2 and 3 to be downloaded ahead, then go offline: the switch to them must need no network,
  // as on a phone with the screen off (where a slow download at the switch can end playback).
  await page.waitForFunction(() => performance.getEntriesByType('resource').filter((e) => /\/narration\/[12]$/.test(e.name)).length >= 2, null, { timeout: 5000 });
  await context.setOffline(true);
  await page.waitForFunction(() => window.__log.filter((e) => e.event === 'play').length >= 3, null, { timeout: 15_000 });
  const log = await page.evaluate(() => window.__log);
  assert.equal(new Set(log.map((e) => e.src)).size, log.length, 'each part is a different track');
  assert.equal(await page.evaluate(() => navigator.mediaSession.metadata?.title), 'Chapter 3: Test', 'the lock screen follows the chapter');
  await context.close();
});

test('lock-screen controls: title and cover, pause and resume, next chapter, stop', async () => {
  const { context, page } = await openNarratedReader();
  const meta = await page.evaluate(() => ({ title: navigator.mediaSession.metadata?.title, album: navigator.mediaSession.metadata?.album, artwork: navigator.mediaSession.metadata?.artwork.length, state: navigator.mediaSession.playbackState, actions: Object.keys(window.__handlers).filter((a) => window.__handlers[a]) }));
  assert.equal(meta.title, 'Chapter 1: Test');
  assert.ok(meta.album, 'the book title is shown');
  assert.equal(meta.artwork, 1, 'the cover is shown');
  for (const a of ['play', 'pause', 'stop', 'nexttrack', 'seekbackward', 'seekforward']) assert.ok(meta.actions.includes(a), `${a} handler`);

  // Pause from the lock screen: the reader shows Resume, and the position is kept.
  await page.evaluate(() => window.__handlers.pause());
  await page.getByRole('button', { name: /resume listening/i }).waitFor();
  assert.equal(await page.evaluate(() => navigator.mediaSession.playbackState), 'paused');
  const at = await page.evaluate(() => window.__audio.currentTime);
  await page.evaluate(() => window.__handlers.play());
  await page.getByRole('button', { name: /^pause listening$/i }).waitFor();
  assert.ok(await page.evaluate((t) => window.__audio.currentTime >= t, at), 'resumes where it was');

  // Next chapter from the lock screen.
  await page.evaluate(() => window.__handlers.nexttrack());
  await page.waitForFunction(() => navigator.mediaSession.metadata?.title === 'Chapter 2: Test');

  // Stop clears the lock screen.
  await page.evaluate(() => window.__handlers.stop());
  await page.getByRole('button', { name: /listen to the book/i }).waitFor();
  assert.equal(await page.evaluate(() => navigator.mediaSession.metadata), null);
  await context.close();
});
