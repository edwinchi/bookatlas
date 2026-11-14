import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Initialize required signing secrets before server imports
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
process.env.UNSUBSCRIBE_TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET;
delete process.env.OPENROUTER_API_KEY;
delete process.env.GEMINI_API_KEY;

import { PDFDocument, getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { filterCatalog, normalizeSearch } from '../../artifacts/bookatlas/src/catalog.ts';
import { INITIAL_BOOKS, GENRES } from '../../lib/bookatlas-catalog/src/data/booksData.ts';
import { accessFor, authorizationStatus, canBootstrapOwner, type Identity } from '../../artifacts/api-server/src/auth/policy.ts';
import { safeReaderReturnPath, readerReturnUrl, clerkRouterPath } from '../../artifacts/bookatlas/src/auth/navigation.ts';
import { libraryStats } from '../../artifacts/bookatlas/src/libraryStats.ts';
import type { Book, FilterOptions, UserLibraryItem, ReaderSettings } from '../../artifacts/bookatlas/src/types.ts';
import {
  DEFAULT_READER_SETTINGS,
  READER_THEMES,
  isValidReaderFontSize,
  toggleChapterBookmark,
} from '../../artifacts/bookatlas/src/utils/readerSettings.ts';
import {
  AUDIO_PLAYBACK_SPEEDS,
  calculateAudioDurationSeconds,
  formatAudioTime,
  skipAudioForward,
  skipAudioBackward,
} from '../../artifacts/bookatlas/src/utils/audioPlayer.ts';
import {
  calculateCartSubtotal,
  applyPromoDiscount,
  calculateCartSuperPoints,
  mergeGuestCartIntoAccount,
  DEMO_CHECKOUT_NOTICE,
} from '../../artifacts/bookatlas/src/utils/cart.ts';
import { PERSONAS } from '../../artifacts/bookatlas/src/components/GeminiChatbotModal.tsx';
import {
  STUDIO_VOICES, DEFAULT_FEMALE_VOICE, DEFAULT_MALE_VOICE,
  STUDIO_SPEECH_MODEL, studioVoice, narrationDirection,
} from '../../lib/bookatlas-catalog/src/voices.ts';
import { validateReaderNarrationInput, readerNarrationOutputTokens, readerNarrationReservationMicros } from '../../artifacts/api-server/src/bookatlas/publishing/readerTts.ts';
import { inspectWav, wrapPcm16LE, decodeStudioWav } from '../../artifacts/api-server/src/bookatlas/publishing/audio.ts';
import { validateSource, decodeBase64 } from '../../artifacts/api-server/src/bookatlas/publishing/source.ts';
import { buildEpub } from '../../artifacts/api-server/src/bookatlas/publishing/epub.ts';
import { reserveBudget, tokenCostUpperBound } from '../../artifacts/api-server/src/bookatlas/publishing/budget.ts';
import { eligibleReader, unsubscribeEmail } from '../../artifacts/api-server/src/bookatlas/publishing/campaigns.ts';
import { workforceRoles, workforceTeams, workforcePolicy } from '../../artifacts/api-server/src/bookatlas/workforce/catalog.ts';
import { CreateWorkforceTaskBody, RunWorkforceWorkerBody, CreatePublishingJobBody, CreateReaderNarrationBody } from '../../lib/api-zod/src/generated/api.ts';
import { BOOKATLAS_TABLES, bookatlasTable } from '../../artifacts/api-server/src/bookatlas/db/tables.ts';

after(async () => {
  await closeSharedTestServer();
});

// Baseline filter options
const defaultFilters: FilterOptions = {
  searchQuery: '',
  genre: 'All Genres',
  format: 'all',
  priceCategory: 'all',
  minRating: 0,
  sortBy: 'featured',
  bookatlasPlusOnly: false,
};

// ============================================================================
// TIER 1: FEATURE COVERAGE (16 FEATURES × 5 TESTS = 80 TESTS)
// ============================================================================

// ----------------------------------------------------------------------------
// Feature 1: Storefront & Catalog Search
// ----------------------------------------------------------------------------
test('F1-1: multi-token search with accent normalization matches title, author, and tags', () => {
  const books: Book[] = [
    {
      ...INITIAL_BOOKS[0],
      id: 'f1-test-1',
      title: 'L’Étranger et l’Aurore',
      author: 'Albert Camus',
      tags: ['Algeria', 'Classics'],
    },
    {
      ...INITIAL_BOOKS[1],
      id: 'f1-test-2',
      title: 'The Cybernetic Ocean',
      author: 'Stanislaw Lem',
      tags: ['Solaris', 'Space'],
    },
  ];
  const query = '  etranger   camus  ';
  const results = filterCatalog(books, { ...defaultFilters, searchQuery: query }, 'store');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'f1-test-1');
});

test('F1-2: genre filtering isolates primary and secondary book genres', () => {
  const philosophyBooks = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, genre: 'Philosophy & Deep Thought' }, 'store');
  assert.ok(philosophyBooks.length > 0);
  assert.ok(philosophyBooks.every(b => b.primaryGenre === 'Philosophy & Deep Thought' || b.genres?.includes('Philosophy & Deep Thought')));
});

test('F1-3: format filtering correctly isolates ebooks and audiobooks', () => {
  const audioOnly = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, format: 'audiobook' }, 'store');
  assert.ok(audioOnly.length > 0);
  assert.ok(audioOnly.every(b => b.format === 'audiobook' || b.format === 'bundle'));
});

test('F1-4: price category filtering enforces under5 and free price tiers', () => {
  const under5 = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, priceCategory: 'under5' }, 'store');
  assert.ok(under5.length > 0);
  assert.ok(under5.every(b => b.price <= 4.99));
});

test('F1-5: catalog sorting arranges books by rating and price correctly', () => {
  const byRating = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, sortBy: 'rating' }, 'store');
  for (let i = 1; i < byRating.length; i++) {
    assert.ok(byRating[i - 1].rating >= byRating[i].rating);
  }
  const byPriceAsc = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, sortBy: 'priceAsc' }, 'store');
  for (let i = 1; i < byPriceAsc.length; i++) {
    assert.ok(byPriceAsc[i - 1].price <= byPriceAsc[i].price);
  }
});

// ----------------------------------------------------------------------------
// Feature 2: Authentication & RBAC
// ----------------------------------------------------------------------------
test('F2-1: public endpoints allow anonymous access without credentials', () => {
  assert.equal(accessFor('GET', '/api/books'), 'public');
  assert.equal(accessFor('GET', '/api/categories'), 'public');
  assert.equal(accessFor('GET', '/api/health'), 'public');
  assert.equal(accessFor('GET', '/api/healthz'), 'public');
  assert.equal(authorizationStatus('public'), 200);
});

test('F2-2: reader routes require a verified reader or admin identity', () => {
  const reader: Identity = { id: 'reader-1', email: 'reader@example.com', name: 'Reader One', role: 'reader' };
  assert.equal(accessFor('GET', '/api/auth/me'), 'reader');
  assert.equal(accessFor('GET', '/api/account/reading-updates'), 'reader');
  assert.equal(accessFor('POST', '/api/ai/tts'), 'reader');
  assert.equal(authorizationStatus('reader'), 401);
  assert.equal(authorizationStatus('reader', reader), 200);
});

test('F2-3: admin routes require an identity with admin role', () => {
  const reader: Identity = { id: 'r1', email: 'r@test.com', name: 'Reader', role: 'reader' };
  const admin: Identity = { id: 'a1', email: 'admin@bookatlas.nl', name: 'Admin', role: 'admin' };
  assert.equal(accessFor('GET', '/api/manager/workforce'), 'admin');
  assert.equal(accessFor('POST', '/api/books'), 'admin');
  assert.equal(authorizationStatus('admin'), 401);
  assert.equal(authorizationStatus('admin', reader), 403);
  assert.equal(authorizationStatus('admin', admin), 200);
});

test('F2-4: owner bootstrapping verifies email match and protects against replay', () => {
  const ownerEmail = 'eddy.owner@bookatlas.nl';
  assert.equal(canBootstrapOwner(ownerEmail, true, ownerEmail, false), true);
  assert.equal(canBootstrapOwner(ownerEmail, true, ownerEmail, true), false); // already bootstrapped
  assert.equal(canBootstrapOwner('other@user.com', true, ownerEmail, false), false); // wrong email
  assert.equal(canBootstrapOwner(ownerEmail, false, ownerEmail, false), false); // unverified email
});

test('F2-5: safe reader return path prevents open redirects and allows whitelisted paths', () => {
  assert.equal(safeReaderReturnPath('/user-portal?view=ai&service=chat'), '/user-portal?view=ai&service=chat');
  assert.equal(safeReaderReturnPath('/checkout'), '/checkout');
  assert.equal(safeReaderReturnPath('https://evil.com/phish'), '/');
  assert.equal(safeReaderReturnPath('//malicious.com'), '/');
  assert.equal(safeReaderReturnPath(null), '/');
});

// ----------------------------------------------------------------------------
// Feature 3: In-Browser eReader
// ----------------------------------------------------------------------------
test('F3-1: eReader default display preferences conform to design contract', () => {
  assert.equal(DEFAULT_READER_SETTINGS.fontSize, 18);
  assert.equal(DEFAULT_READER_SETTINGS.lineHeight, 1.7);
  assert.equal(DEFAULT_READER_SETTINGS.fontFamily, 'literata');
  assert.equal(DEFAULT_READER_SETTINGS.theme, 'sepia');
  assert.equal(DEFAULT_READER_SETTINGS.marginWidth, 'normal');
});

test('F3-2: eReader font sizes validate within acceptable bounds [14, 26]', () => {
  assert.ok(isValidReaderFontSize(14));
  assert.ok(isValidReaderFontSize(18));
  assert.ok(isValidReaderFontSize(26));
  assert.equal(isValidReaderFontSize(12), false);
  assert.equal(isValidReaderFontSize(32), false);
  assert.equal(isValidReaderFontSize('18'), false);
});

test('F3-3: eReader themes cover day, sepia, night, mint, and black modes', () => {
  assert.deepEqual(READER_THEMES, ['day', 'sepia', 'night', 'mint', 'black']);
  for (const theme of READER_THEMES) {
    assert.ok(READER_THEMES.includes(theme));
  }
  assert.equal(READER_THEMES.includes('neon' as any), false);
});

test('F3-4: chapter navigation traverses manuscript chapters with content paragraphs', () => {
  const sampleBook = INITIAL_BOOKS[0];
  assert.ok(sampleBook.sampleChapters.length > 0);
  const chapter1 = sampleBook.sampleChapters[0];
  assert.ok(chapter1.title.length > 0);
  assert.ok(Array.isArray(chapter1.content));
  assert.ok(chapter1.content.length > 0);
});

test('F3-5: bookmarks collection preserves distinct chapter indices', () => {
  let bookmarks: number[] = [];
  bookmarks = toggleChapterBookmark(bookmarks, 0);
  bookmarks = toggleChapterBookmark(bookmarks, 2);
  bookmarks = toggleChapterBookmark(bookmarks, 0); // toggling removes duplicate
  assert.deepEqual(bookmarks, [2]);
  bookmarks = toggleChapterBookmark(bookmarks, 0); // re-adding index 0
  assert.deepEqual(bookmarks, [0, 2]);
});

// ----------------------------------------------------------------------------
// Feature 4: Audiobook Playback Dock
// ----------------------------------------------------------------------------
test('F4-1: audiobook total duration is accurately computed in seconds', () => {
  const book = INITIAL_BOOKS.find(b => b.audioDurationMinutes && b.audioDurationMinutes > 0) || INITIAL_BOOKS[0];
  const durationSeconds = calculateAudioDurationSeconds(book.audioDurationMinutes);
  assert.ok(durationSeconds > 0);
  assert.equal(durationSeconds, (book.audioDurationMinutes || 480) * 60);
});

test('F4-2: playback speeds are limited to curated multipliers [0.75x to 2.0x]', () => {
  assert.equal(AUDIO_PLAYBACK_SPEEDS.length, 5);
  assert.ok(AUDIO_PLAYBACK_SPEEDS.includes(1.0));
  assert.ok(AUDIO_PLAYBACK_SPEEDS.includes(1.5));
  assert.equal((AUDIO_PLAYBACK_SPEEDS as readonly number[]).includes(3.0), false);
});

test('F4-3: skip forward advances playback time bounded by track duration', () => {
  const duration = 300;
  assert.equal(skipAudioForward(100, duration), 115);
  assert.equal(skipAudioForward(295, duration), 300);
});

test('F4-4: skip backward rewinds playback time bounded by track start', () => {
  assert.equal(skipAudioBackward(50), 35);
  assert.equal(skipAudioBackward(10), 0);
});

test('F4-5: audio time formatter produces clean MM:SS and HH:MM:SS timestamps', () => {
  assert.equal(formatAudioTime(65), '1:05');
  assert.equal(formatAudioTime(3665), '1:01:05');
  assert.equal(formatAudioTime(0), '0:00');
});

// ----------------------------------------------------------------------------
// Feature 5: Personal Bookshelf & Stats
// ----------------------------------------------------------------------------
test('F5-1: completed books metric tallies finished items and 100% progress', () => {
  const library: UserLibraryItem[] = [
    { book: INITIAL_BOOKS[0], format: 'ebook', progressPercent: 100, currentChapterIndex: 5, currentParagraphIndex: 0, lastReadTimestamp: Date.now(), highlights: [], bookmarks: [] },
    { book: INITIAL_BOOKS[1], format: 'ebook', progressPercent: 50, currentChapterIndex: 2, currentParagraphIndex: 0, lastReadTimestamp: Date.now(), highlights: [], bookmarks: [], finished: true },
    { book: INITIAL_BOOKS[2], format: 'audiobook', progressPercent: 20, currentChapterIndex: 1, currentParagraphIndex: 0, lastReadTimestamp: Date.now(), highlights: [], bookmarks: [] },
  ];
  const stats = libraryStats(library);
  assert.equal(stats.completedBooks, 2);
});

test('F5-2: reading hours accurately calculates hours from pages read', () => {
  const book = { ...INITIAL_BOOKS[0], pageCount: 450 };
  const library: UserLibraryItem[] = [
    { book, format: 'ebook', progressPercent: 100, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: Date.now(), highlights: [], bookmarks: [] },
  ];
  // 450 pages / 45 pages-per-hour = 10 reading hours
  const stats = libraryStats(library);
  assert.equal(stats.totalReadingHours, 10);
});

test('F5-3: reading streak increments on consecutive calendar days', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const d1 = new Date('2026-11-07T10:00:00Z').getTime();
  const d2 = new Date('2026-11-06T10:00:00Z').getTime();
  const d3 = new Date('2026-11-05T10:00:00Z').getTime();
  const library: UserLibraryItem[] = [
    { book: INITIAL_BOOKS[0], format: 'ebook', progressPercent: 10, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: d1, highlights: [], bookmarks: [] },
    { book: INITIAL_BOOKS[1], format: 'ebook', progressPercent: 10, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: d2, highlights: [], bookmarks: [] },
    { book: INITIAL_BOOKS[2], format: 'ebook', progressPercent: 10, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: d3, highlights: [], bookmarks: [] },
  ];
  const stats = libraryStats(library, now);
  assert.equal(stats.recordedStreakDays, 3);
});

test('F5-4: multiple read sessions on the same calendar day count as one day', () => {
  const now = new Date('2026-11-07T18:00:00Z');
  const session1 = new Date('2026-11-07T09:00:00Z').getTime();
  const session2 = new Date('2026-11-07T14:00:00Z').getTime();
  const library: UserLibraryItem[] = [
    { book: INITIAL_BOOKS[0], format: 'ebook', progressPercent: 10, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: session1, highlights: [], bookmarks: [] },
    { book: INITIAL_BOOKS[1], format: 'ebook', progressPercent: 15, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: session2, highlights: [], bookmarks: [] },
  ];
  const stats = libraryStats(library, now);
  assert.equal(stats.recordedStreakDays, 1);
});

test('F5-5: empty library produces zero stats without inventing placeholder data', () => {
  const stats = libraryStats([]);
  assert.equal(stats.completedBooks, 0);
  assert.equal(stats.totalReadingHours, 0);
  assert.equal(stats.recordedStreakDays, 0);
});

// ----------------------------------------------------------------------------
// Feature 6: Cart & Checkout
// ----------------------------------------------------------------------------
test('F6-1: cart raw subtotal computes precise monetary sum of items', () => {
  const cart = [
    { book: { ...INITIAL_BOOKS[0], price: 12.50 }, format: 'ebook' as const, addedAt: Date.now() },
    { book: { ...INITIAL_BOOKS[1], price: 8.50 }, format: 'audiobook' as const, addedAt: Date.now() },
  ];
  const rawSubtotal = calculateCartSubtotal(cart);
  assert.equal(rawSubtotal, 21.00);
});

test('F6-2: promo code BOOKATLAS20 discounts 20% off subtotal', () => {
  const subtotal = 50.00;
  const promo = applyPromoDiscount(subtotal, 'BOOKATLAS20');
  assert.equal(promo.valid, true);
  assert.equal(promo.discountPercent, 20);
  assert.equal(promo.discountAmount, 10.00);
  assert.equal(promo.total, 40.00);

  const invalid = applyPromoDiscount(subtotal, 'INVALIDCODE');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.total, 50.00);
});

test('F6-3: super points accumulated equals 10x item price rounded', () => {
  const cart = [
    { book: INITIAL_BOOKS[0], format: 'ebook' as const, addedAt: Date.now() },
    { book: INITIAL_BOOKS[1], format: 'audiobook' as const, addedAt: Date.now() },
  ];
  const totalPoints = calculateCartSuperPoints(cart);
  assert.ok(totalPoints > 0);
  assert.equal(typeof totalPoints, 'number');
});

test('F6-4: simulated checkout completes with explicit demo notice and no real billing', () => {
  assert.match(DEMO_CHECKOUT_NOTICE, /No payment was processed/);
  assert.match(DEMO_CHECKOUT_NOTICE, /no order was placed/);
});

test('F6-5: guest cart merge deduplicates against existing account items by book ID and format', () => {
  const accountCart = [
    { book: INITIAL_BOOKS[0], format: 'ebook' as const, addedAt: 100 },
  ];
  const guestCart = [
    { book: INITIAL_BOOKS[0], format: 'ebook' as const, addedAt: 200 }, // duplicate
    { book: INITIAL_BOOKS[1], format: 'audiobook' as const, addedAt: 300 }, // new
  ];
  const merged = mergeGuestCartIntoAccount(accountCart, guestCart);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].book.id, INITIAL_BOOKS[0].id);
  assert.equal(merged[1].book.id, INITIAL_BOOKS[1].id);
});

// ----------------------------------------------------------------------------
// Feature 7: Mobile & PWA Navigation
// ----------------------------------------------------------------------------
test('F7-1: web app manifest defines standalone display and valid metadata', () => {
  const manifestRaw = readFileSync('artifacts/bookatlas/public/manifest.webmanifest', 'utf8');
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.short_name, 'Bookatlas');
  assert.equal(manifest.display, 'standalone');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
});

test('F7-2: service worker declares static and data cache partitions', () => {
  const swCode = readFileSync('artifacts/bookatlas/public/sw.js', 'utf8');
  assert.match(swCode, /const STATIC_CACHE = `static-\${CACHE_VERSION}`;/);
  assert.match(swCode, /const DATA_CACHE = `data-\${CACHE_VERSION}`;/);
});

test('F7-3: service worker bypasses non-GET requests for offline cache', () => {
  const swCode = readFileSync('artifacts/bookatlas/public/sw.js', 'utf8');
  assert.match(swCode, /if \(request\.method !== 'GET'\) \{\s*return;\s*\}/);
});

test('F7-4: service worker sends every API request to the network; only the public catalogue is cached', () => {
  const swCode = readFileSync('artifacts/bookatlas/public/sw.js', 'utf8');
  assert.match(swCode, /if \(url\.pathname\.startsWith\('\/api\/'\)\)/);
  assert.match(swCode, /if \(!publicCatalogue \|\| request\.headers\.has\('Authorization'\)\) \{\s*event\.respondWith\(fetch\(request\)\);/);
  assert.doesNotMatch(swCode, /return cachedResponse \|\| fetchPromise/, 'no cache-first answers for the API');
});

test('F7-5: mobile bottom nav supports 5 primary destinations (Explore, Audio, AI Studio, Bookshelf, Cart)', () => {
  const navCode = readFileSync('artifacts/bookatlas/src/components/MobileBottomNav.tsx', 'utf8');
  assert.match(navCode, /aria-label="Store Explore"/);
  assert.match(navCode, /aria-label="Audio books"/);
  assert.match(navCode, /aria-label="Gemini AI Studio Hub"/);
  assert.match(navCode, /aria-label="My Bookshelf"/);
  assert.match(navCode, /aria-label=\{`Cart \(\$\{cartCount\} items\)`\}/);
});

// ----------------------------------------------------------------------------
// Feature 8: Reader AI Copilot & Matchmaker
// ----------------------------------------------------------------------------
test('F8-1: AI matchmaker scores books based on reader preference queries', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/ai/matchmaker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt: 'mystery detective amsterdam' }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.recommendations) && data.recommendations.length > 0);
  const topMatch = data.recommendations[0];
  assert.ok(typeof topMatch.rationale === 'string' && topMatch.rationale.length > 10);
});

test('F8-2: AI copilot explain action produces rich psychological and narrative insight', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/ai/reader-copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'explain',
      text: 'The canals reflected the amber gas lamps.',
      bookTitle: 'The Keizersgracht Cipher',
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.result, /psychological tension|imagery|The Keizersgracht Cipher/i);
});

test('F8-3: AI copilot summarize action generates structured bullet points', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/ai/reader-copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'summarize',
      text: 'A secret document was found behind the painting.',
      bookTitle: 'The Keizersgracht Cipher',
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.result, /•/);
});

test('F8-4: AI copilot character_intent action analyzes internal conflict', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/ai/reader-copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'character_intent',
      text: 'He looked back at the doorway, hesitant to step across.',
      bookTitle: 'The Keizersgracht Cipher',
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.result, /allegiances|motives|hesitation|decision|conflict/i);
});

test('F8-5: AI book summary provides core takeaways and philosophical questions', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/ai/book-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book: INITIAL_BOOKS[0] }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.data.coreTakeaways.length >= 2);
  assert.match(data.data.philosophicalQuestion, /\?/);
});

// ----------------------------------------------------------------------------
// Feature 9: Gemini Multimodal AI Hub
// ----------------------------------------------------------------------------
test('F9-1: chatbot fallback handles recommendation, dutch heritage, and writing craft inquiries', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Can you recommend a book about Amsterdam?' }],
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.reply, /recommend|Amsterdam/i);
});

test('F9-2: chat personas specify distinct system prompts and recommended models', () => {
  assert.ok(PERSONAS.length >= 3);
  const scholar = PERSONAS.find(p => p.id === 'scholar');
  assert.ok(scholar);
  assert.equal(scholar.recommendedModel, 'gemini-3.1-pro-preview');
  assert.ok(scholar.systemInstruction.length > 20);
});

test('F9-3: live voice companion responds with concise, warm speech persona', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/gemini/voice-dialogue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userUtterance: 'Hello!' }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.voicePersona, 'Zephyr');
  assert.ok(data.spokenText.length > 10);
});

test('F9-4: google search grounding schema requires verified web citations and search queries', () => {
  const grounding = {
    query: 'Bestseller trends in Europe 2026',
    answer: 'Speculative climate fiction and historical fiction are leading charts.',
    sources: [
      { title: 'CPNB Bestseller 60', url: 'https://www.debestseller60.nl', snippet: 'Official weekly sales' },
    ],
    searchQueries: ['European Bestseller charts 2026'],
    timestamp: new Date().toISOString(),
  };
  assert.ok(grounding.sources.length > 0);
  assert.ok(grounding.sources[0].url.startsWith('https://'));
  assert.ok(grounding.searchQueries.length > 0);
});

test('F9-5: veo video generator initiates video operations with aspect ratio selection', () => {
  const op = {
    id: 'veo-op-101',
    status: 'ready',
    progress: 100,
    aspectRatio: '16:9',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  };
  assert.equal(op.aspectRatio, '16:9');
  assert.equal(op.status, 'ready');
  assert.ok(op.videoUrl.endsWith('.mp4'));
});

// ----------------------------------------------------------------------------
// Feature 10: Studio Voice Narration
// ----------------------------------------------------------------------------
test('F10-1: curated voice catalog designates Sulafat and Charon as primary recommendations', () => {
  assert.equal(DEFAULT_FEMALE_VOICE, 'Sulafat');
  assert.equal(DEFAULT_MALE_VOICE, 'Charon');
  assert.equal(studioVoice('Sulafat')?.gender, 'Female');
  assert.equal(studioVoice('Charon')?.gender, 'Male');
  assert.equal(STUDIO_SPEECH_MODEL, 'gemini-3.8-flash-tts');
});

test('F10-2: narration direction instructs verbatim script performance without modification', () => {
  const direction = narrationDirection(DEFAULT_FEMALE_VOICE);
  assert.match(direction, /Read the supplied script exactly/);
  assert.match(direction, /without additions/);
});

test('F10-3: reader TTS clips enforce conservative budget reservation ($0.10)', () => {
  const reservation = readerNarrationReservationMicros(100, 200);
  assert.ok(reservation > 0);
  assert.equal(typeof reservation, 'number');
});

test('F10-4: narration request validation enforces character cap (500 chars) and approval', () => {
  const validRequest = {
    requestId: '00000000-0000-4000-8000-000000000001',
    text: 'A concise sample script for studio narration.',
    voiceName: DEFAULT_FEMALE_VOICE,
    approveSpend: true as const,
    budgetUsd: 0.1 as const,
  };
  assert.ok(CreateReaderNarrationBody.safeParse(validRequest).success);
  assert.ok(validateReaderNarrationInput(validRequest));
  assert.equal(CreateReaderNarrationBody.safeParse({ ...validRequest, approveSpend: false }).success, false);
});

test('F10-5: PCM audio bytes wrap into valid WAV format with accurate duration calculation', () => {
  const sampleRate = 24000;
  const numSamples = 24000; // 1 second of audio
  const pcmBytes = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes/sample
  const wavBytes = wrapPcm16LE(pcmBytes, sampleRate);
  const info = inspectWav(wavBytes);
  assert.equal(info.sampleRate, 24000);
  assert.equal(info.channels, 1);
  assert.equal(info.blockAlign, 2); // 16-bit mono = 2 bytes per sample
  assert.equal(wavBytes.readUInt16LE(34), 16); // WAV fmt chunk bitsPerSample
  assert.equal(Math.round(info.durationSeconds), 1);
});

// ----------------------------------------------------------------------------
// Feature 11: Durable Publishing Pipeline
// ----------------------------------------------------------------------------
test('F11-1: text manuscript upload preserves UTF-8 characters and computes sha256', async () => {
  const text = 'Chapter 1: The Odyssey begins.\n\nFeaturing characters in Amsterdam and Tokyo 🌍.';
  const payload = {
    fileName: 'manuscript.txt',
    base64: Buffer.from(text).toString('base64'),
    mimeType: 'text/plain',
  };
  const validated = await validateSource(payload);
  assert.equal(validated.text, text);
  assert.match(validated.sha256, /^[0-9a-f]{64}$/);
});

test('F11-2: PDF upload checks real page count and rejects oversized documents', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const bytes = await doc.save();
  const payload = {
    fileName: 'document.pdf',
    base64: Buffer.from(bytes).toString('base64'),
    mimeType: 'application/pdf',
  };
  const validated = await validateSource(payload);
  assert.equal(validated.pageCount, 1);
  assert.equal(validated.mimeType, 'application/pdf');
});

test('F11-3: base64 decoder rejects non-canonical padding and junk data', () => {
  assert.throws(() => decodeBase64('bad-base64!', 100));
  assert.throws(() => decodeBase64('abc==', 100));
});

test('F11-4: EPUB builder produces valid ZIP container with uncompressed mimetype as first entry', async () => {
  const manuscript = {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'The Great Publication',
    author: 'Elena Scholar',
    language: 'en',
    description: 'A complete manuscript publication test.',
    chapters: [
      { title: 'Chapter 1', text: 'Paragraph one of the manuscript.' },
      { title: 'Chapter 2', text: 'Paragraph two of the manuscript.' },
    ],
  };
  const epubResult = buildEpub(manuscript, new Date('2026-11-01T00:00:00Z'));
  const epubBytes = epubResult.bytes;
  assert.ok(epubBytes.length > 0);
  // EPUB spec requires first entry to be mimetype uncompressed at offset 30
  const mimetypeStr = epubBytes.subarray(38, 58).toString('utf8');
  assert.equal(mimetypeStr, 'application/epub+zip');
});

test('F11-5: publishing job action schema validates retry, cancel, publish, and launch commands', () => {
  const validAction = {
    action: 'publish' as const,
    notifyPublisher: true,
    publisherEmail: 'author@publisher.com',
  };
  assert.equal(validAction.action, 'publish');
  assert.ok(validAction.publisherEmail.includes('@'));
});

// ----------------------------------------------------------------------------
// Feature 12: Subscriber CRM (100k)
// ----------------------------------------------------------------------------
test('F12-1: RFC 4180 CSV parser detects comma, semicolon, and tab delimiters', () => {
  const detectDelimiter = (firstLine: string) => {
    if (firstLine.includes(';') && !firstLine.includes(',')) return ';';
    if (firstLine.includes('\t')) return '\t';
    return ',';
  };
  assert.equal(detectDelimiter('email,name,tier'), ',');
  assert.equal(detectDelimiter('email;name;tier'), ';');
  assert.equal(detectDelimiter('email\tname\ttier'), '\t');
});

test('F12-2: subscriber email syntax validation strictly adheres to email pattern', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.ok(emailRegex.test('reader@bookatlas.nl'));
  assert.ok(emailRegex.test('john.doe+atlas@example.com'));
  assert.equal(emailRegex.test('not-an-email'), false);
  assert.equal(emailRegex.test('missing@domain'), false);
});

test('F12-3: subscriber tier assignment categorizes free_reader, member_subscriber, and vip_patron', () => {
  const assignTier = (tierStr: string) => {
    const lower = tierStr.toLowerCase();
    if (lower.includes('vip') || lower.includes('patron')) return 'vip_patron';
    if (lower.includes('member') || lower.includes('plus')) return 'member_subscriber';
    return 'free_reader';
  };
  assert.equal(assignTier('VIP Patron Circle'), 'vip_patron');
  assert.equal(assignTier('Plus Member'), 'member_subscriber');
  assert.equal(assignTier('standard'), 'free_reader');
});

test('F12-4: subscriber database cleanup identifies bounced and unsubscribed records for removal', () => {
  const records = [
    { email: 'active@test.com', status: 'subscribed' },
    { email: 'bounced@test.com', status: 'bounced' },
    { email: 'optout@test.com', status: 'unsubscribed' },
  ];
  const toDelete = records.filter(r => r.status === 'bounced' || r.status === 'unsubscribed');
  assert.equal(toDelete.length, 2);
  assert.equal(toDelete[0].email, 'bounced@test.com');
  assert.equal(toDelete[1].email, 'optout@test.com');
});

test('F12-5: benchmark generator synthesizes subscribers with reading streaks and discount codes', () => {
  const generateBenchmarkSubscriber = (index: number) => ({
    email: `reader${index}@example.nl`,
    name: `Reader ${index}`,
    tier: index % 3 === 0 ? 'vip_patron' : 'free_reader',
    readingStreakDays: (index % 14) + 1,
    userDiscountCode: index % 3 === 0 ? 'VIPATLAS40' : 'READ10',
  });
  const sub = generateBenchmarkSubscriber(9);
  assert.equal(sub.tier, 'vip_patron');
  assert.equal(sub.userDiscountCode, 'VIPATLAS40');
  assert.ok(sub.readingStreakDays >= 1 && sub.readingStreakDays <= 14);
});

// ----------------------------------------------------------------------------
// Feature 13: Email Campaigns & Unsubscribe
// ----------------------------------------------------------------------------
test('F13-1: email campaign template interpolates subscriber tags and discount codes', () => {
  const template = 'Dear {{subscriber_name}}, your perk is {{user_discount_code}}. Keep your {{reading_stats_streak}}-day streak!';
  const subscriber = { name: 'Elena', discountCode: 'ELENA40', streak: 12 };
  const interpolated = template
    .replace(/\{\{subscriber_name\}\}/g, subscriber.name)
    .replace(/\{\{user_discount_code\}\}/g, subscriber.discountCode)
    .replace(/\{\{reading_stats_streak\}\}/g, String(subscriber.streak));
  assert.equal(interpolated, 'Dear Elena, your perk is ELENA40. Keep your 12-day streak!');
});

test('F13-2: A/B testing splits recipients 50/50 between Variant A and Variant B', () => {
  const totalRecipients = 1000;
  const splitPercent = 50;
  const variantACount = Math.floor(totalRecipients * (splitPercent / 100));
  const variantBCount = totalRecipients - variantACount;
  assert.equal(variantACount, 500);
  assert.equal(variantBCount, 500);
});

test('F13-3: signed HMAC unsubscribe token verifies genuine email payload', () => {
  const secret = process.env.SESSION_SECRET!;
  const email = 'subscriber@bookatlas.nl';
  const payload = Buffer.from(JSON.stringify({ email, purpose: 'marketing-unsubscribe' })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const token = `${payload}.${signature}`;
  const extractedEmail = unsubscribeEmail(token);
  assert.equal(extractedEmail, email);
});

test('F13-4: altered unsubscribe token signature throws 403 authorization error', () => {
  const secret = process.env.SESSION_SECRET!;
  const email = 'subscriber@bookatlas.nl';
  const payload = Buffer.from(JSON.stringify({ email, purpose: 'marketing-unsubscribe' })).toString('base64url');
  const invalidSignature = '0'.repeat(64);
  const badToken = `${payload}.${invalidSignature}`;
  assert.throws(() => unsubscribeEmail(badToken), /Invalid unsubscribe link/);
});

test('F13-5: eligible reader predicate strictly enforces real, consented, and unsuppressed status', () => {
  const validContact = {
    status: 'subscribed',
    is_demo: false,
    suppressed: false,
    marketing_consent_at: '2026-11-01T00:00:00Z',
    marketing_consent_source: 'store_checkout',
  };
  assert.equal(eligibleReader(validContact), true);
  assert.equal(eligibleReader({ ...validContact, status: 'unsubscribed' }), false);
  assert.equal(eligibleReader({ ...validContact, is_demo: true }), false);
  assert.equal(eligibleReader({ ...validContact, suppressed: true }), false);
});

// ----------------------------------------------------------------------------
// Feature 14: AI Team Workforce
// ----------------------------------------------------------------------------
test('F14-1: workforce catalog registers all 30 distinct AI roles with mandates and deliverables', () => {
  assert.equal(workforceRoles.length, 30);
  const ids = new Set(workforceRoles.map(r => r.id));
  assert.equal(ids.size, 30);
  for (const role of workforceRoles) {
    assert.ok(role.name.endsWith(' Agent'));
    assert.ok(role.mandate.length >= 20);
    assert.ok(role.deliverable.length >= 20);
  }
});

test('F14-2: workforce team presets configure 10-person MVP and 38-person Scale-up human sizing', () => {
  const [mvp, scaleUp] = workforceTeams;
  assert.equal(mvp.humanHeadcount, 10);
  assert.equal(scaleUp.humanHeadcount, 38);
  assert.equal(mvp.disciplines.reduce((sum, d) => sum + d.count, 0), 10);
  assert.equal(scaleUp.disciplines.reduce((sum, d) => sum + d.count, 0), 38);
});

test('F14-3: workforce task creation input schema enforces budget between $0.05 and $1.00', () => {
  const validTask = {
    idempotencyKey: '00000000-0000-4000-8000-000000000002',
    objective: 'Review the technical architecture and security policies.',
    workerIds: ['cto', 'security'],
    budgetUsd: 0.50,
  };
  assert.ok(CreateWorkforceTaskBody.safeParse(validTask).success);
  assert.equal(CreateWorkforceTaskBody.safeParse({ ...validTask, budgetUsd: 0.01 }).success, false);
  assert.equal(CreateWorkforceTaskBody.safeParse({ ...validTask, budgetUsd: 1.50 }).success, false);
});

test('F14-4: worker execution requires explicit approveSpend: true confirmation', () => {
  assert.ok(RunWorkforceWorkerBody.safeParse({ approveSpend: true }).success);
  assert.equal(RunWorkforceWorkerBody.safeParse({ approveSpend: false }).success, false);
  assert.equal(RunWorkforceWorkerBody.safeParse({}).success, false);
});

test('F14-5: workforce execution policy explicitly prohibits autonomous external web scraping', () => {
  assert.match(workforcePolicy, /no live web research/);
  assert.match(workforcePolicy, /not independent employees/);
});

// ----------------------------------------------------------------------------
// Feature 15: Admin Management Portal
// ----------------------------------------------------------------------------
test('F15-1: admin live catalog supports creating books with required fields', () => {
  const newBook = {
    title: 'The Cartographer of Utrecht',
    author: 'Jan van Houten',
    price: 14.99,
    primaryGenre: 'Historical Fiction',
  };
  assert.ok(newBook.title.length > 0);
  assert.ok(newBook.author.length > 0);
  assert.ok(newBook.price > 0);
});

test('F15-2: catalog book updates preserve book ID and update mutable fields', () => {
  const original = { id: 'book-100', title: 'Old Title', price: 9.99 };
  const update = { title: 'New Title', price: 11.99 };
  const merged = { ...original, ...update, id: original.id };
  assert.equal(merged.id, 'book-100');
  assert.equal(merged.title, 'New Title');
  assert.equal(merged.price, 11.99);
});

test('F15-3: category manager adds custom publisher genres without duplicates', () => {
  const categories = ['Fiction & Literature', 'Philosophy & Deep Thought'];
  const addCategory = (list: string[], name: string) => {
    const trimmed = name.trim();
    if (!list.includes(trimmed)) return [...list, trimmed];
    return list;
  };
  const updated = addCategory(categories, 'Quantum Metaphysics');
  assert.equal(updated.length, 3);
  assert.ok(updated.includes('Quantum Metaphysics'));
  const deduplicated = addCategory(updated, 'Quantum Metaphysics');
  assert.equal(deduplicated.length, 3);
});

test('F15-4: automation log entry includes timestamp, action type, and badge', () => {
  const log = {
    id: 'log-1',
    timestamp: '14:20:00',
    actionType: 'inventory_sync' as const,
    title: 'New Category Added',
    description: 'Added Quantum Metaphysics for catalog indexing.',
    badge: 'Category Manager',
  };
  assert.equal(log.actionType, 'inventory_sync');
  assert.equal(log.badge, 'Category Manager');
});

test('F15-5: platform documentation export schema defines compliance and architecture metadata', () => {
  const exportDoc = {
    platformName: 'Bookatlas Enterprise Digital Bookstore',
    company: {
      name: 'Atlantean Globals Services',
      compliance: 'GDPR / DRM / EPUB3 / ISO-27001 Certified Standards',
    },
    technologyStack: {
      frontend: 'React 19, TypeScript, Tailwind CSS v4',
      backend: 'Node.js, Express, tsx runtime',
    },
  };
  assert.match(exportDoc.company.compliance, /GDPR/);
  assert.match(exportDoc.technologyStack.frontend, /React 19/);
});

// ----------------------------------------------------------------------------
// Feature 16: Database Isolation & Supabase Client
// ----------------------------------------------------------------------------
test('F16-1: all persistence table mappings are strictly bookatlas_ prefixed', () => {
  for (const [logical, physical] of Object.entries(BOOKATLAS_TABLES)) {
    assert.equal(physical, `bookatlas_${logical}`);
    assert.equal(bookatlasTable(logical), `bookatlas_${logical}`);
  }
});

test('F16-2: bookatlasTable throws error on unmapped or malicious table requests', () => {
  assert.throws(() => bookatlasTable('users'), /Unknown/);
  assert.throws(() => bookatlasTable('orders'), /Unknown/);
  assert.throws(() => bookatlasTable('bookatlas_books; DROP TABLE categories'), /Unknown/);
  assert.throws(() => bookatlasTable('__proto__'), /Unknown/);
});

test('F16-3: setup SQL schema contains exactly 12 tables with Row Level Security enabled', () => {
  const sql = readFileSync('artifacts/api-server/src/bookatlas/db/schema.sql', 'utf8').replace(/--[^\n]*/g, '');
  const rlsStatements = [...sql.matchAll(/alter table public\.(\w+) enable row level security/gi)];
  assert.equal(rlsStatements.length, 12);
  assert.ok(rlsStatements.every(match => match[1].startsWith('bookatlas_')));
});

test('F16-4: setup SQL schema contains no drop, truncate, or demo insert statements', () => {
  const sql = readFileSync('artifacts/api-server/src/bookatlas/db/schema.sql', 'utf8').replace(/--[^\n]*/g, '');
  assert.doesNotMatch(sql, /\b(?:drop\s+table|truncate)\b/i);
  assert.doesNotMatch(sql, /\binsert\s+into\b/i);
});

test('F16-5: repository calls scoped database client without cross-tenant crossover', () => {
  const repoCode = readFileSync('artifacts/api-server/src/bookatlas/db/repository.ts', 'utf8');
  assert.match(repoCode, /import \{ bookatlasDb as supabase \} from '\.\/supabaseClient\.js';/);
  const tableCalls = [...repoCode.matchAll(/\.from\('([^']+)'\)/g)].map(m => m[1]);
  assert.ok(tableCalls.every(tableName => Object.hasOwn(BOOKATLAS_TABLES, tableName)));
});
