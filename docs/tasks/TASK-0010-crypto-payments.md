# TASK-0010: Crypto payments (CoinGate)

Owner decision 2026-11-15: accept crypto. Stripe's stablecoin payments are not offered to Dutch businesses, so BooksAtlas uses **CoinGate** (Lithuania, EU-licensed under MiCA), which converts at once and pays out in **EUR**. BooksAtlas never holds crypto.

## How it works

- **Start.** `POST /api/crypto/orders` (signed-in reader, same cart checks as card checkout: 1–20 sellable books, none owned, withdrawal waiver required). Prices come from the catalogue, in euros, VAT included. The order is stored in `bookatlas_crypto_orders` with a random callback token, then created at CoinGate (`price_currency` and `receive_currency` EUR). The buyer pays on CoinGate's page.
- **Confirm.** CoinGate posts `POST /api/crypto/callback` (form). The token must match the stored order, and the status is then **re-read from CoinGate's API**; only `paid` with the exact euro amount unlocks the books. The success page (`/?crypto=paid&order=…`) also polls `GET /api/crypto/orders/:id` (buyer only), so a late callback does not delay the book.
- **Records.** Purchases and the invoice use `cg_<CoinGate id>` as session and payment reference; VAT and invoices are the same as for cards. Repeated callbacks are idempotent.
- **Refunds.** Approving a refund request of a crypto order closes access and marks the purchase, invoice and crypto order refunded. The admin then sends the refund from the CoinGate dashboard (Orders → Refund); CoinGate asks the buyer for a wallet.

## Owner steps

1. Run `artifacts/api-server/src/bookatlas/db/migrations-2026-11-15d-crypto-orders.sql` in the Supabase SQL editor.
2. Create a CoinGate business account (KYB), set payouts to EUR to your bank account.
3. Create an API token (Apps → API) and add `COINGATE_API_TOKEN` in Vercel (sensitive). For a sandbox token also set `COINGATE_ENV=sandbox`.
4. Redeploy. `/api/payments/config` then reports `crypto: true` and the cart shows "Pay with crypto".

## Checks

- `tests/e2e/crypto.test.ts`: waiver required, euro price from the server, forged callback refused, a callback saying "paid" is ignored until CoinGate's API says paid, one invoice despite repeated callbacks, already-owned refused, refund closes access.
