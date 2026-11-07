# Project: BookAtlas

## Architecture
BookAtlas is a multi-tier eBook and audiobook platform with a React 19 / Vite 7 single-page frontend, an Express 4 API server with Clerk authentication and Supabase PostgreSQL persistence, an autonomous multi-stage publishing pipeline (Gemini text generation, EPUB compilation, and Gemini TTS audio narration), a 30-agent AI workforce management system, a 100k-record subscriber CRM engine, and rich in-browser reader tools.

The monorepo is managed via `pnpm 11` workspace:
- `artifacts/bookatlas`: React 19 + Vite 7 + Tailwind CSS frontend application (Storefront, Reader, Admin).
- `artifacts/api-server`: Express 4 backend server (API routes, Clerk auth integration, Supabase client, publishing pipeline, workforce engine).
- `artifacts/mockup-sandbox`: Vite mockup and UI workbench.
- `lib/bookatlas-catalog`: Canonical catalog data (`INITIAL_BOOKS`), book entities, studio voices.
- `lib/api-spec`: OpenAPI 3.1 specification (`openapi.yaml`) and Orval configuration.
- `lib/api-zod`: Generated Zod schemas for request/response validation.
- `lib/api-client-react`: Generated React Query hooks and custom fetch clients.
- `lib/db`: Drizzle ORM schema scaffold (inactive).
- `scripts`: Monorepo build, dev server launcher, test runner (`scripts/run-unit-tests.mjs`), smoke test scripts, Playwright test suite (`scripts/src/bookatlas-port.test.mjs`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Storefront & Catalog Search | Multi-token, accent-free search, genre/format/price filtering, and sorting | M1, M4, E2E | survey_2 |
| 2 | Authentication & RBAC | Reader & Admin sign-in, session bar, role-based route guard (`accessFor`), owner bootstrapping | M1, M4, E2E | survey_2 |
| 3 | In-Browser eReader | In-browser eReader with custom typography, themes (light/sepia/dark), chapters, bookmarks | M1, M4, E2E | survey_2 |
| 4 | Audiobook Playback Dock | Persistent audio player dock, chapter skip, playback speeds (0.75x–2.0x), voice previews | M1, M4, E2E | survey_2 |
| 5 | Personal Bookshelf & Stats | Reader library, wishlist, reading streaks, completion percentages, total hours read | M1, M4, E2E | survey_2 |
| 6 | Cart & Checkout | Shopping cart drawer, guest cart persistence, post-login merge, simulated checkout | M1, M4, E2E | survey_2 |
| 7 | Mobile & PWA Navigation | Sticky bottom nav, offline Service Worker, web manifest, responsive design | M1, M4, E2E | survey_2 |
| 8 | Reader AI Copilot & Matchmaker | AI Matchmaker, Reader Copilot, Book Summary, Deep Dive, Mind Map, Term Pronunciation | M1, M4, E2E | survey_2 |
| 9 | Gemini Multimodal AI Hub | Conversational Chatbot, Live Voice Companion, Google Search Grounding, Video Trailers | M1, M4, E2E | survey_2 |
| 10 | Studio Voice Narration | Curated voice catalog (Sulafat, Charon, etc.), TTS clip generation, budget safeguards | M1, M2, M4, E2E | survey_2 |
| 11 | Durable Publishing Pipeline | Multimodal source upload (PDF, PNG, text), chapter generation, EPUB3 & WAV compilation | M1, M2, M4, E2E | survey_2 |
| 12 | Subscriber CRM (100k) | Chunked RFC 4180 CSV parsing, RFC 5322 syntax validation, deduplication, benchmark generator | M1, M4, E2E | survey_2 |
| 13 | Email Campaigns & Unsubscribe | Visual campaign designer, AI copy composer, consent verification, signed HMAC unsubscribe links | M1, M2, M4, E2E | survey_2 |
| 14 | AI Team Workforce | 30 autonomous AI roles across 6 departments, team sizing presets (10 MVP, 38 scale-up), review ledger | M1, M2, M4, E2E | survey_2 |
| 15 | Admin Management Portal | Catalog CRUD, dynamic pricing optimizer, regional market radar, cultural translation, logs | M1, M4, E2E | survey_2 |
| 16 | Database Isolation & Supabase Client | Scoped Supabase client, table prefix enforcement (`bookatlas_*`), secret-key / service-role support | M1, M2, M4, E2E | survey_2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Build Health & Frontend Typecheck Remediation | Fix `cartCount` undeclared identifier in `artifacts/bookatlas/src/App.tsx`, verify `pnpm run build`, `pnpm run typecheck`, and monorepo build artifacts | none | DONE |
| M2 | Test Runner Unification & Orphaned Suite Integration | Update `scripts/run-unit-tests.mjs` to discover and run both `scripts/src/*.test.mjs` and all `artifacts/**/*.test.ts` suites (unifying 54+20 = 74 unit tests under `pnpm test:unit`) | M1 | DONE |
| M3 | Cross-Platform E2E Test Suite Portability | Decouple `scripts/src/bookatlas-port.test.mjs` from Linux `/repl/tools/bin/chromium`, enable local Playwright browser discovery, add cross-platform fallback | M2 | DONE |
| M4 | Final Milestone (E2E Verification & Adversarial Hardening) | Phase 1: Pass 100% of the opaque-box E2E test suite (Tiers 1-4) produced by the E2E Testing Track. Phase 2: Adversarial coverage hardening (Tier 5). | M3, TEST_READY | DONE |

## Interface Contracts
### `artifacts/bookatlas` ↔ `artifacts/api-server`
- HTTP REST API running on port 3001 (proxied via Vite on port 5173).
- Authorization: HTTP-only session cookie / Clerk bearer token.
- Routes: `/api/books`, `/api/categories`, `/api/auth/me`, `/api/ai/*`, `/api/manager/*`, `/api/subscribers/*`.
- Contracts defined in `lib/api-spec/openapi.yaml`, enforced by `lib/api-zod` and consumed by `lib/api-client-react`.

### `scripts/run-unit-tests.mjs` ↔ Test Suites
- Runner must execute all unit test files using Node native test runner (`node:test`) loaded with `tsx`.
- Discovers both `scripts/src/*.test.mjs` (excluding environment-dependent suites like `bookatlas-port.test.mjs`) and `artifacts/**/*.test.ts`.

## Code Layout
- `artifacts/bookatlas/src/`: React storefront and reader components.
- `artifacts/api-server/src/`: Express server, auth middleware, routes, and business services.
- `lib/`: Shared workspace libraries (`bookatlas-catalog`, `api-spec`, `api-zod`, `api-client-react`, `db`).
- `scripts/`: Dev launcher, test runners, unit test scripts, smoke scripts.
- `.agents/teamwork/`: Agent coordination metadata and reports.
