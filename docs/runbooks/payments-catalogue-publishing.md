# Runbook: payments, catalogue and eBook publishing

For operators of BookAtlas. Background: [TASK-0003](../tasks/TASK-0003-ebook-preparation-pipeline.md) (publishing), [TASK-0004](../tasks/TASK-0004-stripe-payments.md) (payments), [TASK-0005](../tasks/TASK-0005-catalogue-at-scale.md) (catalogue), [TASK-0006](../tasks/TASK-0006-supabase-security.md) (Supabase security). Sign-in and accounts: [accounts-and-auth.md](accounts-and-auth.md).

## Health

| Check | URL | Healthy | Alert when |
|---|---|---|---|
| Server up | `GET /api/healthz` | 200 `{"status":"ok"}` | not 200 for 2 minutes |
| Dependencies | `GET /api/healthz/ready` | 200, `database` and `catalogueCounts` `ok`, `payments` `ok` | 503 (`status: degraded`), or `payments` `off` in production |

Point an uptime monitor (for example Vercel's or Better Stack's) at both, every minute, from Europe. `/ready` reports only ok, fail or off plus timings.

## Log events (pino JSON, field `event`)

| Event | Meaning | Action |
|---|---|---|
| `payments.fulfilled` (`session`, `books`) | A paid checkout unlocked its books | Sales metric |
| `payments.refunded` (`paymentIntent`) | A full refund locked the book again | None |
| `payments.invoice_failed` (`session`) | The book was unlocked but its invoice was not saved | Check that `bookatlas_invoices` exists (SQL below); the invoice is issued when the buyer's success page checks again |
| `payments.webhook_rejected` | Stripe webhook with a bad signature | A few: ignore. Many: check `STRIPE_WEBHOOK_SECRET` matches endpoint `we_1UaErjRV4gYJjN7FOTpVo3Ux`, or someone is probing |
| `Payment request failed` (error) | Stripe or the purchases table failed | See "A buyer paid but has no book" |
| `[catalog] search failed`, `[catalog] cards failed` | Supabase query error | Check `/api/healthz/ready`; Supabase status page |
| `[catalog] facet refresh failed` | Category counts not refreshed | Run `select public.bookatlas_refresh_catalog_facets();` in the SQL editor |
| `Purchase lookup failed` (warn) | Buyers temporarily see the preview instead of the whole book | Check Supabase; it recovers by itself |
| `health.degraded` (`failing`) | Readiness check failed | Follow the failing dependency |
| `eBook preparation request failed` | Unexpected error in the eBook pipeline | Read the error; the author can retry |

Vercel → bookatlas → Logs; filter by the `event` text.

## Incidents

### A buyer paid but has no book

1. Stripe dashboard → Payments: find the payment; open its Checkout session (`cs_live_…`). Metadata `app` must be `bookatlas`.
2. Stripe → Developers → Webhooks → `booksatlas.app/api/stripe/webhook`: check the delivery. If it failed, click **Resend**.
3. The buyer can also reload the success page: `GET /api/checkout/sessions/:id` fulfils a paid session too.
4. Still missing: check the row in `bookatlas_purchases` (Supabase table editor) by `checkout_session_id`.

### Refund

Refund the payment in Stripe. A full refund sends `charge.refunded` and the book locks within a minute. Partial refunds keep access.

### Prices or payments look wrong in the browser

Since service worker v6, API answers are never replayed from the browser cache. A reader on an old version gets v6 on the next load; ask them to reload or reopen the tab.

### Category counts are stale

Counts refresh at most once a minute after catalogue writes. Force it: `select public.bookatlas_refresh_catalog_facets();`.

### Catalogue slow

`/api/healthz/ready` shows `database` timings. Repeat pages are edge-cached (`x-vercel-cache: HIT`). Over about 100 ms per query: check that the TASK-0005 indexes exist (`\di bookatlas_books*`) and run `analyze public.bookatlas_books;`.

### An author's upload fails

The card shows the reason. "Upload again" restarts it. Files over 150 MB are refused; parts are 4 MB.

## Deploy and rollback

- Deploy: `npx vercel --prod --yes` after typecheck, unit, end-to-end (and browser tests when the UI changed) pass. Then `BASE_URL=https://booksatlas.app pnpm test:security` and `pnpm test:browser`, and record the deployment in the task file.
- Rollback: Vercel → bookatlas → Deployments → previous deployment → **Promote to Production**. Deployments are listed in the task files.
- Database changes are run by the owner in the Supabase SQL editor before the code that needs them is deployed.

## VAT and invoices (owner decision 2026-11-14)

BookAtlas, not Stripe, handles VAT: Stripe Managed Payments is turned off on each checkout and prices are VAT-inclusive. Below the EU €10,000 cross-border threshold every EU buyer is charged Dutch 9% e-book VAT; buyers outside the EU pay none. Each paid checkout gets one sequentially numbered invoice (`BA-<year>-<seq>`) in `bookatlas_invoices`; buyers open it under **Orders & invoices**.

- **Database:** run `artifacts/api-server/src/bookatlas/db/migrations-2026-11-14-invoices.sql` once in the Supabase SQL editor before deploying.
- **Seller details (Vercel, Production):** `SELLER_LEGAL_NAME` (default Atlantean Globals Services), `SELLER_ADDRESS` (use `
` for new lines), `SELLER_KVK`, `SELLER_VAT_ID`, `SELLER_EMAIL`. Until address, KvK and VAT ID are set the document is titled *Receipt* and says a full VAT invoice is available on request.
- **Threshold:** `GET /api/manager/vat-summary` (admin) shows net cross-border EU sales this and last year, VAT by country, and `threshold.state` (`ok`, `warning` from 80%, `over`). At `warning`, register for OSS and switch to per-country rates (code change in `payments/vat.ts`, rates confirmed by the accountant).
- **Refunds:** a full refund marks the invoice *refunded*; whether a separate credit note is needed is for the accountant.

## Search engines and link previews (cycle 2, 2026-11-14)

- Every book has its own address, `/books/<id>`. Vercel sends it to the API (`seo.ts`), which serves the app with that book's title, description, canonical URL, Open Graph and Twitter preview tags and schema.org `Book` data; the app then opens the book. Unknown ids answer 404 with `noindex`; demo titles (`isSample`) carry `noindex`.
- `/sitemap.xml` is an index: `/sitemaps/pages.xml` (home, privacy, legal, refunds) and `/sitemaps/books-<n>.xml`, 10,000 titles each, demo titles left out. `robots.txt` points to it.
- After the first deploy: add `https://booksatlas.app/sitemap.xml` in Google Search Console (Sitemaps) and check a book in the URL Inspection tool. Preview a shared link with the Facebook Sharing Debugger or LinkedIn Post Inspector.
- Log event `seo.book_page_failed` / `seo.sitemap_failed`: the database or the app shell was unavailable.

## Secrets

| Secret | Where | Rotate |
|---|---|---|
| `STRIPE_SECRET_KEY` | Vercel (sensitive) | Stripe → Developers → API keys → Roll; update Vercel; redeploy |
| `STRIPE_WEBHOOK_SECRET` | Vercel (sensitive) | Stripe → Webhooks → endpoint → Roll secret; update Vercel; redeploy |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel, `.env.local` | Supabase → Settings → API; update both; redeploy |
