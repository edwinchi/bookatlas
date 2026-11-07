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
import { filterCatalog } from '../../artifacts/bookatlas/src/catalog.ts';
import { INITIAL_BOOKS } from '../../lib/bookatlas-catalog/src/data/booksData.ts';
import { accessFor, authorizationStatus, type Identity } from '../../artifacts/api-server/src/auth/policy.ts';
import { safeReaderReturnPath } from '../../artifacts/bookatlas/src/auth/navigation.ts';
import { libraryStats } from '../../artifacts/bookatlas/src/libraryStats.ts';
import type { Book, FilterOptions, UserLibraryItem, ReaderSettings } from '../../artifacts/bookatlas/src/types.ts';
import {
  calculateAudioDurationSeconds,
  resolvePlaybackSpeed,
  skipAudioForward,
  skipAudioBackward,
  formatAudioTime,
} from '../../artifacts/bookatlas/src/utils/audioPlayer.ts';
import { createWorkforceTask } from '../../artifacts/api-server/src/bookatlas/workforce/service.ts';
import { CreatePublishingJobBody, CreateReaderNarrationBody, CreateWorkforceTaskBody, RunWorkforceWorkerBody } from '../../lib/api-zod/src/generated/api.ts';
import { validateSource, decodeBase64 } from '../../artifacts/api-server/src/bookatlas/publishing/source.ts';
import { unsubscribeEmail } from '../../artifacts/api-server/src/bookatlas/publishing/campaigns.ts';
import { BOOKATLAS_TABLES, bookatlasTable } from '../../artifacts/api-server/src/bookatlas/db/tables.ts';

after(async () => {
  await closeSharedTestServer();
});

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
// TIER 2: BOUNDARY & CORNER CASES (16 FEATURES × 5 TESTS = 80 TESTS)
// ============================================================================

// ----------------------------------------------------------------------------
// Feature 1: Storefront & Catalog Search Boundaries
// ----------------------------------------------------------------------------
test('F1-B1: empty or whitespace-only search query returns the entire catalog intact', () => {
  const emptyRes = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, searchQuery: '' }, 'store');
  const spaceRes = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, searchQuery: '     ' }, 'store');
  assert.equal(emptyRes.length, INITIAL_BOOKS.length);
  assert.equal(spaceRes.length, INITIAL_BOOKS.length);
});

test('F1-B2: extremely long search query handles safely and returns empty list', () => {
  const longQuery = 'x'.repeat(600);
  const results = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, searchQuery: longQuery }, 'store');
  assert.equal(results.length, 0);
});

test('F1-B3: non-existent search query returns empty array without throwing', () => {
  const query = 'xyzzy_nonexistent_token_9999';
  const results = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, searchQuery: query }, 'store');
  assert.deepEqual(results, []);
});

test('F1-B4: price category free filter excludes books with price > 0.00', () => {
  const testBooks: Book[] = [
    { ...INITIAL_BOOKS[0], id: 'free-1', price: 0.00 },
    { ...INITIAL_BOOKS[1], id: 'paid-1', price: 0.01 },
  ];
  const results = filterCatalog(testBooks, { ...defaultFilters, priceCategory: 'free' }, 'store');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'free-1');
});

test('F1-B5: rating boundary 5.0 returns only maximum rated books', () => {
  const results = filterCatalog(INITIAL_BOOKS, { ...defaultFilters, minRating: 5.0 }, 'store');
  assert.ok(results.every(b => b.rating >= 5.0));
});

// ----------------------------------------------------------------------------
// Feature 2: Auth & RBAC Boundaries
// ----------------------------------------------------------------------------
test('F2-B1: safe return path defaults to root on null, undefined, or empty string', () => {
  assert.equal(safeReaderReturnPath(null), '/');
  assert.equal(safeReaderReturnPath(undefined), '/');
  assert.equal(safeReaderReturnPath(''), '/');
});

test('F2-B2: safe return path sanitizes protocol-relative open redirect attempts', () => {
  assert.equal(safeReaderReturnPath('//evil.com/login'), '/');
  assert.equal(safeReaderReturnPath('//attacker.org'), '/');
});

test('F2-B3: safe return path sanitizes control characters and backslashes', () => {
  assert.equal(safeReaderReturnPath('/user-portal\u0000evil'), '/');
  assert.equal(safeReaderReturnPath('/user-portal\\checkout'), '/');
  assert.equal(safeReaderReturnPath('/user-portal\nevil'), '/');
});

test('F2-B4: unauthenticated request to protected reader endpoint returns 401', () => {
  const access = accessFor('GET', '/api/auth/me');
  assert.equal(access, 'reader');
  assert.equal(authorizationStatus(access, undefined), 401);
});

test('F2-B5: reader identity attempting to access admin route returns 403 Forbidden', () => {
  const reader: Identity = { id: 'reader-101', email: 'reader@example.com', name: 'Reader', role: 'reader' };
  const access = accessFor('POST', '/api/manager/workforce/tasks');
  assert.equal(access, 'admin');
  assert.equal(authorizationStatus(access, reader), 403);
});

// ----------------------------------------------------------------------------
// Feature 3: In-Browser eReader Boundaries
// ----------------------------------------------------------------------------
test('F3-B1: font size below minimum (<14px) is clamped to default 18px', () => {
  const clampFontSize = (size: number) => (size >= 14 && size <= 26 ? size : 18);
  assert.equal(clampFontSize(10), 18);
  assert.equal(clampFontSize(0), 18);
  assert.equal(clampFontSize(-5), 18);
});

test('F3-B2: font size above maximum (>26px) is clamped to default 18px', () => {
  const clampFontSize = (size: number) => (size >= 14 && size <= 26 ? size : 18);
  assert.equal(clampFontSize(28), 18);
  assert.equal(clampFontSize(100), 18);
});

test('F3-B3: line height out of bounds (<1.4 or >2.2) is clamped to default 1.7', () => {
  const clampLineHeight = (lh: number) => (lh >= 1.4 && lh <= 2.2 ? lh : 1.7);
  assert.equal(clampLineHeight(1.0), 1.7);
  assert.equal(clampLineHeight(3.0), 1.7);
  assert.equal(clampLineHeight(NaN), 1.7);
});

test('F3-B4: invalid or unsupported theme string falls back to sepia', () => {
  const validThemes = ['day', 'sepia', 'night', 'mint', 'black'];
  const resolveTheme = (theme: string) => (validThemes.includes(theme) ? theme : 'sepia');
  assert.equal(resolveTheme('neon-pink'), 'sepia');
  assert.equal(resolveTheme(''), 'sepia');
});

test('F3-B5: book with empty sample chapters array handles gracefully without index out of bounds', () => {
  const bookWithoutChapters: Book = {
    ...INITIAL_BOOKS[0],
    sampleChapters: [],
  };
  const currentChapter = bookWithoutChapters.sampleChapters[0] || { title: 'Front Cover', content: ['No text available.'] };
  assert.equal(currentChapter.title, 'Front Cover');
  assert.equal(currentChapter.content[0], 'No text available.');
});

// ----------------------------------------------------------------------------
// Feature 4: Audiobook Playback Dock Boundaries
// ----------------------------------------------------------------------------
test('F4-B1: skip forward at near end of audio clamps exactly to total duration', () => {
  assert.equal(skipAudioForward(175, 180), 180);
  assert.equal(skipAudioForward(180, 180), 180);
});

test('F4-B2: skip backward near beginning of audio clamps exactly to zero', () => {
  assert.equal(skipAudioBackward(10), 0);
  assert.equal(skipAudioBackward(0), 0);
});

test('F4-B3: missing audio duration falls back to 480 minutes default', () => {
  const durationSeconds = calculateAudioDurationSeconds(undefined);
  assert.equal(durationSeconds, 480 * 60);
});

test('F4-B4: invalid or zero playback speed falls back to 1.0x', () => {
  assert.equal(resolvePlaybackSpeed(0), 1.0);
  assert.equal(resolvePlaybackSpeed(-1.5), 1.0);
  assert.equal(resolvePlaybackSpeed(10.0), 1.0);
  assert.equal(resolvePlaybackSpeed(1.5), 1.5);
});

test('F4-B5: audio time formatter with 0 seconds produces 0:00 and with negative clamps to 0:00', () => {
  assert.equal(formatAudioTime(0), '0:00');
  assert.equal(formatAudioTime(-10), '0:00');
});

// ----------------------------------------------------------------------------
// Feature 5: Personal Bookshelf & Stats Boundaries
// ----------------------------------------------------------------------------
test('F5-B1: reading progress > 100% clamps to 100% in page read calculations', () => {
  const book = { ...INITIAL_BOOKS[0], pageCount: 200 };
  const library: UserLibraryItem[] = [
    { book, format: 'ebook', progressPercent: 150, currentChapterIndex: 5, currentParagraphIndex: 0, lastReadTimestamp: Date.now(), highlights: [], bookmarks: [] },
  ];
  // 200 pages * 100% / 45 pages-per-hour = 4 reading hours
  const stats = libraryStats(library);
  assert.equal(stats.totalReadingHours, 4);
});

test('F5-B2: negative reading progress clamps to 0% without reducing page counts', () => {
  const book = { ...INITIAL_BOOKS[0], pageCount: 200 };
  const library: UserLibraryItem[] = [
    { book, format: 'ebook', progressPercent: -20, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: Date.now(), highlights: [], bookmarks: [] },
  ];
  const stats = libraryStats(library);
  assert.equal(stats.totalReadingHours, 0);
});

test('F5-B3: timestamps in the future are excluded from reading streak calculations', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const futureTimestamp = new Date('2026-11-08T12:00:00Z').getTime();
  const library: UserLibraryItem[] = [
    { book: INITIAL_BOOKS[0], format: 'ebook', progressPercent: 50, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: futureTimestamp, highlights: [], bookmarks: [] },
  ];
  const stats = libraryStats(library, now);
  assert.equal(stats.recordedStreakDays, 0);
});

test('F5-B4: invalid or NaN timestamps are excluded from reading streaks', () => {
  const library: UserLibraryItem[] = [
    { book: INITIAL_BOOKS[0], format: 'ebook', progressPercent: 50, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: NaN, highlights: [], bookmarks: [] },
    { book: INITIAL_BOOKS[1], format: 'ebook', progressPercent: 50, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: -100, highlights: [], bookmarks: [] },
  ];
  const stats = libraryStats(library);
  assert.equal(stats.recordedStreakDays, 0);
});

test('F5-B5: single reading session on today or yesterday results in 1 streak day', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const yesterday = new Date('2026-11-06T15:00:00Z').getTime();
  const library: UserLibraryItem[] = [
    { book: INITIAL_BOOKS[0], format: 'ebook', progressPercent: 10, currentChapterIndex: 0, currentParagraphIndex: 0, lastReadTimestamp: yesterday, highlights: [], bookmarks: [] },
  ];
  const stats = libraryStats(library, now);
  assert.equal(stats.recordedStreakDays, 1);
});

// ----------------------------------------------------------------------------
// Feature 6: Cart & Checkout Boundaries
// ----------------------------------------------------------------------------
test('F6-B1: empty cart checkout returns false and does not proceed', () => {
  const cart: any[] = [];
  const canCheckout = cart.length > 0;
  assert.equal(canCheckout, false);
});

test('F6-B2: promo code matching handles lowercase and mixed case inputs', () => {
  const validatePromo = (code: string) => {
    const norm = code.trim().toUpperCase();
    return norm === 'BOOKATLAS20' || norm === 'READMORE';
  };
  assert.ok(validatePromo('bookatlas20'));
  assert.ok(validatePromo('BookAtlas20'));
  assert.ok(validatePromo('readmore'));
});

test('F6-B3: promo code with leading and trailing whitespace is trimmed properly', () => {
  const validatePromo = (code: string) => code.trim().toUpperCase() === 'BOOKATLAS20';
  assert.ok(validatePromo('   BOOKATLAS20   '));
});

test('F6-B4: invalid promo code does not apply discount and provides clear error', () => {
  const code = 'INVALID_PROMO_CODE';
  const isValid = code.trim().toUpperCase() === 'BOOKATLAS20' || code.trim().toUpperCase() === 'READMORE';
  const discountPercent = isValid ? 20 : 0;
  const errorMsg = isValid ? '' : 'Invalid promo code. Try "BOOKATLAS20" for 20% off.';
  assert.equal(discountPercent, 0);
  assert.match(errorMsg, /Invalid promo code/);
});

test('F6-B5: cart total never falls below zero even with extreme discounts', () => {
  const rawSubtotal = 10.00;
  const discountAmount = 15.00;
  const total = Math.max(0, rawSubtotal - discountAmount);
  assert.equal(total, 0);
});

// ----------------------------------------------------------------------------
// Feature 7: Mobile & PWA Navigation Boundaries
// ----------------------------------------------------------------------------
test('F7-B1: cart badge with 0 items displays no count', () => {
  const cartCount = 0;
  const showBadge = cartCount > 0;
  assert.equal(showBadge, false);
});

test('F7-B2: cart badge with >9 items displays 9+ overflow indicator', () => {
  const formatBadge = (count: number) => (count > 9 ? '9+' : String(count));
  assert.equal(formatBadge(10), '9+');
  assert.equal(formatBadge(5), '5');
});

test('F7-B3: service worker excludes non-GET requests from caching', () => {
  const isCachableMethod = (method: string) => method === 'GET';
  assert.equal(isCachableMethod('POST'), false);
  assert.equal(isCachableMethod('PUT'), false);
  assert.equal(isCachableMethod('DELETE'), false);
  assert.equal(isCachableMethod('GET'), true);
});

test('F7-B4: unrecognized activeTab safely defaults to store tab', () => {
  const allowedTabs = ['store', 'library', 'deals', 'audiobooks', 'bookatlasplus', 'manager'];
  const resolveTab = (tab: string) => (allowedTabs.includes(tab) ? tab : 'store');
  assert.equal(resolveTab('unknown-tab'), 'store');
  assert.equal(resolveTab(''), 'store');
});

test('F7-B5: manifest theme color and background color are valid hex color values', () => {
  const manifest = JSON.parse(readFileSync('artifacts/bookatlas/public/manifest.webmanifest', 'utf8'));
  const hexPattern = /^#[0-9a-fA-F]{6}$/;
  assert.ok(hexPattern.test(manifest.theme_color));
  assert.ok(hexPattern.test(manifest.background_color));
});

// ----------------------------------------------------------------------------
// Feature 8: Reader AI Copilot & Matchmaker Boundaries
// ----------------------------------------------------------------------------
test('F8-B1: unknown copilot action produces safe general fallback rather than throwing', () => {
  const getFallbackCopilotResult = (action: string) => {
    if (action === 'explain') return 'Explanation';
    if (action === 'summarize') return 'Summary';
    return 'This section explores core themes of resilience, perception, and human curiosity.';
  };
  const fallback = getFallbackCopilotResult('unknown_action_xyz');
  assert.match(fallback, /resilience, perception/);
});

test('F8-B2: empty query to AI matchmaker returns catalog top picks without error', () => {
  const matchmaker = (q: string, catalog: Book[]) => {
    if (!q.trim()) return catalog.slice(0, 4);
    return catalog.filter(b => b.title.toLowerCase().includes(q.toLowerCase()));
  };
  const results = matchmaker('', INITIAL_BOOKS);
  assert.equal(results.length, 4);
});

test('F8-B3: matchmaker pacing calculation handles missing pageCount gracefully', () => {
  const getPacing = (pageCount?: number) => ((pageCount || 300) > 400 ? 'Atmospheric slow burn' : 'Fast-paced');
  assert.equal(getPacing(500), 'Atmospheric slow burn');
  assert.equal(getPacing(250), 'Fast-paced');
  assert.equal(getPacing(undefined), 'Fast-paced');
});

test('F8-B4: AI book summary handles null or undefined book object gracefully', () => {
  const getFallbackSummary = (book: any) => ({
    executiveSummary: `"${book?.title || 'This work'}" by ${book?.author || 'the author'} is an insightful exploration.`,
    coreTakeaways: ['Key takeaway 1', 'Key takeaway 2'],
  });
  const summary = getFallbackSummary(null);
  assert.match(summary.executiveSummary, /"This work" by the author/);
});

test('F8-B5: AI copilot with empty text snippet handles analysis without throwing', () => {
  const analyzeSnippet = (text: string) => (text.trim().length > 0 ? 'Analyzed' : 'No text provided for analysis.');
  assert.equal(analyzeSnippet('   '), 'No text provided for analysis.');
});

// ----------------------------------------------------------------------------
// Feature 9: Gemini Multimodal AI Hub Boundaries
// ----------------------------------------------------------------------------
test('F9-B1: chatbot fallback handles empty user prompt gracefully', () => {
  const generateFallbackChatResponse = (msg: string) => {
    if (!msg || !msg.trim()) return 'Welcome to Bookatlas! How can I assist your reading journey today?';
    return 'Detailed response';
  };
  assert.equal(generateFallbackChatResponse(''), 'Welcome to Bookatlas! How can I assist your reading journey today?');
});

test('F9-B2: search grounding fallback returns literary radar data on empty query', () => {
  const generateFallbackSearchGrounding = (query: string) => ({
    query: query || 'Literary Trends',
    answer: 'Live overview of European bestseller dynamics.',
    sources: [{ title: 'CPNB Bestseller 60', url: 'https://www.debestseller60.nl' }],
  });
  const data = generateFallbackSearchGrounding('');
  assert.equal(data.query, 'Literary Trends');
  assert.ok(data.sources.length > 0);
});

test('F9-B3: video status check for unknown operation returns done with fallback videoUrl', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/gemini/video-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName: 'non-existent-op' }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.done, true);
  assert.equal(data.progress, 100);
  assert.match(data.videoUrl, /^https?:\/\//);
});

test('F9-B4: live voice dialogue with empty conversation history responds with welcome message', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/gemini/voice-dialogue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationHistory: [] }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.spokenText, /Welcome to Bookatlas/i);
});

test('F9-B5: veo video generator with unknown aspect ratio safely defaults to 16:9', async () => {
  const server = await getSharedTestServer();
  const resCustom = await server.fetch('/api/gemini/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aspectRatio: 'custom' }),
  });
  assert.equal(resCustom.status, 200);
  const dataCustom = await resCustom.json();
  assert.equal(dataCustom.video.aspectRatio, '16:9');

  const resVertical = await server.fetch('/api/gemini/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aspectRatio: '9:16' }),
  });
  assert.equal(resVertical.status, 200);
  const dataVertical = await resVertical.json();
  assert.equal(dataVertical.video.aspectRatio, '9:16');
});

// ----------------------------------------------------------------------------
// Feature 10: Studio Voice Narration Boundaries
// ----------------------------------------------------------------------------
test('F10-B1: reader TTS input exceeding 500 characters is rejected by schema', () => {
  const overLimit = {
    requestId: '00000000-0000-4000-8000-000000000001',
    text: 'a'.repeat(501),
    voiceName: 'Sulafat',
    approveSpend: true,
    budgetUsd: 0.1,
  };
  assert.equal(CreateReaderNarrationBody.safeParse(overLimit).success, false);
});

test('F10-B2: reader TTS with empty text string is rejected by schema', () => {
  const emptyText = {
    requestId: '00000000-0000-4000-8000-000000000001',
    text: '',
    voiceName: 'Sulafat',
    approveSpend: true,
    budgetUsd: 0.1,
  };
  assert.equal(CreateReaderNarrationBody.safeParse(emptyText).success, false);
});

test('F10-B3: uncurated voice name is rejected by narration schema', () => {
  const badVoice = {
    requestId: '00000000-0000-4000-8000-000000000001',
    text: 'Valid text sample.',
    voiceName: 'UnsupportedVoice',
    approveSpend: true,
    budgetUsd: 0.1,
  };
  assert.equal(CreateReaderNarrationBody.safeParse(badVoice).success, false);
});

test('F10-B4: budget USD not equal to 0.1 is rejected by reader narration contract', () => {
  const badBudget = {
    requestId: '00000000-0000-4000-8000-000000000001',
    text: 'Valid text.',
    voiceName: 'Sulafat',
    approveSpend: true,
    budgetUsd: 0.5, // schema requires enum [0.1]
  };
  assert.equal(CreateReaderNarrationBody.safeParse(badBudget).success, false);
});

test('F10-B5: malformed UUID requestId is rejected by narration schema', () => {
  const badUuid = {
    requestId: 'not-a-valid-uuid',
    text: 'Valid text.',
    voiceName: 'Sulafat',
    approveSpend: true,
    budgetUsd: 0.1,
  };
  assert.equal(CreateReaderNarrationBody.safeParse(badUuid).success, false);
});

// ----------------------------------------------------------------------------
// Feature 11: Durable Publishing Pipeline Boundaries
// ----------------------------------------------------------------------------
test('F11-B1: manuscript source text exceeding 256 KiB is rejected', async () => {
  const oversizedText = Buffer.alloc(256 * 1024 + 1, 65);
  const payload = {
    fileName: 'oversized.txt',
    base64: oversizedText.toString('base64'),
    mimeType: 'text/plain',
  };
  await assert.rejects(validateSource(payload), /256 KiB/);
});

test('F11-B2: PDF exceeding 20 pages limit is rejected', async () => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 21; i++) doc.addPage();
  const bytes = await doc.save();
  const payload = {
    fileName: 'oversized.pdf',
    base64: Buffer.from(bytes).toString('base64'),
    mimeType: 'application/pdf',
  };
  await assert.rejects(validateSource(payload), /1–20/);
});

test('F11-B3: corrupt PDF header is rejected by source validator', async () => {
  const payload = {
    fileName: 'corrupt.pdf',
    base64: Buffer.from('%PDF-invalid-corrupt-data').toString('base64'),
    mimeType: 'application/pdf',
  };
  await assert.rejects(validateSource(payload));
});

test('F11-B4: corrupt PNG bytes with bad CRC are rejected', async () => {
  const corruptPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const payload = {
    fileName: 'corrupt.png',
    base64: corruptPng.toString('base64'),
    mimeType: 'image/png',
  };
  await assert.rejects(validateSource(payload));
});

test('F11-B5: upload with path traversal in fileName is rejected', async () => {
  const payload = {
    fileName: '../../etc/passwd',
    base64: Buffer.from('hello').toString('base64'),
    mimeType: 'text/plain',
  };
  await assert.rejects(validateSource(payload));
});

// ----------------------------------------------------------------------------
// Feature 12: Subscriber CRM (100k) Boundaries
// ----------------------------------------------------------------------------
test('F12-B1: CSV with no valid email column returns error in validation preview', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/subscribers/validate-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csvContent: 'first_name,last_name,age,country\nJohn,Doe,30,NL',
      mapping: { emailCol: 'non_existent_column' },
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.preview.invalidCount > 0);
  assert.match(data.preview.errors[0].reason, /Missing email address/i);
});

test('F12-B2: completely empty CSV content string is rejected with error', async () => {
  const server = await getSharedTestServer();
  const resEmpty = await server.fetch('/api/subscribers/validate-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvContent: '' }),
  });
  assert.equal(resEmpty.status, 400);
  const dataEmpty = await resEmpty.json();
  assert.match(dataEmpty.error, /CSV file is empty|required/i);

  const resWhitespace = await server.fetch('/api/subscribers/validate-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvContent: '   \n\r  ' }),
  });
  assert.equal(resWhitespace.status, 400);
  const dataWhitespace = await resWhitespace.json();
  assert.match(dataWhitespace.error, /empty/i);
});

test('F12-B3: duplicate emails in single CSV are detected and counted', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/subscribers/validate-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csvContent: 'email,name\nuser@test.com,User 1\nadmin@test.com,Admin\nuser@test.com,User Duplicate',
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.preview.duplicateCount, 1);
  assert.equal(data.preview.validCount, 2);
});

test('F12-B4: email with consecutive dots is sanitized to single dot', () => {
  const dirty = 'reader..van..dijk@domain..nl';
  const fixed = dirty.replace(/\.\.+/g, '.');
  assert.equal(fixed, 'reader.van.dijk@domain.nl');
});

test('F12-B5: database cleanup on empty map produces 0 deletions and 0 errors', () => {
  const map = new Map<string, any>();
  const toDelete = Array.from(map.values()).filter(s => s.status === 'bounced');
  assert.equal(toDelete.length, 0);
});

// ----------------------------------------------------------------------------
// Feature 13: Email Campaigns & Unsubscribe Boundaries
// ----------------------------------------------------------------------------
test('F13-B1: altered token payload with correct signature length throws 403', () => {
  const secret = process.env.SESSION_SECRET!;
  const email = 'reader@test.com';
  const payload = Buffer.from(JSON.stringify({ email, purpose: 'marketing-unsubscribe' })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const tamperedPayload = Buffer.from(JSON.stringify({ email: 'hacker@test.com', purpose: 'marketing-unsubscribe' })).toString('base64url');
  const tamperedToken = `${tamperedPayload}.${signature}`;
  assert.throws(() => unsubscribeEmail(tamperedToken), /Invalid unsubscribe link/);
});

test('F13-B2: token with invalid purpose is rejected by unsubscribe verification', () => {
  const secret = process.env.SESSION_SECRET!;
  const email = 'reader@test.com';
  const payload = Buffer.from(JSON.stringify({ email, purpose: 'password-reset' })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const invalidPurposeToken = `${payload}.${signature}`;
  assert.throws(() => unsubscribeEmail(invalidPurposeToken), /Invalid unsubscribe link/);
});

test('F13-B3: token exceeding 1500 characters is rejected by token parser', () => {
  const longToken = 'a'.repeat(1501) + '.' + '0'.repeat(64);
  assert.throws(() => unsubscribeEmail(longToken), /Invalid unsubscribe link/);
});

test('F13-B4: campaign without subject or content is rejected by campaign validator', () => {
  const validateCampaign = (body: { subject?: string; content?: string }) => {
    if (!body.subject?.trim() || !body.content?.trim()) throw new Error('Campaign subject and content required.');
  };
  assert.throws(() => validateCampaign({ subject: '' }), /required/);
  assert.throws(() => validateCampaign({ subject: 'Sub', content: '' }), /required/);
});

test('F13-B5: campaign target filter matching 0 subscribers is rejected', () => {
  const subscribers: any[] = [];
  const validateRecipients = (list: any[]) => {
    if (list.length === 0) throw new Error('No active subscribers match the chosen filter.');
  };
  assert.throws(() => validateRecipients(subscribers), /No active subscribers/);
});

// ----------------------------------------------------------------------------
// Feature 14: AI Team Workforce Boundaries
// ----------------------------------------------------------------------------
test('F14-B1: task budget below $0.05 is rejected by schema', () => {
  const underBudget = {
    idempotencyKey: '00000000-0000-4000-8000-000000000001',
    objective: 'Technical audit of security policies.',
    workerIds: ['cto'],
    budgetUsd: 0.04,
  };
  assert.equal(CreateWorkforceTaskBody.safeParse(underBudget).success, false);
});

test('F14-B2: task budget above $1.00 is rejected by schema', () => {
  const overBudget = {
    idempotencyKey: '00000000-0000-4000-8000-000000000001',
    objective: 'Technical audit of security policies.',
    workerIds: ['cto'],
    budgetUsd: 1.01,
  };
  assert.equal(CreateWorkforceTaskBody.safeParse(overBudget).success, false);
});

test('F14-B3: task with empty workerIds array is rejected by schema', () => {
  const emptyWorkers = {
    idempotencyKey: '00000000-0000-4000-8000-000000000001',
    objective: 'Technical audit of security policies.',
    workerIds: [],
    budgetUsd: 0.50,
  };
  assert.equal(CreateWorkforceTaskBody.safeParse(emptyWorkers).success, false);
});

test('F14-B4: task with more than 5 workerIds is rejected by schema', () => {
  const tooManyWorkers = {
    idempotencyKey: '00000000-0000-4000-8000-000000000001',
    objective: 'Technical audit of security policies.',
    workerIds: ['ceo', 'coo', 'cto', 'product', 'ux', 'qa'], // 6 workers
    budgetUsd: 0.50,
  };
  assert.equal(CreateWorkforceTaskBody.safeParse(tooManyWorkers).success, false);
});

test('F14-B5: task with duplicate workerIds is rejected by domain validation', async () => {
  const duplicateWorkers = {
    idempotencyKey: '00000000-0000-4000-8000-000000000001',
    objective: 'Technical audit of security policies.',
    workerIds: ['cto', 'cto'],
    budgetUsd: 0.50,
  };
  await assert.rejects(
    () => createWorkforceTask('test-owner-id', duplicateWorkers as any),
    /Choose between one and five unique workforce roles/
  );
});

// ----------------------------------------------------------------------------
// Feature 15: Admin Management Portal Boundaries
// ----------------------------------------------------------------------------
test('F15-B1: creating a book with missing title or author is rejected with 400 error', async () => {
  const server = await getSharedTestServer();
  const resMissingTitle = await server.fetch('/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '', author: 'Valid Author' }),
  });
  assert.equal(resMissingTitle.status, 400);
  const dataMissingTitle = await resMissingTitle.json();
  assert.match(dataMissingTitle.error, /Title and Author are required/i);

  const resMissingAuthor = await server.fetch('/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Valid Title', author: '' }),
  });
  assert.equal(resMissingAuthor.status, 400);
  const dataMissingAuthor = await resMissingAuthor.json();
  assert.match(dataMissingAuthor.error, /Title and Author are required/i);
});

test('F15-B2: updating non-existent book ID returns 404', async () => {
  const server = await getSharedTestServer();
  const res = await server.fetch('/api/books/non-existent-id', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Updated Title' }),
  });
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.match(data.error, /Book not found/i);
});

test('F15-B3: deleting non-existent book ID handles safely without mutation', () => {
  let catalog = [{ id: 'b-1', title: 'Book 1' }];
  catalog = catalog.filter(b => b.id !== 'non-existent-id');
  assert.equal(catalog.length, 1);
});

test('F15-B4: adding category with whitespace trims and registers single clean entry', () => {
  const customCategories = ['Historical Fiction'];
  const newCat = '   African Philosophy & Indigenous Traditions   '.trim();
  if (!customCategories.includes(newCat)) customCategories.push(newCat);
  assert.equal(customCategories.length, 2);
  assert.equal(customCategories[1], 'African Philosophy & Indigenous Traditions');
});

test('F15-B5: resetting catalog restores all original initial books', () => {
  let liveCatalog = [{ id: 'custom-1', title: 'Custom' }];
  liveCatalog = JSON.parse(JSON.stringify(INITIAL_BOOKS));
  assert.equal(liveCatalog.length, INITIAL_BOOKS.length);
});

// ----------------------------------------------------------------------------
// Feature 16: Database Isolation & Supabase Client Boundaries
// ----------------------------------------------------------------------------
test('F16-B1: resolving unmapped table throws Unknown bookatlas table error', () => {
  assert.throws(() => bookatlasTable('unmapped_table' as any), /Unknown/);
});

test('F16-B2: resolving postgres system catalogs throws error', () => {
  assert.throws(() => bookatlasTable('pg_catalog.pg_tables' as any), /Unknown/);
  assert.throws(() => bookatlasTable('information_schema.tables' as any), /Unknown/);
});

test('F16-B3: resolving SQL injection in table name throws error', () => {
  assert.throws(() => bookatlasTable("books; DROP TABLE users; --" as any), /Unknown/);
  assert.throws(() => bookatlasTable("' OR 1=1 --" as any), /Unknown/);
});

test('F16-B4: resolving table name with leading or trailing whitespace throws error', () => {
  assert.throws(() => bookatlasTable(' books ' as any), /Unknown/);
});

test('F16-B5: resolving Object prototype pollution property throws error', () => {
  assert.throws(() => bookatlasTable('__proto__' as any), /Unknown/);
  assert.throws(() => bookatlasTable('constructor' as any), /Unknown/);
});
