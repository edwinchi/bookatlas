import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Express, Response } from 'express';
import type { Book } from '@workspace/bookatlas-catalog/types';
import { logger } from '../lib/logger.js';
import type { CatalogStore } from './catalog/store.js';

/**
 * Search engines and link previews (owner cycle 2, 2026-11-14). Every book has its own address,
 * /books/<id>. The storefront is a single-page app, so this server fills the page head for that address:
 * title, description, canonical URL, Open Graph and Twitter preview tags and schema.org Book data, then
 * the app opens the book. /sitemap.xml lists every real title in chunks of 10,000.
 */

export const SITEMAP_CHUNK = 10_000;
const SITE_NAME = 'Bookatlas';

let shell: { html: string; at: number } | null = null;
/** The built index.html: next to the function on Vercel, otherwise fetched from the site itself. */
async function appShell(appUrl: string): Promise<string> {
  if (shell && Date.now() - shell.at < 5 * 60_000) return shell.html;
  let html: string | null = null;
  // Built shell on Vercel and after a build; the source shell (same head) in tests run before building.
  for (const path of ['artifacts/bookatlas/dist/public/index.html', '../bookatlas/dist/public/index.html', 'artifacts/bookatlas/index.html'].map((p) => join(process.cwd(), p))) {
    html = await readFile(path, 'utf8').catch(() => null);
    if (html) break;
  }
  if (!html) html = await fetch(`${appUrl}/index.html`).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  if (!html) throw new Error('The app shell is unavailable.');
  shell = { html, at: Date.now() };
  return html;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const plain = (s: string | undefined, max: number) => {
  const text = (s ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : text;
};
const absolute = (url: string, appUrl: string) => (/^https?:\/\//.test(url) ? url : `${appUrl}${url.startsWith('/') ? '' : '/'}${url}`);

/** Demo titles stay on the storefront as examples but are kept out of search engines. */
export const indexable = (book: Pick<Book, 'isSample'>) => !book.isSample;

export function bookHead(book: Book, appUrl: string) {
  const url = `${appUrl}/books/${encodeURIComponent(book.id)}`;
  const title = `${book.title}${book.subtitle ? `: ${book.subtitle}` : ''} by ${book.author} | ${SITE_NAME}`;
  const description = plain(book.synopsis, 158) || `${book.title} by ${book.author}, an eBook on ${SITE_NAME}.`;
  const image = book.coverImage ? absolute(book.coverImage, appUrl) : `${appUrl}/icon-512.png`;
  const forSale = !!book.hasReaderContent && book.price > 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': url,
    url,
    name: book.title,
    ...(book.subtitle ? { alternativeHeadline: book.subtitle } : {}),
    author: { '@type': 'Person', name: book.author },
    ...(book.narrator ? { readBy: { '@type': 'Person', name: book.narrator } } : {}),
    image,
    description,
    inLanguage: book.language,
    bookFormat: book.format === 'audiobook' ? 'https://schema.org/AudiobookFormat' : 'https://schema.org/EBook',
    ...(book.isbn && /^[\d-]{10,17}X?$/.test(book.isbn) ? { isbn: book.isbn.replace(/-/g, '') } : {}),
    ...(book.pageCount ? { numberOfPages: book.pageCount } : {}),
    ...(book.genres?.length ? { genre: book.genres } : {}),
    ...(book.publishDate ? { datePublished: book.publishDate } : {}),
    // Ratings appear only when real readers have rated the book.
    ...(book.reviewCount > 0 && book.rating > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: book.rating, reviewCount: book.reviewCount } } : {}),
    ...(forSale ? { offers: { '@type': 'Offer', price: book.price.toFixed(2), priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url } } : {}),
  };
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    indexable(book) ? '' : '<meta name="robots" content="noindex" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    '<meta property="og:type" content="book" />',
    `<meta property="og:title" content="${esc(`${book.title} by ${book.author}`)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:alt" content="${esc(`Cover of ${book.title}`)}" />`,
    `<meta property="book:author" content="${esc(book.author)}" />`,
    ...(jsonLd.isbn ? [`<meta property="book:isbn" content="${esc(jsonLd.isbn)}" />`] : []),
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(`${book.title} by ${book.author}`)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    // `<` is escaped so a synopsis can never close the script element.
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean);
  return { title, description, url, image, jsonLd, html: tags.join('\n    ') };
}

/** Replace the shell's generic title and description with the book's head tags. */
export function injectHead(shellHtml: string, head: string) {
  const stripped = shellHtml
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace(/<link\s+rel="canonical"[^>]*>/i, '')
    .replace(/<meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*>/gi, '');
  return stripped.replace(/<\/head>/i, `    ${head}\n  </head>`);
}

const xml = (res: Response, body: string) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Crawlers may cache for an hour; the CDN serves repeats.
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`);
};

const STATIC_PAGES = ['/', '/privacy', '/legal', '/refunds'];

export function mountSeo(app: Express, catalog: CatalogStore, appUrl: string) {
  app.get('/books/:id', async (req, res) => {
    const id = String(req.params.id);
    try {
      const [html, book] = await Promise.all([appShell(appUrl), /^[\w.-]{1,120}$/.test(id) ? catalog.get(id) : Promise.resolve(null)]);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (!book) {
        // The app still loads and says the book was not found; search engines drop the address.
        res.status(404).setHeader('Cache-Control', 'no-cache');
        res.send(injectHead(html, `<title>Book not found | ${SITE_NAME}</title>\n    <meta name="robots" content="noindex" />`));
        return;
      }
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
      res.send(injectHead(html, bookHead(book, appUrl).html));
    } catch (err) {
      logger.error({ err, event: 'seo.book_page_failed', id }, 'Book page could not be rendered');
      res.status(503).send('Bookatlas is temporarily unavailable. Please try again.');
    }
  });

  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const chunks = Math.max(1, Math.ceil((await catalog.sitemapCount()) / SITEMAP_CHUNK));
      const entries = ['pages', ...Array.from({ length: chunks }, (_, i) => `books-${i + 1}`)]
        .map((name) => `  <sitemap><loc>${appUrl}/sitemaps/${name}.xml</loc></sitemap>`).join('\n');
      xml(res, `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`);
    } catch (err) {
      logger.error({ err, event: 'seo.sitemap_failed' }, 'Sitemap index failed');
      res.status(503).send('Sitemap temporarily unavailable.');
    }
  });

  app.get('/sitemaps/:file', async (req, res) => {
    const file = String(req.params.file);
    try {
      if (file === 'pages.xml') {
        xml(res, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${STATIC_PAGES.map((p) => `  <url><loc>${appUrl}${p}</loc></url>`).join('\n')}\n</urlset>`);
        return;
      }
      const m = /^books-(\d{1,4})\.xml$/.exec(file);
      if (!m || Number(m[1]) < 1) { res.status(404).send('Not found'); return; }
      const rows = await catalog.sitemapChunk(Number(m[1]) - 1, SITEMAP_CHUNK);
      const urls = rows.filter((r) => !r.sample).map((r) => {
        const lastmod = r.updatedAt && !Number.isNaN(Date.parse(r.updatedAt)) ? `<lastmod>${new Date(r.updatedAt).toISOString().slice(0, 10)}</lastmod>` : '';
        return `  <url><loc>${appUrl}/books/${esc(encodeURIComponent(r.id))}</loc>${lastmod}</url>`;
      });
      xml(res, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`);
    } catch (err) {
      logger.error({ err, event: 'seo.sitemap_failed', file }, 'Sitemap chunk failed');
      res.status(503).send('Sitemap temporarily unavailable.');
    }
  });
}
