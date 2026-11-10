# TASK-0004: Stripe payments for eBooks (iDEAL and worldwide)

| Field | Value |
|---|---|
| Objective | Readers buy BookAtlas eBooks with iDEAL, cards, wallets and local methods worldwide; a paid purchase unlocks the whole book |
| Source brief | Owner, 2026-11-10: "let us setup stripe so ideal can work as well and others globally" |
| Priority | High |
| Approval level | **2** (payments, schema, permissions), approved 2026-11-10. Live keys and the production deploy are **3** |
| Status | ✅ Live payments on since 2026-11-10 (`bookatlas-nml4uta11`). Waiting for Stripe Tax registrations and a first real purchase |
| Builds on | [TASK-0002](TASK-0002-self-publishing-platform.md) Discovery J, [TASK-0003](TASK-0003-ebook-preparation-pipeline.md) D5 (buyers only, preview for everyone) |
| Last updated | 2026-11-10 |

## Owner decisions (2026-11-10)

| # | Question | Decision |
|---|---|---|
| P1 | Stripe account | The owner has a Stripe account for Atlantean Globals Services |
| P2 | VAT | **Stripe Tax.** Prices are VAT-inclusive (EU consumer prices); Stripe Tax computes and reports VAT per buyer country once the NL VAT number and the EU OSS registration are added in Stripe |
| P3 | Design | **Approved:** Stripe-hosted Checkout, table `bookatlas_purchases`, signed webhook, refunds lock the book, prices from the server only |

## Design

- **Checkout.** `POST /api/checkout/sessions` (signed-in reader) takes book ids, loads each from the server catalogue and creates a Stripe Checkout session: mode `payment`, currency **EUR** (iDEAL only charges in euros), `tax_behavior: inclusive`, `automatic_tax` when `STRIPE_TAX=on`, `allow_promotion_codes`, `client_reference_id` = the account id. No `payment_method_types`: Stripe shows each buyer the methods enabled in the dashboard that suit their country (cards, Apple Pay, Google Pay, Link, iDEAL, Bancontact, Klarna, EPS, Przelewy24 …). Adaptive Pricing (a dashboard setting) lets buyers outside the euro area pay in their own currency.
- **What is sold.** Only prepared BookAtlas eBooks (`hasReaderContent`) with a price above 0. Demo catalogue titles are refused (422) because there is no book to deliver.
- **Fulfilment.** `POST /api/stripe/webhook` checks the Stripe signature against the raw body (`STRIPE_WEBHOOK_SECRET`) and handles `checkout.session.completed`, `checkout.session.async_payment_succeeded` (store one row per book, idempotent on session + book) and `charge.refunded` (a full refund sets `refunded`). The success page also asks `GET /api/checkout/sessions/:id`, which fulfils a paid session, so a delayed webhook does not delay the buyer.
- **Access.** `readerAccess` (TASK-0003) adds buyers: a `paid` purchase opens the whole book. A purchases lookup failure shows the preview, never an error.
- **Frontend.** The cart uses Stripe when `/api/payments/config` says payments are on, otherwise it keeps the demo. The return from Stripe shows a confirmation, puts the books in the library and removes them from the cart. Owned books show "Read the Full Book".

## Data (Level 2, approved P3)

`bookatlas_purchases`: id, user_id, book_id, checkout_session_id, payment_intent_id, amount_total (cents, VAT included), currency, status (`paid`, `refunded`), timestamps; unique (checkout_session_id, book_id). RLS on, service role only. Kept as the order record (Dutch fiscal retention, 7 years).

## Threat model (summary)

| Threat | Control |
|---|---|
| Buyer changes the price | Prices come from the server catalogue; the browser sends only book ids |
| Forged "paid" notification | Webhook signature checked with the endpoint secret; unsigned or altered events get 400 |
| Webhook retried or delivered twice | Insert-if-absent on (checkout_session_id, book_id) |
| Reading another buyer's checkout | Session status only for the account in `client_reference_id`; others get 404 |
| Card data exposure | Stripe-hosted Checkout; BookAtlas never handles card or bank details |
| Selling something that cannot be delivered | Only prepared eBooks are sellable |

## Progress

| Step | Status |
|---|---|
| Stripe SDK `stripe@22.6.2` in the API server (Level 1: dependency) | ✅ Rollback: remove the package and `payments/` |
| Checkout, webhook, status and purchases routes (`artifacts/api-server/src/bookatlas/payments/`) | ✅ |
| Reader access for buyers | ✅ |
| Cart, return from Stripe, owned books | ✅ |
| Tests | ✅ `tests/e2e/payments.test.ts`: server-side price in EUR VAT-inclusive, demo titles refused, forged webhook refused, retried webhook stored once, whole book after payment, other accounts cannot read the checkout, already-owned refused, refund locks the book. `pnpm test:unit` 106/106, `pnpm test:e2e` 187/187, typecheck clean, `pnpm audit --prod` clean |
| Owner: secret key | ✅ 2026-11-10 the owner supplied the **live** key; stored in Vercel Production as a sensitive variable (`STRIPE_SECRET_KEY`). Read-only check: account NL, EUR, charges and payouts enabled, Atlantean Globals Services |
| Owner: payment methods | ✅ 2026-11-10 the owner turned on iDEAL and Google Pay in the Default configuration (`pmc_1U4TRfRV4gYJjN7FzUMxFdb2`, shared with the account's other sites). On and available: cards, iDEAL, Bancontact, EPS, Klarna, Apple Pay, Google Pay, Link, Revolut Pay, Amazon Pay, Samsung Pay, Satispay, BLIK, MB Way, Multibanco, MobilePay and others; Alipay and Przelewy24 pending Stripe approval. Checkout shows each buyer the ones that work for euros in their country |
| Owner: Stripe Tax registrations | ⏳ Stripe Tax is active but has **no registrations**; `STRIPE_TAX` stays unset until NL VAT and EU OSS are added |
| Shared Stripe account | ✅ The account also serves other sites (four webhook endpoints). BookAtlas sessions carry `metadata.app = bookatlas`; the webhook ignores untagged sessions (tested) |
| Owner: run the `bookatlas_purchases` SQL in Supabase | ✅ 2026-11-10 (second run) |
| Test-mode run: real Stripe test checkout with card and iDEAL, webhook via a test endpoint | ⬜ |
| Webhook and go-live | ✅ 2026-11-10 (owner sign-off): live endpoint `we_1UaErjRV4gYJjN7FOTpVo3Ux` → `https://booksatlas.app/api/stripe/webhook` (checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded); signing secret in Vercel as sensitive `STRIPE_WEBHOOK_SECRET`; deployed `bookatlas-nml4uta11`. Live: `/api/payments/config` enabled, unsigned and forged webhooks 400, anonymous checkout 401, security 5/5, browser 12/12. `STRIPE_TAX` unset until registrations exist |

## Incident 2026-11-10: the cart stayed in demo mode after go-live

| | |
|---|---|
| Symptom | The owner's cart showed "Demo checkout only" and €9.99 after payments went live and the price changed to €9.36; earlier the publishing page showed an already-published submission as "Ready for review" |
| Root cause | The service worker (`public/sw.js`, v5) answered every request it did not list "cache first", including `/api/payments/config`, `/api/catalog/*` and `/api/ebook-submissions`. The first answer was replayed forever. It also stored personal answers (submissions, reader text) in the browser cache. The cart also kept the price from when a book was added |
| Fix | v6: every `/api/` request goes to the network; only the public catalogue keeps a network-first copy for offline use, never with an Authorization header. The new cache version deletes old caches on activation. Opening the cart refreshes each book's price and title from the catalogue (checkout always charged the server price) |
| Tests | Browser: "the service worker never replays API answers that change" (only public catalogue paths may be in the cache). F7-4 and PAIR-15 now check the network-only rule and the offline catalogue copy |
| Prevention | New API routes are network-only by default; caching an API path requires adding it to `publicCatalogue` in `sw.js` and to the browser test |

## Follow-ups

- Include purchases in the account data export and keep them (anonymised) when an account is deleted.
- Stripe Connect payouts for other authors (TASK-0002 R1, 80% author share).
- Paystack for African mobile money (TASK-0002 P11).
