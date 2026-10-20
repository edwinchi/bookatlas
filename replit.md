# Bookatlas

Bookatlas is an imported eBook and audiobook storefront with a sample reader, browser-local bookshelf, simulated checkout, publishing tools, subscriber management, and optional AI services.

## Run & operate

- Start the managed workflows `artifacts/bookatlas: web` and `artifacts/api-server: API Server`.
- The web artifact serves `/`; the API artifact handles `/api`. Managed workflows supply the required ports and base paths.
- Do not run a root-level `pnpm dev` or add a Vite API proxy.
- Install workspace dependencies with `pnpm install`.
- Run the authentication policy, API protection, and public browser checks with `node --test scripts/src/bookatlas-port.test.mjs` while both services are running. The registered `test` validation uses this command.
- Browser tests use `/repl/tools/bin/chromium`. Evidence is saved under the ignored `generated-artifacts/bookatlas-auth-tests/`.

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
- The previously public administrative routes now require server-verified authorization. Any already published version must be republished to receive this protection.
- The source has two existing frontend type errors involving editorial book fields, and imported Express handlers have implicit-return warnings. Authentication modules type-check; strict typing cleanup of imported code is separate work.
- The original storefront header can overflow narrow mobile screens. The new auth routes are checked at mobile width; a full storefront redesign is separate work.

## Authentication

- Clerk-managed signup, sign-in (email or Google), and custom sign-out controls replace the old email-only registration gate and client-side administrator PIN.
- The storefront `/` remains public. Signed-in users go to `/user-portal`; guests visiting the portal return to the storefront. Auth routes use optional Wouter wildcards to handle verification and OAuth callbacks.
- API requests use same-origin Clerk session cookies. The Clerk proxy is mounted before body parsers. No web client bearer-token plumbing is needed.
- `BOOKATLAS_OWNER_EMAIL` is the explicitly configured owner address (server-only environment setting). On the first verified owner login in each Clerk environment, the server grants `publicMetadata.role=admin` and records a bootstrap marker. A subsequently revoked role is not automatically restored. Reader accounts never choose their role.
- Roles are resolved from Clerk on the server, not from browser storage or client-provided email. Public catalog GETs are allowlisted; subscriber management, catalog changes, operations, and documentation export require admin. AI reading APIs require authenticated membership or admin.
- Reader data, including offline-cache preferences, is browser-local and namespaced by verified Clerk user ID; account switching remounts the reader app. It is not cross-device synchronization.
- Unsubscribe preferences require the matching signed-in account, admin, or a valid signed opt-out link. Public links cannot resubscribe an address. Tokens created with the legacy public default secret are intentionally invalid; newly sent campaigns sign links with the configured secret.
- Automated checks cover anonymous denial, reader/admin policy, verified-owner bootstrap/revocation rules, forged legacy storage, and auth-page rendering. A real signed-in reader/admin UI session has not been browser-verified.
- Republish the app to apply these changes to an already published version.

## Optional configuration

Configure credentials only through Replit Secrets; never put them in frontend code.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: reconnect the existing Supabase project. The original schema is in `artifacts/api-server/src/bookatlas/db/schema.sql`; do not apply it to production without authorization.
- `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`: original text AI provider.
- `GEMINI_API_KEY`: original Gemini-specific features (including speech, grounding, multimodal, and video). Without providers, retain the imported fallbacks and explicit unavailable-feature messages.
- `APP_URL`: actual public app origin for email calls to action and unsubscribe links. Set this before using outbound campaigns; the import's localhost default is not appropriate for emailed links.
- `UNSUBSCRIBE_TOKEN_SECRET`: optional dedicated stable signing secret for unsubscribe tokens; otherwise the managed `SESSION_SECRET` is used.

External AI calls and Supabase persistence cannot be verified until their credentials are configured. Publishing does not automatically copy the external Supabase data into Replit PostgreSQL.
