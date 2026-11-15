import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';
import { epub2 } from '../../artifacts/api-server/src/bookatlas/ebookPrep/testFixtures.ts';

after(async () => { await closeSharedTestServer(); });

const json = (body: unknown, role = 'admin', method = 'POST') => ({ method, headers: { 'content-type': 'application/json', 'x-test-role': role }, body: JSON.stringify(body) });
const as = (role: string) => ({ headers: { 'x-test-role': role } });

async function publishBook(fetch: (path: string, init?: RequestInit) => Promise<Response>) {
  const file = epub2(5);
  const intake = {
    title: 'The Reviewed Codex', author: 'Ada Writer', language: 'English', description: 'A guide to calm and alignment. '.repeat(8),
    categories: ['Spiritual Healing & Alignment'], keywords: ['healing'], copyrightHolder: 'Test Press', copyrightYear: 2026,
    price: 4.99, rightsConfirmed: true, aiContent: 'none', wantsPrint: false, authorBio: 'Ada Writer writes about calm, attention and alignment.',
  };
  const s = await (await fetch('/api/ebook-submissions', json({ intake, fileName: 'r.epub', size: file.byteLength }))).json();
  for (let part = 0; part < s.upload.parts; part += 1) {
    await fetch(`/api/ebook-submissions/${s.id}/upload/${part}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-test-role': 'admin' }, body: file.subarray(part * s.partBytes, (part + 1) * s.partBytes) });
  }
  await fetch(`/api/ebook-submissions/${s.id}/prepare`, json({}));
  return (await (await fetch(`/api/ebook-submissions/${s.id}/publish`, json({}))).json()).bookId as string;
}

test('only real reviews: buyers review paid books, never the author; ratings follow edits, deletes and moderation', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch);
  const review = (body: unknown, role = 'reader') => fetch(`/api/reviews/books/${bookId}`, json(body, role, 'PUT'));
  const publicReviews = async () => (await fetch(`/api/catalog/books/${bookId}/reviews`)).json();
  const card = async () => (await (await fetch(`/api/catalog/books/${bookId}`)).json()).book;

  assert.deepEqual(await publicReviews(), { average: 0, count: 0, breakdown: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })), reviews: [] }, 'no invented reviews');
  const notBought = await (await fetch(`/api/reviews/books/${bookId}/mine`, as('reader'))).json();
  assert.deepEqual([notBought.canReview, notBought.reason], [false, 'Buy this book to review it.']);
  assert.equal((await review({ rating: 5, body: 'Lovely book, I enjoyed every page of it.' })).status, 403);
  const author = await (await fetch(`/api/reviews/books/${bookId}/mine`, as('admin'))).json();
  assert.deepEqual([author.canReview, author.reason], [false, 'Authors cannot review their own books.']);
  assert.equal((await fetch(`/api/reviews/books/${bookId}/mine`, as('unauthenticated'))).status, 401);

  // The reader buys the book.
  const { recordPaid } = await import('../../artifacts/api-server/src/bookatlas/payments/purchases.ts');
  await recordPaid([{ user_id: 'test-reader-1', book_id: bookId, checkout_session_id: 'cs_test_reviews_000001', payment_intent_id: null, amount_total: 499, currency: 'eur' }]);
  assert.equal((await review({ rating: 6, body: 'Lovely book, I enjoyed every page of it.' })).status, 400);
  assert.equal((await review({ rating: 4, body: 'Too short.' })).status, 400);
  const saved = await (await review({ rating: 4, title: '<b>Calm</b> and clear', body: 'Lovely book, <script>x</script>I enjoyed every page of it.' })).json();
  assert.deepEqual({ name: saved.name, verified: saved.verifiedPurchase, title: saved.title }, { name: 'Sanne D.', verified: true, title: 'Calm and clear' }, 'first name and initial; HTML removed');
  assert.ok(!saved.body.includes('<script>'));
  let summary = await publicReviews();
  assert.deepEqual([summary.average, summary.count, summary.breakdown[1].count], [4, 1, 1]);
  assert.deepEqual([(await card()).rating, (await card()).reviewCount], [4, 1], 'the catalogue rating follows');

  await review({ rating: 2, body: 'On reflection, it was too slow for me to enjoy.' });
  summary = await publicReviews();
  assert.deepEqual([summary.average, summary.count, summary.reviews[0].edited], [2, 1, true], 'editing replaces, never duplicates');

  assert.equal((await fetch(`/api/manager/reviews/${saved.id}/hide`, json({}, 'reader'))).status, 403);
  await fetch(`/api/manager/reviews/${saved.id}/hide`, json({}));
  assert.equal((await publicReviews()).count, 0, 'a hidden review leaves the rating');
  assert.equal((await card()).reviewCount, 0);
  assert.equal((await (await fetch(`/api/reviews/books/${bookId}/mine`, as('reader'))).json()).review.hidden, true);
  await fetch(`/api/manager/reviews/${saved.id}/show`, json({}));
  assert.equal((await publicReviews()).count, 1);

  const exported = await (await fetch('/api/account/export', as('reader'))).json();
  assert.ok(exported.purchases.some((p: { record?: string; rating?: number }) => p.record === 'review' && p.rating === 2), 'the review is in the data export');

  assert.equal((await fetch(`/api/reviews/books/${bookId}`, { method: 'DELETE', headers: { 'x-test-role': 'reader' } })).status, 204);
  assert.equal((await publicReviews()).count, 0);
  assert.equal((await card()).rating, 0);
});

test('author pages: the author\'s real books and bio, with a search-engine version and a sitemap', async () => {
  const { fetch } = await getSharedTestServer();
  const bookId = await publishBook(fetch);
  const profile = await (await fetch('/api/catalog/authors/ada-writer')).json();
  assert.equal(profile.name, 'Ada Writer');
  assert.ok(profile.books.some((b: { id: string }) => b.id === bookId));
  assert.equal(profile.bio, 'Ada Writer writes about calm, attention and alignment.');
  assert.equal((await fetch('/api/catalog/authors/no-such-author')).status, 404);
  assert.equal((await fetch('/api/catalog/authors/NOT%20A%20SLUG')).status, 404);

  const page = await fetch('/author/ada-writer');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<title>Ada Writer: books and audiobooks \| BooksAtlas<\/title>/);
  assert.ok(html.includes('"@type":"ProfilePage"') && html.includes('"@type":"Person"'));
  assert.ok(/<noscript>[\s\S]*Books by Ada Writer[\s\S]*The Reviewed Codex/.test(html), 'the books in plain HTML');
  assert.equal((await fetch('/author/nobody-here')).status, 404);

  assert.ok((await (await fetch('/sitemap.xml')).text()).includes('/sitemaps/authors.xml'));
  assert.ok((await (await fetch('/sitemaps/authors.xml')).text()).includes('/author/ada-writer'));
});
