/**
 * The Content Security Policy of every BooksAtlas page (owner request 2026-11-23: protect the site against attacks).
 * Enforced, not report-only: a script injected into a page (a cross-site scripting bug, a poisoned dependency
 * fetched from another host) cannot run, and the page cannot be framed, post forms elsewhere or load plugins.
 *
 * The same string is served from three places, and `pageCsp.test.ts` keeps them identical:
 * - here, for the pages the API server renders (book and author pages, `seo.ts`);
 * - `vercel.json`, for the app on Vercel;
 * - `docker/security-headers.conf`, for the local Docker stack.
 *
 * `https://clerk.booksatlas.app` is the Frontend API of the Clerk production instance (runbook accounts-and-auth.md),
 * allowed in advance so switching to it cannot break sign-in. Violations are posted to `/api/csp-report` and logged.
 */
export const PAGE_CSP = [
  "default-src 'self'",
  "script-src 'self' https://*.clerk.accounts.dev https://clerk.booksatlas.app https://*.protect.clerk.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://img.clerk.com",
  "media-src 'self' data: blob: https://commondatastorage.googleapis.com",
  "connect-src 'self' https://*.clerk.accounts.dev https://clerk.booksatlas.app https://*.protect.clerk.com:* https://clerk-telemetry.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
  'report-uri /api/csp-report',
].join('; ');
