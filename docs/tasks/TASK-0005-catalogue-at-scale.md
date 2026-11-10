# TASK-0005: A catalogue of 1.5 million titles that stays fast

| Field | Value |
|---|---|
| Objective | booksatlas.app holds at least 1.5M eBook and audiobook titles, and search, categories and pages stay fast |
| Source brief | Owner, 2026-11-10: "build this site to hold at least 1.5M titles ebook and audio and to run super fast"; then "make this even more professional … especially the category section" |
| Priority | High |
| Approval level | **2** (architecture, schema), approved 2026-11-10. Production schema change, data writes and deploys are **3** |
| Status | ⏳ Phase 1 (store, API, storefront) built and tested; waiting for the production schema |
| Last updated | 2026-11-10 |

## Owner decisions (2026-11-10)

| # | Question | Decision |
|---|---|---|
| S1 | Architecture | **Approved:** catalogue and search in Postgres with indexes, small server-side pages, edge caching, category counts from the server |
| S2 | Where the titles come from | **Both** distributor feeds (ONIX/CSV, under contract) and author uploads |
| S3 | Order | Scale first, then the category section, then hardcopy links and new versions |
| S4 | "Content from the singularity" | Not specified yet; the owner will share it later |

## Why the old design could not scale

The server loaded every book into memory and sent all of them to every browser, which filtered them there, and the browser refreshed the whole list every 30 seconds. At 1.5M titles (several GB) that fails on memory, bandwidth and time long before the first page.

## Design

- **One query definition** (`lib/bookatlas-catalog/src/catalogQuery.ts`): filters (search, category, format, price, rating, language, Plus, audio), sorts, page size (24, at most 100), page depth (at most 400) and the home-page shelves. The API parses it from the URL; the browser builds it.
- **Store** (`artifacts/api-server/src/bookatlas/catalog/store.ts`): `postgresCatalog` in production, `memoryCatalog` on the local stack and in tests. Both implement search, get, facets, upsert and remove.
- **Table** `bookatlas_books` gains indexed columns beside `data` (the whole record): `card` (the list view, about 1.5 KB), `genres[]`, `format`, `language`, flags, `rating`, `popularity`, `published_at`, `search_text` and a generated `search` tsvector. GIN indexes on `search` and `genres`; B-tree indexes for every sort.
- **Search** is word-prefix full text ("awak cod" finds *The Awakened Codex*), accent-insensitive, with an estimated total count.
- **Category counts** come from the materialized view `bookatlas_catalog_facets`, refreshed after catalogue writes at most once a minute.
- **API** (public, edge-cached by Vercel): `GET /api/catalog/search` (60 s), `/api/catalog/books/:id` (60 s), `/api/catalog/facets` (300 s), `/api/catalog/shelves?ids=` (120 s). `GET /api/books` stays for the admin studio and returns at most 100 cards.
- **Storefront**: the grid is a paged query with debounced typing, cancelled stale requests, skeletons, infinite scroll with a "Show more titles" fallback and `content-visibility` on cards; shelves come from `/shelves`, languages from `/facets`; the book page and reader load the full record on open. No polling.
- **Admin studio** keeps the 1,000 most recent titles in memory (phase 3 moves it to the store).

## Progress

| Step | Status |
|---|---|
| Query definition, store, routes, policy (public), legacy `/api/books` on the store | ✅ |
| Schema: columns, indexes, facets view and functions (`db/schema.sql`) | ✅ written; ⛔ owner runs it in Supabase |
| Storefront on the API (grid, shelves, facets, full record on open) | ✅ |
| Tests | ✅ `tests/e2e/catalog-search.test.ts` (search with accents, filters, sort, paging without overlap, page cap, facets, shelves, book page, cache headers). `pnpm test:unit` 106/106, `pnpm test:e2e` 190/190 |
| Load test at 1.5M titles (Postgres 16 + PostgREST, the production store code) | see below |
| Phase 2: distributor feed import (ONIX 3.0 / CSV), batch upsert | ⬜ |
| Phase 3: category section redesign on facets; admin studio on the store | ⬜ |

## Follow-ups

- Supabase plan: 1.5M titles with full records is several GB; the free plan's 500 MB will not hold it (Pro includes 8 GB).
- Covers for 1.5M titles: serve resized images through a CDN (Supabase image transformation or Vercel Image Optimization).
- Deep pages are capped at 400; past that the reader refines the search.
