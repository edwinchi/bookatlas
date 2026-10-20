# Bookatlas

Bookatlas is an imported eBook and audiobook storefront with a sample reader, browser-local bookshelf, simulated checkout, publishing tools, subscriber management, and optional AI services.

## Run & operate

- Start the managed workflows `artifacts/bookatlas: web` and `artifacts/api-server: API Server`.
- The web artifact serves `/`; the API artifact handles `/api`. Managed workflows supply the required ports and base paths.
- Do not run a root-level `pnpm dev` or add a Vite API proxy.
- Install workspace dependencies with `pnpm install`.
- Run the migration checks with `node --test scripts/src/bookatlas-port.test.mjs` while both services are running. The registered `test` validation uses this command.
- Browser tests use `/repl/tools/bin/chromium`. Evidence is saved under the ignored `generated-artifacts/bookatlas-tests/`.

## Project structure

- `artifacts/bookatlas/`: existing React screens, styling, fonts, and client-side flows, served by Vite.
- `artifacts/api-server/src/bookatlas/`: original Express application, Supabase repository, SQL schema reference, and OpenRouter client.
- `lib/bookatlas-catalog/`: shared original catalog and book types.
- `.migration-backup/`: original imported app, retained as the parity reference; excluded from publishing.
- The existing mockup sandbox and generated API/database scaffold packages are retained. Bookatlas does not use the scaffold's PostgreSQL database.

## Import constraints

- Preserve the imported app rather than redesigning it or adding features.
- Retain Supabase as the existing persistence provider. Do not convert it to a different database without an explicit request.
- Without Supabase credentials, the original backend runs from in-memory seed data and loses server-side changes when restarted. Bookshelf, wishlist, and registration also use the original browser-local storage.
- Checkout is the imported simulation, not a live payment integration.
- The original administrative gate and API access model are preserved, not replaced or hardened as part of the port.
- Do not publish or connect live reader data until a separate security change adds server-enforced authorization: the imported user/subscriber listing and export routes and manager mutations are publicly accessible. The browser-local administrative PIN is not API protection.
- The source has four existing frontend type errors involving administrator session fields and editorial book fields. Runtime/build and parity checks are the migration gates; strict typing cleanup is separate work.
- The original header overflows narrow mobile screens. Components are preserved byte-for-byte, and the browser check records this rather than changing the design.

## Optional configuration

Configure credentials only through Replit Secrets; never put them in frontend code.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: reconnect the existing Supabase project. The original schema is in `artifacts/api-server/src/bookatlas/db/schema.sql`; do not apply it to production without authorization.
- `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`: original text AI provider.
- `GEMINI_API_KEY`: original Gemini-specific features (including speech, grounding, multimodal, and video). Without providers, retain the imported fallbacks and explicit unavailable-feature messages.
- `APP_URL`: actual public app origin for email calls to action and unsubscribe links. Set this before using outbound campaigns; the import's localhost default is not appropriate for emailed links.
- `UNSUBSCRIBE_TOKEN_SECRET`: stable signing secret for unsubscribe tokens.

External AI calls and Supabase persistence cannot be verified until their credentials are configured. Publishing does not automatically copy the external Supabase data into Replit PostgreSQL.
