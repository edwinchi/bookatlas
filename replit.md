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
- Storefront browsing, catalog discovery, book details, and public samples remain available to guests. Sign-in is prompted only for account services such as a saved bookshelf, wishlist, preferences, personal AI, and checkout review.
- The administrator workspace is isolated at `/admin`, with server-verified roles and a reader-denial state. Administrator actions and APIs remain unavailable from the storefront.
- Checkout is a demo only: no payment or verified book license is created. Signing in never grants membership; enrollment remains unavailable until verified billing is connected.
- Build typing has been corrected for editorial book fields, Express handler returns, and cross-package smoke-script imports. Run `pnpm build` for the complete check. See `README.md` for the explicit local VS Code launcher.
- The original storefront header can overflow narrow mobile screens. The new auth routes are checked at mobile width; a full storefront redesign is separate work.

## Authentication

- Clerk-managed signup, sign-in (email or Google), and custom sign-out controls replace the old email-only registration gate and client-side administrator PIN.
- The storefront `/` remains public for signed-out and signed-in readers. `/user-portal` is a separate, explicit reader dashboard; `/admin` is the role-guarded administrative workspace. Guests return to the public storefront when they visit the reader dashboard.
- API requests use same-origin Clerk session cookies. The Clerk proxy is mounted before body parsers. No web client bearer-token plumbing is needed.
- `BOOKATLAS_OWNER_EMAIL` is the explicitly configured owner address (server-only environment setting). On the first verified owner login in each Clerk environment, the server grants `publicMetadata.role=admin` and records a bootstrap marker. A subsequently revoked role is not automatically restored. Reader accounts never choose their role.
- Roles are resolved from Clerk on the server, not from browser storage or client-provided email. Public catalog GETs are allowlisted; subscriber management, catalog changes, operations, and documentation export require admin. AI reading APIs require authenticated membership or admin.
- Reader library, wishlist, and preferences use browser-local data namespaced by verified Clerk user ID; they are not cross-device synchronization. A new guest cart uses session-scoped storage and can be merged only after a reader explicitly confirms. Do not import legacy email-only or anonymous browser data.
- Unsubscribe preferences require the matching signed-in account, admin, or a valid signed opt-out link. Public links cannot resubscribe an address. Tokens created with the legacy public default secret are intentionally invalid; newly sent campaigns sign links with the configured secret.
- Unit checks cover same-origin, allowlisted auth return paths and anonymous/reader/admin API policy. A real signed-in reader/admin UI session requires an authenticated test browser and must not be bypassed in preview testing.
- Republish the app to apply these changes to an already published version.

## Optional configuration

Configure credentials only through Replit Secrets; never put them in frontend code.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: reconnect the existing Supabase project. The original schema is in `artifacts/api-server/src/bookatlas/db/schema.sql`; do not apply it to production without authorization.
- `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`: original text AI provider.
- `GEMINI_API_KEY`: original Gemini-specific features (including speech, grounding, multimodal, and video). Without providers, retain the imported fallbacks and explicit unavailable-feature messages.
- `APP_URL`: actual public app origin for email calls to action and unsubscribe links. Set this before using outbound campaigns; the import's localhost default is not appropriate for emailed links.
- `UNSUBSCRIBE_TOKEN_SECRET`: optional dedicated stable signing secret for unsubscribe tokens; otherwise the managed `SESSION_SECRET` is used.

External AI calls and Supabase persistence cannot be verified until their credentials are configured. Publishing does not automatically copy the external Supabase data into Replit PostgreSQL.
