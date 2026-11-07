# BookAtlas

React/Vite book storefront and Express API, using Clerk for authentication and optional Supabase persistence.

## Local development in VS Code (Windows, macOS, Linux)

1. Install Node.js 24 and pnpm 11.25.0 (`npm install --global pnpm@11.25.0`).
2. Clone this repository, open the folder in VS Code, and run `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local` (PowerShell: `Copy-Item .env.example .env.local`).
4. Set `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to matching **development instance** keys. Never put the secret key in a `VITE_` variable. The launcher forwards the public key to Vite.
5. Run `pnpm dev:local`, or select **Terminal → Run Task → BookAtlas: local development**.
6. Open http://localhost:5173. The local-only Vite proxy forwards `/api` to port 3001 so session cookies and origin checks work on one origin. The API reloads after source changes. Ctrl+C stops both processes. If `SESSION_SECRET` is blank, the launcher generates a temporary signing secret; locally generated email opt-out links then expire on restart. Set a stable random secret to retain them.

Use the VS Code **BookAtlas: debug browser** launch configuration after starting the app. `WEB_PORT` and `API_PORT` can override ports in `.env.local`; adjust the debugger URL if changing the web port.

`pnpm test:unit` runs the offline regression suite without credentials or running services. Pull requests run this suite and the build on Windows and Linux through GitHub Actions.

`pnpm build` typechecks every application and the smoke scripts, then builds all artifacts. `pnpm test:catalog` tests catalog discovery. `node --test scripts/src/auth-navigation.test.mjs` tests authentication routing. The local launcher fails with setup guidance if Clerk keys are absent; it never bypasses authentication.

Without Supabase settings, the API uses seed data and server changes are lost on restart. Checkout remains simulated. AI services require their own provider credentials.

## Run with Docker

`docker compose --env-file .env.local up -d --build` builds the API and web images and serves the app on http://localhost:5173 (nginx proxies `/api` to the API on port 3001). The containers use in-memory seed data, never your Supabase project. http://localhost:5173/__reset clears the browser's site data for this origin.

With the stack running: `pnpm test:security` (headers, CSRF, rate limits), `pnpm test:browser` (Playwright storefront checks) and `pnpm test:perf` (p95 at 50 requests/second). Set `BASE_URL` to test another deployment.

Accounts, privacy and operations: [docs/runbooks/accounts-and-auth.md](docs/runbooks/accounts-and-auth.md) and [docs/privacy/data-inventory-and-retention.md](docs/privacy/data-inventory-and-retention.md).

## Login and logout configuration

Frontend and API must use keys from the same Clerk instance. Outside the local launcher, configure `VITE_CLERK_PUBLISHABLE_KEY` at frontend build time and `CLERK_PUBLISHABLE_KEY` plus `CLERK_SECRET_KEY` on the API. Explicit keys take precedence over hostname-derived defaults. Rebuild the frontend after changing `VITE_` configuration.

For a standard Clerk development instance, leave `VITE_CLERK_PROXY_URL` unset. On production, use the instance's configured domain or correctly configured proxy URL; do not reuse a proxy URL from another deployment. Configure enabled login methods and production domains in the authentication provider. Existing Replit-managed routing remains unchanged.

After deployment, verify in a real browser:

- Sign in with a reader, confirm `/api/auth/me` returns that identity, open the bookshelf, and reload.
- Sign out, confirm the public storefront returns, reload, and verify account APIs reject the signed-out session.
- Cancel login and repeat from checkout; verify the return destination is preserved.
- Verify reader accounts cannot enter `/admin`; use an authorized admin account separately.
- Test a failed sign-out request: the account stays visible and an actionable notice appears.

Automated tests do not substitute for a real signed-in session. Credentials and a provider-configured browser are required for that end-to-end check.

## Replit deployment

See `replit.md` for managed workflows and persistence details. `pnpm dev:local` is specifically for local development; Replit continues to route its managed web/API artifacts. Do not apply SQL schemas or enable billing as part of local setup.
