import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { getSharedTestServer, closeSharedTestServer } from './helpers.ts';

after(async () => { await closeSharedTestServer(); });

const HOSTILE = '</script><script>alert(1)</script> "Quoted" & Co';

async function importListedBook(fetch: (path: string, init?: RequestInit) => Promise<Response>) {
  const csv = [
    'isbn,title,author,price,format,categories,cover_url,narrator,duration_minutes',
    `9780306406157,"${HOSTILE.replace(/"/g, '""')}",Ada Writer,4.5,ebook,FIC028000,https://covers.example/1.jpg,,`,
  ].join('\n');
  const res = await fetch('/api/admin/catalog/import?format=csv', { method: 'POST', headers: { 'content-type': 'text/csv', 'x-test-role': 'admin' }, body: csv });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).imported, 1);
  return 'isbn-9780306406157';
}

test('every book has an address whose page head carries its title, preview tags and schema.org Book data', async () => {
  const { fetch } = await getSharedTestServer();
  const id = await importListedBook(fetch);
  const res = await fetch(`/books/${id}`, { headers: { 'x-test-role': 'unauthenticated' } });
  assert.equal(res.status, 200, 'book pages are public');
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const html = await res.text();
  assert.equal((html.match(/<title>/g) ?? []).length, 1, 'the generic title is replaced, not duplicated');
  assert.ok(html.includes('<link rel="canonical" href="'), 'canonical address');
  assert.ok(html.includes(`/books/${id}"`));
  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'book:author', 'book:isbn']) assert.ok(html.includes(`"${tag}"`), `has ${tag}`);
  assert.ok(html.includes('https://covers.example/1.jpg'), 'the cover is the preview image');
  assert.ok(!html.includes('noindex'), 'real titles are indexable');
  assert.ok(html.includes('id="root"') || html.includes('<script type="module"'), 'the app still loads and opens the book');

  // A hostile title can never break out of the tags or the JSON-LD script.
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;/script&gt;'));
  // Every page carries the BooksAtlas organisation; book pages add the Book.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]!));
  assert.ok(blocks.some((b) => b['@graph']?.some((n: { '@type': string; name: string }) => n['@type'] === 'Organization' && n.name === 'BooksAtlas')), 'the brand organisation is present');
  const ld = blocks.find((b) => b['@type'] === 'Book');
  assert.equal(ld['@type'], 'Book');
  assert.equal(ld.name, HOSTILE);
  assert.equal(ld.isbn, '9780306406157');
  assert.equal(ld.offers, undefined, 'listed titles without a book file are not offered for sale');
  assert.equal(ld.aggregateRating, undefined, 'no rating without real reviews');
  // The same facts in plain HTML for crawlers and AI assistants that do not run JavaScript.
  const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)![1]!;
  assert.ok(noscript.includes('by Ada Writer') && noscript.includes('&lt;/script&gt;'), 'the book, escaped');
  assert.ok(!noscript.includes('Publish with BooksAtlas'), 'the homepage summary is replaced by the book');
});

test('llms-full.txt lists the real books for AI assistants; IndexNow submission is admin-only', async () => {
  const { fetch } = await getSharedTestServer();
  const res = await fetch('/llms-full.txt');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
  const text = await res.text();
  assert.match(text, /## Books on BooksAtlas/);
  assert.ok(text.includes('/books/isbn-9780306406157'), 'imported titles are listed');
  assert.equal((await fetch('/api/manager/seo/indexnow', { method: 'POST', headers: { 'x-test-role': 'reader' } })).status, 403);
  const submitted = await (await fetch('/api/manager/seo/indexnow', { method: 'POST', headers: { 'x-test-role': 'admin' } })).json();
  assert.equal(submitted.submitted, 0, 'nothing is sent from a non-https test address');
});

test('unknown books answer 404 with noindex; demo titles are noindex and left out of the sitemap', async () => {
  const { fetch } = await getSharedTestServer();
  const missing = await fetch('/books/no-such-book', { headers: { 'x-test-role': 'unauthenticated' } });
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /noindex/);
  assert.equal((await fetch('/books/..%2F..%2Fetc', { headers: { 'x-test-role': 'unauthenticated' } })).status, 404);

  const demo = (await (await fetch('/api/catalog/search?limit=100')).json()).books.find((b: { isSample?: boolean }) => b.isSample);
  if (demo) assert.match(await (await fetch(`/books/${demo.id}`)).text(), /<meta name="robots" content="noindex"/);

  const index = await fetch('/sitemap.xml');
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type') ?? '', /application\/xml/);
  const indexXml = await index.text();
  assert.match(indexXml, /<sitemapindex/);
  assert.ok(indexXml.includes('/sitemaps/pages.xml') && indexXml.includes('/sitemaps/books-1.xml'));
  const books = await (await fetch('/sitemaps/books-1.xml')).text();
  assert.match(books, /<urlset/);
  assert.ok(books.includes('/books/isbn-9780306406157'), 'imported titles are listed');
  if (demo) assert.ok(!books.includes(`/books/${demo.id}<`), 'demo titles are not');
  const pages = await (await fetch('/sitemaps/pages.xml')).text();
  assert.ok(pages.includes('/refunds') && pages.includes('/privacy'));
  assert.equal((await fetch('/sitemaps/books-0.xml')).status, 404);
  assert.equal((await fetch('/sitemaps/secrets.xml')).status, 404);
});

test('book and author pages may load the web app: not the API policy that blocks every script and style', async () => {
  const { fetch } = await getSharedTestServer();
  const id = await importListedBook(fetch);
  const res = await fetch(`/books/${id}`, { headers: { 'x-test-role': 'unauthenticated' } });
  const csp = res.headers.get('content-security-policy') ?? '';
  assert.doesNotMatch(csp, /default-src 'none'/, 'a shared link to a book showed a blank page (2026-11-16)');
  assert.match(csp, /frame-ancestors 'none'/, 'still not frameable');
  assert.match(res.headers.get('content-security-policy-report-only') ?? '', /script-src 'self'/);
  const author = await fetch('/author/ada-writer', { headers: { 'x-test-role': 'unauthenticated' } });
  assert.doesNotMatch(author.headers.get('content-security-policy') ?? '', /default-src 'none'/);
  const api = await fetch('/api/healthz');
  assert.match(api.headers.get('content-security-policy') ?? '', /default-src 'none'/, 'API data keeps the strict policy');
});
