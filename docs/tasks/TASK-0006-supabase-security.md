# TASK-0006: Supabase security review

| Field | Value |
|---|---|
| Objective | Nothing BookAtlas keeps in Supabase can be read, changed or run by anyone but the BookAtlas server |
| Source brief | Owner, 2026-11-10: "complete all tasks in the .md files especially supabase security" |
| Priority | High |
| Approval level | 0 (review, tests, docs). Changes to grants, policies or retention would be 2 |
| Status | ⏳ Reviewed and tested; the anon-key test waits for `SUPABASE_ANON_KEY` |
| Last updated | 2026-11-10 |

## Context

The Supabase project is **shared with other apps**. Their browsers hold the project's public anon key, so every BookAtlas object must be closed to the `anon` and `authenticated` roles, not just hidden by an empty result.

## Design (as built)

| Control | Where |
|---|---|
| Only the server talks to Supabase, with the service role key; no Supabase key or URL reaches the browser | `db/supabaseClient.ts` (server only); no `VITE_SUPABASE_*` |
| The server can address only `bookatlas_*` tables and two named functions | `bookatlasDb.from()` via `db/tables.ts`; `bookatlasDb.rpc()` allowlist |
| Every BookAtlas table has RLS on, no policies, and its grants revoked from `anon` and `authenticated` | `db/schema.sql`; checked by `scripts/src/bookatlas-database-isolation.test.mjs` and `F16-3` |
| The category-count view and its functions are revoked from `public`, `anon` and `authenticated`; functions are `security definer` with `search_path = public` | `db/schema.sql` |
| eBook files live in the private bucket `bookatlas-ebooks`; readers get them only through the API's access checks | `ebookPrep/store.ts`, `readerAccess` |
| Secrets are Vercel sensitive variables; `.env*` and `.vercel/` stay out of git | `.gitignore` |

## Verification (2026-11-10)

| Check | Result |
|---|---|
| Live JavaScript bundle contains no Supabase URL, service key, Stripe key or webhook secret | ✅ |
| Database API without a key: every BookAtlas table | ✅ 401 |
| Storage without a key: listing the bucket | ✅ refused |
| Public storage links for the cover, the reader content and a prepared-EPUB part | ✅ 400 (bucket not public) |
| Bucket `bookatlas-ebooks` | ✅ `public: false` |
| Anon key: no read, insert or function call on any BookAtlas object; no bucket listing | ⏳ `pnpm test:supabase` runs it once `SUPABASE_ANON_KEY` is in `.env.local` |

`pnpm test:supabase` (`tests/security/supabase.test.mjs`) repeats all of this against the real project.

Deployed with the export, image and OpenAPI changes as `bookatlas-a1cabg0yo` (`ad69150`): live security 5/5, browser 13/13, `pnpm test:supabase` 2 passed, 1 waiting for the anon key.

## Findings and follow-ups

- **Anon-key proof missing.** Add the project's publishable (anon) key to `.env.local` as `SUPABASE_ANON_KEY` and run `pnpm test:supabase`. If a table answers 200 with `[]`, its grant still exists; revoke it.
- **Shared project.** Other apps' tables are outside this review. Their RLS state does not affect BookAtlas objects, which are closed on their own, but a leak in another app shares the same database. Run Supabase's Security Advisor (Dashboard → Advisors) for the whole project.
- **Account deletion keeps the author's email on eBook submissions** (`data.ownerEmail`), and purchases keep the Clerk user id. Proposed: on deletion, delete unpublished submissions and their files, remove the email from published ones, and replace the purchase `user_id` with a non-identifying value (purchases stay 7 years as the order record). This is a retention change (Level 2) and needs the owner's approval.
- **Service role key rotation.** Rotate it in Supabase if it was ever shared outside Vercel and `.env.local`.
