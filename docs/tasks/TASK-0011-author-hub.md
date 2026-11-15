# TASK-0011: Author hub (cycle 6)

master.md "Author Dashboard" (upload, manage listings, view orders, revenue reports). The header's Author hub items were "Soon" placeholders; they now open a hub at the top of the Publish page (signed-in authors).

## Tiles

- **Books and drafts**: published, in review and draft counts; scrolls to "Your eBooks".
- **Sales and CSV export**: `GET /api/author/sales.csv`, every sale of the author's own books: date, book, buyer country, price incl./excl. VAT, VAT, 67% share, status. Cells are quoted and a leading `= + - @` is neutralised (CSV injection). UTF-8 with BOM for Excel.
- **Royalty statements**: `GET /api/author/statements/YYYY-MM` (printable HTML, `?format=json` for data), per book: sold, refunded, incl./excl. VAT, share; month marked closed or in progress; future months refused.
- **Public author page**: links to `/author/<slug>` for each author name on published books.
- **Payout setup**: `GET/PUT /api/author/payout`. Account holder, IBAN (ISO 13616 mod-97 check), optional BIC, address, country, optional tax ID and VAT number, business flag. Stored in `bookatlas_author_payouts` (RLS, service role only); IBAN and tax ID are only returned masked. Included in the data export, deleted on account erasure. Purpose: SEPA payouts and DAC7 seller reporting.

## Owner steps

1. Run `artifacts/api-server/src/bookatlas/db/migrations-2026-11-15e-author-payouts.sql` in the Supabase SQL editor (without it, saving payout details returns "could not be saved").
2. Decide the payout schedule and minimum (not yet stated in the app) before the first payout.

## Checks

`tests/e2e/author-hub.test.ts`; browser sweep (Author hub menu has 5 live links, no "Soon").
