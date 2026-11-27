import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAGES, pageHtml } from './pageHeads.mjs';

const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8')) as { rewrites: { source: string; destination: string }[]; headers: { source: string }[] };

test('page heads: every public page has its own title, description, canonical link and preview tags', () => {
  const seen = new Set<string>();
  for (const page of PAGES) {
    const html = pageHtml(shell, page);
    const url = `https://booksatlas.app${page.path}`;
    assert.ok(html.includes(`<link rel="canonical" href="${url}" />`), `${page.path}: canonical`);
    assert.ok(html.includes(`<meta property="og:url" content="${url}" />`), `${page.path}: og:url`);
    const title = html.match(/<title>([^<]*)<\/title>/)![1]!;
    assert.ok(title.endsWith('| BooksAtlas') && !seen.has(title), `${page.path}: a title of its own`);
    seen.add(title);
    const description = html.match(/<meta name="description" content="([^"]*)"/)![1]!;
    assert.ok(description.length >= 35 && description.length <= 170, `${page.path}: description of search length (${description.length})`);
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
    assert.ok(html.includes('<div id="root">'), 'still the app');
  }
});

test('page heads: vercel serves each page its own copy, before the app fallback, never cached stale', () => {
  const all = vercel.rewrites.map((r) => r.source);
  const fallback = all.indexOf('/(.*)');
  for (const page of PAGES) {
    const i = vercel.rewrites.findIndex((r) => r.source === page.path && r.destination === `/pages/${page.file}.html`);
    assert.ok(i >= 0 && i < fallback, `${page.path} is rewritten to its page before the fallback`);
  }
  assert.ok(vercel.headers.some((h) => h.source === '/pages/(.*)'), 'the copies are revalidated like index.html');
});
