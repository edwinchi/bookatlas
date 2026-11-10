# TASK-0007: Review against the master system prompt

| Field | Value |
|---|---|
| Objective | Check BookAtlas against the owner's governance ("Concise Master System Prompt": lifecycle, definition of done, 15 directives) and close the gaps |
| Source brief | Owner, 2026-11-10: "go through this as well" |
| Approval level | 0 (monitoring, docs, tests, accessibility fixes) and 1 (CI change, new dev dependency); notified below |
| Status | ✅ Gaps closed where the repository can close them; remaining items need the owner |
| Last updated | 2026-11-10 |

## Gaps found and closed

| Directive | Gap | Done |
|---|---|---|
| 8 Observability | Only a liveness check; no way for a monitor to see the database or payments | `GET /api/healthz/ready`: database, category counts, payments (ok, fail or off, with timings; no details). Logs `health.degraded`. New events `payments.webhook_rejected`, `payments.refunded` |
| 14 Documentation, runbooks | Runbook only for sign-in | [payments-catalogue-publishing.md](../runbooks/payments-catalogue-publishing.md): health, log events, incidents (paid but no book, refunds, stale counts, slow catalogue, failed uploads), deploy and rollback, secret rotation |
| 7 Test-driven delivery, CI | CI ran only unit tests and the build, only on `main` | Every push and pull request: typecheck, unit, end-to-end, catalogue, build, `pnpm audit --prod`, on Ubuntu and Windows. **Level 1:** rollback by reverting `.github/workflows/build.yml` |
| 6 Accessibility | No accessibility test | Browser test with axe-core (WCAG 2.2 AA) on desktop and mobile: no serious or critical violations allowed. **Level 1:** dev dependency `@axe-core/playwright@4.14.0` (rollback: remove it and the test). Fixed: sort dropdown without a name (critical), carousel dots below 24 px, mobile "Audio" button name, 141 elements with too little contrast (card review counts and old prices, hero old price) |
| 10 Compliance | Data export missed purchases and submissions; deletion kept authors' emails | Done in [TASK-0006](TASK-0006-supabase-security.md) |
| 9 Performance | Not measured at scale | 1.5M-title load test in [TASK-0005](TASK-0005-catalogue-at-scale.md); lighter reader images in [TASK-0003](TASK-0003-ebook-preparation-pipeline.md) |
| 11 Resilience | Stale browser caches replayed API answers | Service worker v6 ([TASK-0004](TASK-0004-stripe-payments.md) incident) |

## Remaining (needs the owner)

| Item | Why it cannot be done from the repository |
|---|---|
| Uptime monitor on `/api/healthz` and `/api/healthz/ready` with alerts | Needs a monitoring account (Vercel Observability or Better Stack) and an alert contact |
| Supabase Security Advisor for the shared project; `SUPABASE_ANON_KEY` for `pnpm test:supabase` | Dashboard access and the publishable key |
| Stripe Tax registrations (NL VAT, EU OSS) | Stripe dashboard |
| EPUBCheck worker hosting | Hosting account (Fly.io, Railway or a small VPS) and a worker token |
| Supabase plan for 1.5M titles | Billing decision (Pro includes 8 GB) |
| TASK-0002 planning documents (PRD, architecture, 90-day plan, success metrics) | Business decisions: mission, pricing, target customers |
| Remaining contrast and accessibility on pages other than the storefront | Next cycle: extend the axe test to the publishing page, reader and book page |

## Recursive improvement (directive 15)

Lessons from this cycle, applied to how work is done:

- **Source-text tests break on refactors** (F7-4, PAIR-15 matched old code). New tests check behaviour: the service worker test inspects the browser cache, not the source.
- **Prove fixes in the real runtime.** The cart bug was invisible to unit tests; only the owner's browser showed it. Browser tests now cover service-worker caching.
- **Measure before optimising.** The 4.5 MB image limit turned out not to apply to responses; the real problem was mobile data, and the fix targets that.
- **Schema first, code second.** Code that needs new columns waits for the owner's SQL; the live site never ran against a missing schema.
