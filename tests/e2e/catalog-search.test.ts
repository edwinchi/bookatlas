import test, { after } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'bookatlas-synthetic-test-signing-secret-32chars';
process.env.UNSUBSCRIBE_TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET;

import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';

after(closeSharedTestServer);

type Card = { id: string; price: number; format: string; genres?: string[]; primaryGenre: string; sampleChapters?: unknown };
const search = async (fetch: (p: string) => Promise<Response>, params: string) => {
  const res = await fetch(`/api/catalog/search?${params}`);
  assert.equal(res.status, 200);
  return { res, body: await res.json() as { books: Card[]; total: number; page: number; limit: number; hasMore: boolean } };
};

test('catalogue search answers small, cached pages with filters, sorting and paging', async () => {
  const { fetch } = await getSharedTestServer();
  const { res, body } = await search(fetch, 'q=k%C3%A9met');
  assert.match(res.headers.get('cache-control') ?? '', /public, max-age=0, s-maxage=60/);
  assert.ok(body.books.some((b) => b.id === 'atlas-afr-002'), 'accents are ignored');
  assert.ok(body.books.every((b) => b.sampleChapters === undefined), 'lists carry cards, not whole books');

  const genre = await search(fetch, 'genre=Sci-Fi%20%26%20Fantasy');
  assert.ok(genre.body.total >= 1 && genre.body.books.every((b) => [b.primaryGenre, ...(b.genres ?? [])].includes('Sci-Fi & Fantasy')));
  const audio = await search(fetch, 'format=audiobook');
  assert.ok(audio.body.books.every((b) => b.format === 'audiobook' || b.format === 'bundle'));
  const cheap = await search(fetch, 'price=under5&sort=priceAsc');
  assert.ok(cheap.body.books.every((b) => b.price <= 4.99));
  assert.deepEqual(cheap.body.books.map((b) => b.price), [...cheap.body.books.map((b) => b.price)].sort((a, b) => a - b));

  const first = await search(fetch, 'limit=5');
  const second = await search(fetch, 'limit=5&page=2');
  assert.equal(first.body.books.length, 5);
  assert.equal(first.body.hasMore, true);
  assert.equal(second.body.page, 2);
  assert.ok(second.body.books.every((b) => !first.body.books.some((a) => a.id === b.id)), 'pages do not overlap');
  assert.equal((await search(fetch, 'limit=100000')).body.limit, 100, 'page size is capped');
});

test('categories, shelves and book pages come from the catalogue', async () => {
  const { fetch } = await getSharedTestServer();
  const facets = await (await fetch('/api/catalog/facets')).json();
  assert.ok(facets.total >= 24);
  assert.ok(facets.categories.find((c: { name: string; count: number }) => c.name === 'Sci-Fi & Fantasy')?.count >= 1);
  assert.ok(facets.languages.length >= 1);

  const shelves = await (await fetch('/api/catalog/shelves?ids=african,audio,unknown')).json();
  assert.deepEqual(Object.keys(shelves.shelves).sort(), ['african', 'audio']);
  assert.ok(shelves.shelves.african.length >= 1 && shelves.shelves.african.length <= 12);

  const book = await (await fetch('/api/catalog/books/atlas-afr-001')).json();
  assert.equal(book.book.id, 'atlas-afr-001');
  assert.ok(Array.isArray(book.book.sampleChapters), 'the book page gets the whole record');
  assert.equal((await fetch('/api/catalog/books/nope-not-a-book')).status, 404);
  assert.equal((await fetch('/api/catalog/books/%3Cscript%3E')).status, 404);
});

test('a distributor feed is imported in parts and its titles are searchable, listed but not sold', async () => {
  const { fetch } = await getSharedTestServer();
  const csv = 'isbn,title,author,price,categories\n9780306406157,Feedwave Chronicles,Ada Writer,6.5,FIC028000\n123,Broken Row,Nobody,1,\n';
  const res = await fetch('/api/admin/catalog/import?format=csv', { method: 'POST', headers: { 'content-type': 'text/csv', 'x-test-role': 'admin' }, body: csv });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.imported, 1);
  assert.equal(body.errors.length, 1);
  assert.equal((await fetch('/api/admin/catalog/import?format=pdf', { method: 'POST', headers: { 'content-type': 'text/csv', 'x-test-role': 'admin' }, body: csv })).status, 400);

  const found = await search(fetch, 'q=feedwave&genre=Sci-Fi%20%26%20Fantasy');
  const book = found.body.books.find((b) => b.id === 'isbn-9780306406157') as Card & { availability?: string };
  assert.ok(book, 'searchable in its mapped category');
  assert.equal(book.availability, 'listed');
});

test('the readiness check reports each dependency without exposing details', async () => {
  const { fetch } = await getSharedTestServer();
  const res = await fetch('/api/healthz/ready');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.deepEqual(Object.keys(body.checks).sort(), ['catalogueCounts', 'database', 'payments']);
  for (const check of Object.values(body.checks) as { status: string }[]) assert.ok(['ok', 'off'].includes(check.status));
});
