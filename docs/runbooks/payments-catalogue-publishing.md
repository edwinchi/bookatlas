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

## Secrets

| Secret | Where | Rotate |
|---|---|---|
| `STRIPE_SECRET_KEY` | Vercel (sensitive) | Stripe → Developers → API keys → Roll; update Vercel; redeploy |
| `STRIPE_WEBHOOK_SECRET` | Vercel (sensitive) | Stripe → Webhooks → endpoint → Roll secret; update Vercel; redeploy |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel, `.env.local` | Supabase → Settings → API; update both; redeploy |
