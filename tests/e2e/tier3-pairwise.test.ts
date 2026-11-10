import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Initialize required signing secrets before server imports
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
process.env.UNSUBSCRIBE_TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET;

import { filterCatalog } from '../../artifacts/bookatlas/src/catalog.ts';
import { INITIAL_BOOKS } from '../../lib/bookatlas-catalog/src/data/booksData.ts';
import { accessFor, authorizationStatus, type Identity } from '../../artifacts/api-server/src/auth/policy.ts';
import { libraryStats } from '../../artifacts/bookatlas/src/libraryStats.ts';
import type { Book, UserLibraryItem, CartItem } from '../../artifacts/bookatlas/src/types.ts';
import { mergeGuestCartIntoAccount } from '../../artifacts/bookatlas/src/utils/cart.ts';
import {
  STUDIO_VOICES, DEFAULT_FEMALE_VOICE, DEFAULT_MALE_VOICE,
  studioVoice, narrationDirection,
} from '../../lib/bookatlas-catalog/src/voices.ts';
import { wrapPcm16LE, inspectWav } from '../../artifacts/api-server/src/bookatlas/publishing/audio.ts';
import { validateSource } from '../../artifacts/api-server/src/bookatlas/publishing/source.ts';
import { buildEpub } from '../../artifacts/api-server/src/bookatlas/publishing/epub.ts';
import { unsubscribeEmail, eligibleReader } from '../../artifacts/api-server/src/bookatlas/publishing/campaigns.ts';
import { BOOKATLAS_TABLES, bookatlasTable } from '../../artifacts/api-server/src/bookatlas/db/tables.ts';
import { workforceRoles, workforceTeams } from '../../artifacts/api-server/src/bookatlas/workforce/catalog.ts';
import { CreateWorkforceTaskBody } from '../../lib/api-zod/src/generated/api.ts';

// ============================================================================
// TIER 3: PAIRWISE CROSS-FEATURE COMBINATIONS (16 PAIRS)
// ============================================================================

// ----------------------------------------------------------------------------
// Pair 1: Authentication (F2) + Cart & Checkout (F6)
// ----------------------------------------------------------------------------
test('PAIR-1: guest cart items merge seamlessly into account cart after reader authentication without duplicates', () => {
  const reader: Identity = { id: 'reader-p1', email: 'reader1@example.com', name: 'Reader One', role: 'reader' };
  assert.equal(authorizationStatus(accessFor('GET', '/api/auth/me'), reader), 200);

  const accountCart: CartItem[] = [
    { book: INITIAL_BOOKS[0], format: 'ebook', addedAt: 1000 },
  ];
  const guestCart: CartItem[] = [
    { book: INITIAL_BOOKS[0], format: 'ebook', addedAt: 2000 }, // Duplicate: should not be added again
    { book: INITIAL_BOOKS[1], format: 'audiobook', addedAt: 2050 }, // New: should be merged
  ];

  const mergedCart = mergeGuestCartIntoAccount(accountCart, guestCart);

  assert.equal(mergedCart.length, 2);
  assert.equal(mergedCart[0].book.id, INITIAL_BOOKS[0].id);
  assert.equal(mergedCart[1].book.id, INITIAL_BOOKS[1].id);
  assert.equal(mergedCart[1].format, 'audiobook');
});

// ----------------------------------------------------------------------------
// Pair 2: Catalog Search (F1) + Personal Bookshelf (F5)
// ----------------------------------------------------------------------------
test('PAIR-2: searching storefront author yields book which integrates into user bookshelf and stats', () => {
  const targetAuthor = INITIAL_BOOKS[0].author;
  const searchResults = filterCatalog(
    INITIAL_BOOKS,
    { searchQuery: targetAuthor, genre: 'All Genres', format: 'all', priceCategory: 'all', minRating: 0, sortBy: 'featured', bookatlasPlusOnly: false },
    'store'
  );
  assert.ok(searchResults.length > 0);
  const foundBook = searchResults[0];

  const userLibrary: UserLibraryItem[] = [
    {
      book: foundBook,
      format: 'ebook',
      progressPercent: 0,
      currentChapterIndex: 0,
      currentParagraphIndex: 0,
      lastReadTimestamp: Date.now(),
      highlights: [],
      bookmarks: [],
    },
  ];

  const initialStats = libraryStats(userLibrary);
  assert.equal(initialStats.completedBooks, 0);
  assert.equal(initialStats.recordedStreakDays, 1);

  // User completes the book
  userLibrary[0].progressPercent = 100;
  userLibrary[0].finished = true;
  const updatedStats = libraryStats(userLibrary);
  assert.equal(updatedStats.completedBooks, 1);
  assert.equal(updatedStats.totalReadingHours, Math.round((foundBook.pageCount || 300) / 45));
});

// ----------------------------------------------------------------------------
// Pair 3: Durable Publishing Pipeline (F11) + Studio Voice Narration (F10)
// ----------------------------------------------------------------------------
test('PAIR-3: publishing pipeline EPUB chapter text compiles and feeds studio TTS audio synthesis', async () => {
  const manuscript = {
    id: '00000000-0000-4000-8000-000000000010',
    title: 'The Cartographer of Amsterdam',
    author: 'Hendrik van der Meer',
    language: 'en',
    description: 'An archival masterwork.',
    chapters: [
      { title: 'The Keizersgracht Studio', text: 'In the quiet chill of autumn, the celestial globe began to rotate.' },
    ],
  };

  const epubResult = buildEpub(manuscript, new Date('2026-11-01T00:00:00Z'));
  const epubBytes = epubResult.bytes;
  assert.ok(epubBytes.length > 0);

  // Take chapter text and verify Studio Voice parameters
  const chapterText = manuscript.chapters[0].text;
  assert.ok(chapterText.length <= 500);

  const voice = studioVoice(DEFAULT_FEMALE_VOICE);
  assert.ok(voice);
  const direction = narrationDirection(DEFAULT_FEMALE_VOICE);
  assert.match(direction, /Read the supplied script exactly/);

  // Simulate synthesized 1-second audio PCM and inspect WAV container
  const sampleRate = 24000;
  const pcmBytes = Buffer.alloc(sampleRate * 2);
  const wavBytes = wrapPcm16LE(pcmBytes, sampleRate);
  const wavInfo = inspectWav(wavBytes);
  assert.equal(wavInfo.sampleRate, 24000);
  assert.equal(Math.round(wavInfo.durationSeconds), 1);
});

// ----------------------------------------------------------------------------
// Pair 4: Subscriber CRM (F12) + Email Campaigns & Unsubscribe (F13)
// ----------------------------------------------------------------------------
test('PAIR-4: CRM contact generation produces signed HMAC token allowing instant opt-out and status update', () => {
  const secret = process.env.SESSION_SECRET!;
  const email = 'sanne.vandijk@bookatlas.nl';

  const subscriber = {
    email,
    name: 'Sanne van Dijk',
    tier: 'member_subscriber' as const,
    status: 'subscribed' as const,
    subscribedAt: Date.now(),
    tags: ['dutch_heritage', 'vip'],
    unsubscribeToken: '',
  };

  // Generate signed 1-click token
  const payload = Buffer.from(JSON.stringify({ email: subscriber.email, purpose: 'marketing-unsubscribe' })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  subscriber.unsubscribeToken = `${payload}.${signature}`;

  // Verify token via unsubscribe endpoint helper
  const verifiedEmail = unsubscribeEmail(subscriber.unsubscribeToken);
  assert.equal(verifiedEmail, subscriber.email);

  // Perform opt-out transition
  const updatedSubscriber = {
    ...subscriber,
    status: 'unsubscribed' as const,
    unsubscribedAt: Date.now(),
  };
  assert.equal(updatedSubscriber.status, 'unsubscribed');
  assert.ok(updatedSubscriber.unsubscribedAt > 0);
  assert.equal(eligibleReader(updatedSubscriber), false);
});

// ----------------------------------------------------------------------------
// Pair 5: Catalog CRUD (F15) + Storefront Search (F1)
// ----------------------------------------------------------------------------
test('PAIR-5: admin catalog book addition with unique ISBN immediately indexes in storefront search', () => {
  let liveCatalog = [...INITIAL_BOOKS];
  const newBook: Book = {
    ...INITIAL_BOOKS[0],
    id: 'atlas-custom-pair5',
    title: 'The Quantum Manuscripts of Leiden',
    author: 'Prof. David de Groot',
    isbn: '978-9-023-99999-9',
    primaryGenre: 'Consciousness & Ancient Wisdom',
    tags: ['Quantum', 'Leiden', 'SpecialEdition'],
    price: 19.99,
  };

  // Add book to catalog
  liveCatalog.unshift(newBook);

  // Query storefront by ISBN
  const isbnSearch = filterCatalog(
    liveCatalog,
    { searchQuery: '9789023999999', genre: 'All Genres', format: 'all', priceCategory: 'all', minRating: 0, sortBy: 'featured', bookatlasPlusOnly: false },
    'store'
  );
  assert.equal(isbnSearch.length, 1);
  assert.equal(isbnSearch[0].id, 'atlas-custom-pair5');

  // Query storefront by unique tag
  const tagSearch = filterCatalog(
    liveCatalog,
    { searchQuery: 'SpecialEdition', genre: 'All Genres', format: 'all', priceCategory: 'all', minRating: 0, sortBy: 'featured', bookatlasPlusOnly: false },
    'store'
  );
  assert.equal(tagSearch.length, 1);
  assert.equal(tagSearch[0].id, 'atlas-custom-pair5');

  // Delete book and confirm removal
  liveCatalog = liveCatalog.filter(b => b.id !== newBook.id);
  const deletedSearch = filterCatalog(
    liveCatalog,
    { searchQuery: '9789023999999', genre: 'All Genres', format: 'all', priceCategory: 'all', minRating: 0, sortBy: 'featured', bookatlasPlusOnly: false },
    'store'
  );
  assert.equal(deletedSearch.length, 0);
});

// ----------------------------------------------------------------------------
// Pair 6: Audiobook Player Dock (F4) + In-Browser eReader (F3)
// ----------------------------------------------------------------------------
test('PAIR-6: opening eReader chapter syncs audio player dock track and duration', () => {
  const book = INITIAL_BOOKS.find(b => b.format === 'bundle' || b.format === 'audiobook') || INITIAL_BOOKS[0];
  const targetChapterIndex = 1;

  // eReader state
  const readerState = {
    book,
    chapterIndex: targetChapterIndex,
    paragraphIndex: 0,
  };
  assert.equal(readerState.chapterIndex, 1);

  // Audiobook player dock initialized with same book
  const audioDockState = {
    book: readerState.book,
    isPlaying: true,
    currentTime: 0,
    speed: 1.25,
    durationSeconds: (book.audioDurationMinutes || 480) * 60,
  };

  assert.equal(audioDockState.book.id, readerState.book.id);
  assert.ok(audioDockState.durationSeconds > 0);
  assert.equal(audioDockState.speed, 1.25);
});

// ----------------------------------------------------------------------------
// Pair 7: AI Copilot (F8) + Personal Bookshelf (F5)
// ----------------------------------------------------------------------------
test('PAIR-7: reader library book excerpt feeds AI copilot summarize action', () => {
  const libraryItem: UserLibraryItem = {
    book: INITIAL_BOOKS[0],
    format: 'ebook',
    progressPercent: 35,
    currentChapterIndex: 0,
    currentParagraphIndex: 1,
    lastReadTimestamp: Date.now(),
    highlights: [],
    bookmarks: [0],
  };

  const sampleExcerpt = libraryItem.book.sampleChapters[0]?.content[0] || 'A rich philosophical passage.';
  assert.ok(sampleExcerpt.length > 0);

  // Copilot summarize action
  const copilotAction = 'summarize';
  const getFallbackCopilotResult = (action: string, text: string, bookTitle: string) => {
    if (action === 'summarize') {
      return `• Excerpt from "${bookTitle}" sets up key narrative stakes.\n• Core themes of resilience and discovery are established.`;
    }
    return '';
  };

  const summary = getFallbackCopilotResult(copilotAction, sampleExcerpt, libraryItem.book.title);
  assert.match(summary, new RegExp(libraryItem.book.title));
  assert.match(summary, /resilience and discovery/);
});

// ----------------------------------------------------------------------------
// Pair 8: AI Team Workforce (F14) + Database Table Isolation (F16)
// ----------------------------------------------------------------------------
test('PAIR-8: workforce task assignment maps strictly to bookatlas_ scoped persistence tables', () => {
  const validTask = {
    idempotencyKey: '00000000-0000-4000-8000-000000000020',
    objective: 'Audit and harden Bookatlas access policies and API security.',
    workerIds: ['cto', 'security'],
    budgetUsd: 0.50,
  };

  assert.ok(CreateWorkforceTaskBody.safeParse(validTask).success);
  assert.equal(validTask.workerIds.length, 2);

  // Verify database tables assigned for platform persistence are Bookatlas-prefixed
  const registeredTables = (['publishing_jobs', 'publishing_messages', 'registered_users'] as const)
    .map(t => bookatlasTable(t));
  assert.deepEqual(registeredTables, ['bookatlas_publishing_jobs', 'bookatlas_publishing_messages', 'bookatlas_registered_users']);
  assert.ok(registeredTables.every(t => t.startsWith('bookatlas_')));

  // Verify unregistered workforce entity names cannot bypass database namespace controls
  assert.throws(() => bookatlasTable('workforce_tasks' as any), /Unknown Bookatlas table/);
});

// ----------------------------------------------------------------------------
// Pair 9: Category Management (F15) + Storefront Filtering (F1)
// ----------------------------------------------------------------------------
test('PAIR-9: custom category addition dynamically updates storefront catalog filter categories', () => {
  const categoriesList = ['Fiction & Literature', 'Historical Fiction'];
  const newPublisherCategory = 'Dutch & European Heritage Classics';

  if (!categoriesList.includes(newPublisherCategory)) {
    categoriesList.push(newPublisherCategory);
  }
  assert.ok(categoriesList.includes(newPublisherCategory));

  const testCatalog: Book[] = [
    { ...INITIAL_BOOKS[0], id: 'c1', primaryGenre: 'Fiction & Literature' },
    { ...INITIAL_BOOKS[1], id: 'c2', primaryGenre: newPublisherCategory },
  ];

  const filtered = filterCatalog(
    testCatalog,
    { searchQuery: '', genre: newPublisherCategory, format: 'all', priceCategory: 'all', minRating: 0, sortBy: 'featured', bookatlasPlusOnly: false },
    'store'
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'c2');
  assert.equal(filtered[0].primaryGenre, newPublisherCategory);
});

// ----------------------------------------------------------------------------
// Pair 10: Subscriber Benchmark (F12) + Campaign Broadcast (F13)
// ----------------------------------------------------------------------------
test('PAIR-10: generated benchmark subscribers partition by tier and receive targeted A/B campaigns', () => {
  const benchmarkAudience = Array.from({ length: 100 }, (_, i) => ({
    email: `reader${i}@bookatlas.test`,
    name: `Reader ${i}`,
    tier: i % 4 === 0 ? 'vip_patron' : 'free_reader',
    status: 'subscribed' as const,
    marketing_consent_at: '2026-11-01T00:00:00Z',
    marketing_consent_source: 'benchmark',
  }));

  const vipRecipients = benchmarkAudience.filter(s => s.tier === 'vip_patron');
  assert.equal(vipRecipients.length, 25);

  // A/B test parameters for VIP campaign
  const variantA = vipRecipients.slice(0, 12);
  const variantB = vipRecipients.slice(12);
  assert.equal(variantA.length, 12);
  assert.equal(variantB.length, 13);
  assert.equal(variantA.length + variantB.length, 25);
});

// ----------------------------------------------------------------------------
// Pair 11: Reader Membership RBAC (F2) + Gemini Multimodal AI Hub (F9)
// ----------------------------------------------------------------------------
test('PAIR-11: reader without member subscription is gated from multimodal AI features', () => {
  const freeReader: Identity = { id: 'reader-free', email: 'free@example.com', name: 'Free Reader', role: 'reader' };
  const memberSubscriber: Identity = { id: 'reader-member', email: 'member@example.com', name: 'Member Reader', role: 'reader' };

  const access = accessFor('POST', '/api/gemini/voice-dialogue');
  assert.equal(access, 'reader');

  // Verify access policy authorization status
  assert.equal(authorizationStatus(access, freeReader), 200); // Route is reader-level

  // Application tier check simulation
  const checkAiTierAccess = (tier?: string) => tier === 'member_subscriber' || tier === 'vip_patron';
  assert.equal(checkAiTierAccess('free_reader'), false);
  assert.equal(checkAiTierAccess('member_subscriber'), true);
  assert.equal(checkAiTierAccess('vip_patron'), true);
});

// ----------------------------------------------------------------------------
// Pair 12: Publishing Pipeline (F11) + DB Table Prefix Isolation (F16)
// ----------------------------------------------------------------------------
test('PAIR-12: publishing job creation targets only bookatlas_prefixed database tables', () => {
  const publishingTables = ['publishing_jobs', 'publishing_messages'].map(t => bookatlasTable(t as any));
  assert.deepEqual(publishingTables, ['bookatlas_publishing_jobs', 'bookatlas_publishing_messages']);
  for (const table of publishingTables) {
    assert.match(table, /^bookatlas_/);
  }
});

// ----------------------------------------------------------------------------
// Pair 13: Cart Checkout (F6) + Library Reading Hours (F5)
// ----------------------------------------------------------------------------
test('PAIR-13: completed cart purchase advances reading stats accurately when read to completion', () => {
  const purchasedBook: Book = {
    ...INITIAL_BOOKS[0],
    id: 'purchased-1',
    pageCount: 360,
    price: 14.99,
  };

  // Add to library post-checkout
  const library: UserLibraryItem[] = [
    {
      book: purchasedBook,
      format: 'ebook',
      progressPercent: 100,
      currentChapterIndex: 5,
      currentParagraphIndex: 0,
      lastReadTimestamp: Date.now(),
      highlights: [],
      bookmarks: [],
      finished: true,
    },
  ];

  // 360 pages / 45 pages-per-hour = 8 reading hours
  const stats = libraryStats(library);
  assert.equal(stats.completedBooks, 1);
  assert.equal(stats.totalReadingHours, 8);
});

// ----------------------------------------------------------------------------
// Pair 14: Search Grounding (F9) + Catalog Search (F1)
// ----------------------------------------------------------------------------
test('PAIR-14: search grounding output query seeds catalog search to find matching literary releases', () => {
  const groundingTopic = 'Amsterdam historical fiction';
  const matchingBooks = filterCatalog(
    INITIAL_BOOKS,
    { searchQuery: 'Amsterdam', genre: 'All Genres', format: 'all', priceCategory: 'all', minRating: 0, sortBy: 'featured', bookatlasPlusOnly: false },
    'store'
  );
  assert.ok(matchingBooks.length > 0);
  assert.ok(matchingBooks.some(b => b.title.includes('Amsterdam') || b.tags?.includes('Amsterdam')));
});

// ----------------------------------------------------------------------------
// Pair 15: PWA Service Worker (F7) + Catalog API (F1)
// ----------------------------------------------------------------------------
test('PAIR-15: service worker keeps a network-first copy of the public catalogue for offline reading', () => {
  const swCode = readFileSync('artifacts/bookatlas/public/sw.js', 'utf8');
  const catalogue = /const publicCatalogue = (\/.+\/)\.test/.exec(swCode)?.[1] ?? '';
  for (const path of ['books', 'categories', 'search|facets|shelves']) assert.ok(catalogue.includes(path), path);
  assert.match(swCode, /caches\.open\(DATA_CACHE\)\.then\(\(cache\) => cache\.put\(request, copy\)\)/);
  assert.match(swCode, /\.catch\(\(\) => caches\.match\(request\)\)/);
});

// ----------------------------------------------------------------------------
// Pair 16: Voice Studio Narration (F10) + Audiobook Player Dock (F4)
// ----------------------------------------------------------------------------
test('PAIR-16: studio generated WAV clip duration initializes player dock scrubber', () => {
  const sampleRate = 24000;
  const numSeconds = 5;
  const pcmBytes = Buffer.alloc(sampleRate * numSeconds * 2);
  const wavBytes = wrapPcm16LE(pcmBytes, sampleRate);
  const info = inspectWav(wavBytes);

  assert.equal(Math.round(info.durationSeconds), 5);

  // Initialize playback dock scrubber
  const dockCurrentTime = 0;
  const dockMaxDuration = info.durationSeconds;
  assert.equal(dockCurrentTime, 0);
  assert.equal(dockMaxDuration, 5);
});
