import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Express, Request, Response } from 'express';
import { waitUntil } from '@vercel/functions';
import type { Book } from '@workspace/bookatlas-catalog/types';
import { logger } from '../lib/logger.js';
import type { CatalogStore } from './catalog/store.js';
import { authorProfile, authorSlug } from './reviews/routes.js';

import { PAGE_CSP } from '../middlewares/pageCsp.js';
/**
 * Search engines and link previews (owner cycle 2, 2026-11-14). Every book has its own address,
 * /books/<id>. The storefront is a single-page app, so this server fills the page head for that address:
 * title, description, canonical URL, Open Graph and Twitter preview tags and schema.org Book data, then
 * the app opens the book. /sitemap.xml lists every real title in chunks of 10,000.
 */

export const SITEMAP_CHUNK = 10_000;
const SITE_NAME = 'BooksAtlas';

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

/** The book's facts as plain HTML, for crawlers and assistants that do not run JavaScript. */
export function bookBody(book: Book, appUrl: string) {
  const url = `${appUrl}/books/${encodeURIComponent(book.id)}`;
  const forSale = !!book.hasReaderContent && book.price > 0;
  return `<noscript>
      <main>
        <h1>${esc(book.title)}${book.subtitle ? `: ${esc(book.subtitle)}` : ''}</h1>
        <p>by ${esc(book.author)}${book.narrator ? `, narrated by ${esc(book.narrator)}` : ''} · ${esc(book.language)}${book.genres?.length ? ` · ${esc(book.genres.join(', '))}` : ''}</p>
        <p>${esc(plain(book.synopsis, 2000))}</p>
        <p>${forSale ? `eBook €${book.price.toFixed(2)} on ${SITE_NAME}; read a free preview in your browser.` : `Read a free preview on ${SITE_NAME}.`}</p>
        <p><a href="${esc(url)}">${esc(book.title)} on ${SITE_NAME}</a> · <a href="${appUrl}/">${SITE_NAME} eBook store</a></p>
      </main>
    </noscript>`;
}
export const injectBody = (shellHtml: string, body: string) => shellHtml.replace(/<noscript>[\s\S]*?<\/noscript>/i, body);

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

const STATIC_PAGES = ['/', '/pricing', '/reading-intelligence', '/reading-intelligence/young-readers', '/reading-intelligence/little-ones', '/privacy', '/legal', '/refunds'];

/**
 * IndexNow tells Bing (which ChatGPT search and Copilot use), Yandex and others about new or changed pages at
 * once. The key is public by design and served from /<key>.txt.
 */
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY?.trim() || '4342dfb7a77c0a5b1d4ad41aae5e23ec';
export async function submitIndexNow(urls: string[], appUrl: string) {
  const host = new URL(appUrl).host;
  if (!urls.length || !appUrl.startsWith('https://')) return { submitted: 0, status: 0 };
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${appUrl}/${INDEXNOW_KEY}.txt`, urlList: urls.slice(0, 10_000) }),
  });
  return { submitted: Math.min(urls.length, 10_000), status: res.status };
}
/** Announce a newly published or changed book; never delays or fails the request that triggered it. */
export function announceBook(bookId: string, appUrl: string) {
  waitUntil(submitIndexNow([`${appUrl}/books/${encodeURIComponent(bookId)}`, `${appUrl}/sitemap.xml`], appUrl)
    .then((r) => logger.info({ event: 'seo.indexnow', bookId, status: r.status }, 'Book announced to IndexNow'))
    .catch((err) => logger.warn({ err, event: 'seo.indexnow_failed', bookId }, 'IndexNow announcement failed')));
}

/**
 * Book and author pages are the web app (with SEO tags), served by the API. They need the web app's policy
 * (vercel.json, kept the same here): the API's "default-src 'none'" blocked the app's script and styles, so
 * a shared or search-engine link to a book showed a blank page (found 2026-11-16).
 */
function htmlPage(res: Response) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', PAGE_CSP);
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
}

export function mountSeo(app: Express, catalog: CatalogStore, appUrl: string) {
  app.get('/books/:id', async (req, res) => {
    const id = String(req.params.id);
    try {
      const [html, book] = await Promise.all([appShell(appUrl), /^[\w.-]{1,120}$/.test(id) ? catalog.get(id) : Promise.resolve(null)]);
      htmlPage(res);
      if (!book) {
        // The app still loads and says the book was not found; search engines drop the address.
        res.status(404).setHeader('Cache-Control', 'no-cache');
        res.send(injectHead(html, `<title>Book not found | ${SITE_NAME}</title>\n    <meta name="robots" content="noindex" />`));
        return;
      }
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
      res.send(injectBody(injectHead(html, bookHead(book, appUrl).html), bookBody(book, appUrl)));
    } catch (err) {
      logger.error({ err, event: 'seo.book_page_failed', id }, 'Book page could not be rendered');
      res.status(503).send('BooksAtlas is temporarily unavailable. Please try again.');
    }
  });

  // llms.txt with every real book listed, for AI assistants (llms.txt itself is a static file).
  app.get('/llms-full.txt', async (_req, res) => {
    try {
      const intro = (await fetch(`${appUrl}/llms.txt`).then((r) => (r.ok ? r.text() : '')).catch(() => '')) || `# ${SITE_NAME}\n`;
      const lines: string[] = [];
      for (let chunk = 0; chunk < 3 && lines.length < 5_000; chunk += 1) {
        const rows = (await catalog.sitemapChunk(chunk, 2_000)).filter((r) => !r.sample);
        if (!rows.length) break;
        for (const row of rows) {
          const book = await catalog.get(row.id);
          if (!book) continue;
          const forSale = !!book.hasReaderContent && book.price > 0;
          lines.push(`- [${book.title}${book.subtitle ? `: ${book.subtitle}` : ''}](${appUrl}/books/${encodeURIComponent(book.id)}) by ${book.author}${forSale ? ` · eBook €${book.price.toFixed(2)}` : ''}${book.genres?.length ? ` · ${book.genres.slice(0, 3).join(', ')}` : ''}: ${plain(book.synopsis, 300)}`);
        }
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.send(`${intro.trim()}\n\n## Books on ${SITE_NAME}\n\n${lines.join('\n') || '(The catalogue is being prepared.)'}\n`);
    } catch (err) {
      logger.error({ err, event: 'seo.llms_failed' }, 'llms-full.txt failed');
      res.status(503).send('Temporarily unavailable.');
    }
  });

  // Administrators: submit every page and book to IndexNow (after launch or a large import).
  app.post('/api/manager/seo/indexnow', async (req: Request, res) => {
    if (req.bookatlasIdentity?.role !== 'admin') { res.status(403).json({ error: 'Administrator access is required.' }); return; }
    try {
      const urls = [...STATIC_PAGES.map((p) => `${appUrl}${p}`), `${appUrl}/llms.txt`];
      for (let chunk = 0; urls.length < 10_000; chunk += 1) {
        const rows = (await catalog.sitemapChunk(chunk, SITEMAP_CHUNK)).filter((r) => !r.sample);
        if (!rows.length) break;
        urls.push(...rows.map((r) => `${appUrl}/books/${encodeURIComponent(r.id)}`));
      }
      res.json(await submitIndexNow(urls, appUrl));
    } catch (err) {
      logger.error({ err, event: 'seo.indexnow_failed' }, 'IndexNow submission failed');
      res.status(503).json({ error: 'IndexNow submission failed. Please retry.' });
    }
  });

  // Author pages (TASK-0009): the author's name, bio and books in the page head and as plain HTML.
  app.get('/author/:slug', async (req, res) => {
    const slug = String(req.params.slug).toLowerCase();
    try {
      const [html, profile] = await Promise.all([appShell(appUrl), authorProfile(catalog, slug)]);
      htmlPage(res);
      if (!profile) {
        res.status(404).setHeader('Cache-Control', 'no-cache');
        res.send(injectHead(html, `<title>Author not found | ${SITE_NAME}</title>\n    <meta name="robots" content="noindex" />`));
        return;
      }
      const url = `${appUrl}/author/${slug}`;
      const description = plain(profile.bio ?? '', 158) || `Books by ${profile.name} on ${SITE_NAME}: read a free preview of every book in your browser.`;
      const image = profile.books[0]?.coverImage ? absolute(profile.books[0].coverImage, appUrl) : `${appUrl}/icon-512.png`;
      const jsonLd = {
        '@context': 'https://schema.org', '@type': 'ProfilePage', url,
        mainEntity: {
          '@type': 'Person', name: profile.name, url, ...(profile.bio ? { description: plain(profile.bio, 1000) } : {}),
          workExample: profile.books.slice(0, 50).map((b) => ({ '@type': 'Book', name: b.title, url: `${appUrl}/books/${encodeURIComponent(b.id)}` })),
        },
      };
      const head = [
        `<title>${esc(`${profile.name}: books and audiobooks | ${SITE_NAME}`)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<link rel="canonical" href="${esc(url)}" />`,
        `<meta property="og:site_name" content="${SITE_NAME}" />`,
        '<meta property="og:type" content="profile" />',
        `<meta property="og:title" content="${esc(`${profile.name} on ${SITE_NAME}`)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:url" content="${esc(url)}" />`,
        `<meta property="og:image" content="${esc(image)}" />`,
        '<meta name="twitter:card" content="summary_large_image" />',
        `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
      ].join('\n    ');
      const body = `<noscript>
      <main>
        <h1>${esc(profile.name)}</h1>
        ${profile.bio ? `<p>${esc(plain(profile.bio, 1200))}</p>` : ''}
        <h2>Books by ${esc(profile.name)} on ${SITE_NAME}</h2>
        <ul>${profile.books.map((b) => `<li><a href="${appUrl}/books/${encodeURIComponent(b.id)}">${esc(b.title)}</a>${b.price > 0 ? ` · eBook €${b.price.toFixed(2)}` : ''}</li>`).join('')}</ul>
      </main>
    </noscript>`;
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
      res.send(injectBody(injectHead(html, head), body));
    } catch (err) {
      logger.error({ err, event: 'seo.author_page_failed', slug }, 'Author page could not be rendered');
      res.status(503).send('BooksAtlas is temporarily unavailable. Please try again.');
    }
  });

  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const chunks = Math.max(1, Math.ceil((await catalog.sitemapCount()) / SITEMAP_CHUNK));
      const entries = ['pages', 'authors', ...Array.from({ length: chunks }, (_, i) => `books-${i + 1}`)]
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
        xml(res, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...STATIC_PAGES, '/llms.txt', '/llms-full.txt'].map((p) => `  <url><loc>${appUrl}${p}</loc></url>`).join('\n')}\n</urlset>`);
        return;
      }
      if (file === 'authors.xml') {
        // Every author of a real book (demo titles excluded), from the first 5,000 titles.
        const slugs = new Set<string>();
        for (let chunk = 0; chunk < 5; chunk += 1) {
          const rows = (await catalog.sitemapChunk(chunk, 1_000)).filter((r) => !r.sample);
          if (!rows.length) break;
          for (let i = 0; i < rows.length; i += 100) {
            for (const card of await catalog.getMany(rows.slice(i, i + 100).map((r) => r.id))) if (card.author) slugs.add(authorSlug(card.author));
          }
        }
        xml(res, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...slugs].filter(Boolean).map((sl) => `  <url><loc>${appUrl}/author/${sl}</loc></url>`).join('\n')}\n</urlset>`);
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
