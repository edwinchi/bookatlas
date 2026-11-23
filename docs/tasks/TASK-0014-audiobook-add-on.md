# TASK-0014: Natural audiobook as a paid add-on (cycle 9)

**Date:** 2026-11-15 · **Status:** ✅ live (deployed with `ddb8723`; since 2026-11-18 a narration follows the book's current text)

## Why

Readers already get a free device voice ("Listen to the book · device voice"). Ordering a natural narration earned
the author nothing extra, and the store did not show which books had one. Now:

1. A finished narration lists the book as **eBook + Audio** (🎧 badge, the Audiobooks filter and shelf, narrator and length).
2. The author decides, in Publish → their book → Natural audiobook:
   - **Include it with the eBook** (price 0, the earlier behaviour), or
   - **Sell it as an add-on** (€0.99–€999 incl. VAT). Readers hear a free narrated preview and buy the rest.
3. The add-on is the product `<bookId>.audio`. It goes through the same cart, Stripe or crypto checkout, invoice,
   refund and author share (81% of the price excluding VAT; 67% before 2026-11-23) as an eBook. It appears as its own line in the author's sales,
   CSV export and royalty statement.

## Rules

- The add-on is sold with the eBook, after it, or with a free eBook. It is never sold alone, and never twice.
- Prices always come from the server catalogue (`withAudioEditions` wraps the checkout's book lookup).
- Readers who bought the eBook **before** the add-on first went on sale keep the whole narration (`audioPricedAt`).
  Changing the price later keeps that date. Setting it back to 0 includes the narration again for every eBook reader.
- The author and administrators always hear all of it.
- A new version of the book keeps its audiobook listing and add-on price.
- Once the eBook is open, the device voice reads on past the narrated preview. The reader shows "Whole audiobook in a natural voice: €X".

## Code

- API: `narration/edition.ts` (product id, access, catalogue fields); `setAudioPrice` and `listNarrated` in `narration/service.ts`;
  `PUT /api/narration/books/:bookId/sale`; the add-on rules in `validateCart`; the audiobook lines in `authorSales.ts`.
- Web: `audioEdition.ts`, `ebook/AudiobookSale.tsx`, the book page (format tiles, "Buy eBook + Audiobook"), the reader upsell.
- Test: `tests/e2e/audiobook-sale.test.ts`.

No database migration is needed: the price is stored in the book's catalogue record (`data` JSON) and purchases use the existing table.
