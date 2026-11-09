# TASK-0001: User Registration System

| Field | Value |
|---|---|
| Objective | A secure user registration and authentication system |
| Business goal | New users can create accounts and use platform features |
| Priority | High |
| Approval level | **2: human approval required** (authentication and schema changes). Approved 2026-11-07 (A1–A6, "yes on all") |
| Status | **Implemented and verified** on Docker and on a Vercel preview. Two items blocked on credentials (§12) |
| Ready for deployment | **Deployed to production 2026-11-08** (`bookatlas-i8haeazop`, aliases bookatlas-station9x / bookatlas-gamma) after Level 3 sign-off. Production runs guest-only until Clerk keys are added. Without valid Clerk keys, production runs guest-only: the store works and sign-in shows as unavailable |
| Blockers | Clerk keys on Vercel (Level 3) and the D9 dashboard checklist. Local signed-in journey passes (2026-11-09) |
| Last updated | 2026-11-09 |

Governance: [agent-governance.md](../governance/agent-governance.md). Lifecycle: understand → analyze → design → threat model → security review → **approval (granted)** → implement → test → validate → document → *deploy (awaiting sign-off)*.

Related: [data inventory and retention](../privacy/data-inventory-and-retention.md), [accounts and auth runbook](../runbooks/accounts-and-auth.md).

---

## 1. Understand: current state

BookAtlas already has registration, built on **Clerk** as the identity provider. The task's assumptions ("PostgreSQL database", "email provider available") are met by Supabase Postgres (accessed over REST) and Clerk's transactional email.

| Capability | Where | How it works |
|---|---|---|
| Sign-up and sign-in UI | [AuthApp.tsx](../../artifacts/bookatlas/src/auth/AuthApp.tsx) | Clerk `<SignUp>` and `<SignIn>`. Sign-up is now preceded by an age and privacy-notice confirmation |
| Email verification | [access.ts](../../artifacts/api-server/src/auth/access.ts) `resolveIdentity` | A user with no verified primary email is treated as anonymous, so account routes return 401 |
| Password reset | Clerk `<SignIn>` "Forgot password" | Handled by Clerk |
| Password policy, brute force, bot protection, MFA | Clerk dashboard | Instance settings; **blocked** (F9 → D9) |
| Profile sync | `POST /api/users/register` | Creates or updates `bookatlas_registered_users`. **No longer subscribes readers to marketing** |
| Marketing consent | `POST /api/account/reading-updates` (already existed) | Explicit opt-in that records `marketing_consent_at` and `marketing_consent_source`. Campaign sends require it ([campaigns.ts](../../artifacts/api-server/src/bookatlas/publishing/campaigns.ts)) |
| Data rights | [account.ts](../../artifacts/api-server/src/bookatlas/account.ts) | **New:** `GET /api/account/export` and `DELETE /api/account`, plus the "Privacy & data" panel |
| Authorization | [policy.ts](../../artifacts/api-server/src/auth/policy.ts) | Explicit allowlist; unknown routes fail closed. **New:** cookie-scoped CSRF rule |
| Auth outage | `AuthApp.tsx`, `app.ts` | Guest storefront if Clerk errors **or doesn't load within 6 s**. The API serves public routes and fails closed (503) when `CLERK_SECRET_KEY` is missing |

**Personas:** reader; author or creator; administrator. A separate creator role, as on lulu.com, would be a permission-model change and is out of scope.

## 2. Discover: gaps against the requirements

| Requirement | Before | Now |
|---|---|---|
| User sign-up | Met (Clerk) | Met, plus an age and privacy confirmation |
| Email verification | Enforced on the server | Unchanged. Clerk instance setting unverified (D9) |
| Password reset | Clerk | Unchanged. Unverified (D9) |
| Password policy enforced | Unknown | **Blocked:** Clerk dashboard (D9) |
| User can log in | Met | Met. Can't be tested end-to-end until the Clerk keys are fixed |
| GDPR compliant | Not met | **Met in code:** consent separated, export and erasure, PII masked in logs, age gate, privacy notice, retention documented. Contact details published 2026-11-08; legal review is still pending (§12) |
| OWASP compliant | Partial | **Met for the reviewed scope:** rate limiting, headers, CSRF, no vulnerable dependencies (`pnpm audit` clean) |
| 99.9% uptime | Not measurable | Health endpoint, structured events and alert rules documented in the runbook. The external probe is an operator setup step (§12) |

## 3. Requirements: stories and acceptance criteria

| ID | Story | Acceptance criteria | Status | Evidence |
|---|---|---|---|---|
| US-1 | Create an account with email | Verification required; unverified gets 401 | Met (Clerk + server gate) | `policy.test.ts`; signed-in end-to-end test blocked (F9) |
| US-2 | Choose marketing email | Opt-in unchecked by default; registration creates no subscription; consent time and source recorded | **Done** | `account.test.ts` "registration creates the reader profile without subscribing…" |
| US-3 | Log in; session survives reload | `/api/auth/me` after reload | Existing; signed-in end-to-end test blocked (F9) | — |
| US-4 | Reset password without enumeration | Same response either way | Blocked (D9 dashboard setting) | — |
| US-5 | Weak or breached passwords rejected | Minimum length and breached-password check | Blocked (D9) | — |
| US-6 | Export and delete my data | JSON export; deletion within 30 days | **Done:** deletion is immediate | `account.test.ts` export and deletion tests; `test:security` |
| US-7 | Abuse is throttled | 429 with `Retry-After` | **Done** | `rateLimit.test.ts`; `test:security` on Docker and the Vercel preview |
| US-8 | Under-16s cannot register | Age confirmation required | **Done** (client gate plus server record). Hard enforcement through Clerk "legal consent" is part of D9 | `signupConsent.test.ts`, `account.test.ts`, `test:browser` |

## 4. Design and delivery

**A1, keep Clerk, was approved.** The services in the original task map to: auth-service = Clerk plus `bookatlasAccess`; user-service = `/api/users/register` plus `bookatlas_registered_users`; email-service = Clerk transactional email (and Resend for opted-in campaigns).

| # | Change | Status | Implementation |
|---|---|---|---|
| D1 | Registration stops auto-subscribing | **Done** | `server.ts` register route. Consent stays with the existing reading-updates opt-in |
| D2 | Consent columns | **Already existed.** No change needed | `schema.sql:76-79` already has `marketing_consent_at`, `marketing_consent_source`, `is_demo`, `suppressed`. The 2026-11-07 review overstated this gap |
| D3 | Self-service export and deletion | **Done** | `account.ts`, `AccountPrivacy.tsx`. Deletion removes profile, subscriber and delivery rows and scrubs the in-memory log, then deletes the Clerk user. Admins get 409. A failed Clerk deletion returns 502 and is never hidden |
| D4 | Rate limiting | **Done** (no new dependency) | `middlewares/rateLimit.ts`. Per IP, before identity resolution; `trust proxy` set to 1 |
| D5 | Security headers | **Done** | `securityHeaders.ts` (API), `docker/security-headers.conf`, `vercel.json`. Enforced CSP: `frame-ancestors`, `object-src`, `base-uri`, `form-action`. The full allowlist is **report-only** until signed-in flows are observed (runbook §CSP) |
| D6 | CSRF rule | **Done, refined** | `isCrossSiteMutation`. Only requests carrying a session cookie need `Origin` or `Sec-Fetch-Site: same-origin`. Signed-token unsubscribe is exempt, because mail providers send one-click unsubscribe POSTs without an `Origin` header |
| D7 | Mask PII in logs; drop `totalRegistered` | **Done** | `maskEmail` in all five reader-email log sites; structured `pino` events |
| D8 | Vulnerable dependencies | **Done** | zod 3.25.76 → 4.6.7 (no patched 3.x exists), `body-parser` 2.4.0, `qs` 6.17.1. Orval regenerated for Zod 4. `pnpm audit --prod`: no known vulnerabilities |
| D9 | Clerk dashboard settings | **Blocked** | Needs valid keys and dashboard access. Checklist in the runbook |
| D10 | Age gate, privacy acceptance, GPC | **Done** | Sign-up confirmation step; recorded in Clerk `privateMetadata.bookatlasSignupConsent` (no schema change). No trackers exist, so Global Privacy Control needs no extra handling (stated in the notice) |
| D11 | Retention policy | **Done** (legal review pending) | [data-inventory-and-retention.md](../privacy/data-inventory-and-retention.md), the `/privacy` notice (v2026-11-08, with contact details) and the `/legal` notice |

Also delivered, outside the original design but required by findings during the work:

- **F10, Vercel pipeline restored:** `vercel.json`, an `api/index.mjs` function and a `dist/app.mjs` build entry.
- **Resilience:** with no Clerk keys, the store previously hung on "Loading your Bookatlas account…". Clerk retries an unreachable script for about 15 s, so the guest fallback now also triggers after a 6 s load timeout. The API no longer returns 500 on every route when `CLERK_SECRET_KEY` is missing.
- **CSP-safe service-worker registration:** `public/register-sw.js` replaces an inline script.
- **OpenAPI contract** for register, export and delete; generated Zod validators and React hooks are used on both sides.

## 5. Threat model

| Threat (STRIDE) | Mitigation now | Residual risk |
|---|---|---|
| Brute force, credential stuffing (S) | Per-IP rate limits on auth-adjacent routes; Clerk lockout and bot protection (D9 pending) | Medium until D9 |
| Session hijacking (S/E) | HttpOnly Clerk cookie; HSTS on Vercel and the API over TLS; enforced `frame-ancestors`; report-only CSP | Low |
| CSRF (T) | Cookie-scoped Origin / `Sec-Fetch-Site` rule; SameSite cookies | Low |
| Account enumeration (I) | Clerk defaults | Medium until D9 |
| Email abuse (D) | Rate limits; marketing requires explicit consent | Low–medium until D9 |
| Privilege escalation (E) | Owner bootstrap needs a verified email and applies once; admins cannot self-delete | Low |
| PII disclosure (I) | Masked logs; export omits the unsubscribe capability token; `no-store` on account responses | Low |
| Denial of service (D) | Patched `body-parser`, `qs` and `zod`; rate limits | Low. Per-instance limiter state (runbook) |
| Repudiation (R) | Structured events: `auth.register`, `auth.consent_recorded`, `auth.denied`, `auth.csrf_blocked`, `ratelimit.blocked`, `account.export`, `account.deleted`, `account.delete_failed` | Low |

## 6. Security review findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| F1 | High | Registration auto-subscribed readers to marketing | **Fixed** (D1) |
| F2 | High | Vulnerable `body-parser`, `zod`, `qs` | **Fixed** (D8): audit clean |
| F3 | Medium | No rate limiting | **Fixed** (D4) |
| F4 | Medium | No security headers; `X-Powered-By` | **Fixed** (D5). Full CSP enforcement is a follow-up |
| F5 | Medium | No export or erasure | **Fixed** (D3) |
| F6 | Low | `totalRegistered` disclosed | **Fixed** (D7) |
| F7 | Low | Origin check skipped without the header | **Fixed** (D6) |
| F8 | Low | Reader emails in logs | **Fixed** (D7). Entries logged before this change remain until rotated |
| F9 | Info | Clerk keys invalid | **Fixed locally 2026-11-09:** development instance `hardy-oyster-3653` keys in `.env.local`, validated against Clerk. Vercel still has no Clerk keys (Level 3: credentialed integration) |
| F10 | Info | Vercel production builds failing | **Fixed:** the preview builds and serves |
| F11 | Info (new) | Pages load Google Fonts, which sends visitor IPs to Google | **Disclosed** in the notice; self-hosting the fonts recommended (§12) |
| F13 | Medium (new) | Docker nginx forwarded `Host` without the port, so the API's origin check rejected every signed-in change locally (`auth.csrf_blocked` on `POST /api/users/register`) | **Fixed 2026-11-09:** `proxy_set_header Host $http_host`. Vercel was not affected |
| F14 | Info (new) | Clerk bot protection loads from `*.protect.clerk.com` and probes it on non-standard ports; the CSP allowlist lacked it | **Fixed 2026-11-09** in both CSP files (`https://*.protect.clerk.com:*`) |
| F12 | Info (new) | API capacity under Docker Desktop on Windows is about 100–150 requests/s per process (Express + Clerk middleware, ~3–7 ms CPU per request) | Documented. Production on Vercel scales across instances; cold starts take about 1 s |

## 7. Test results (2026-11-08)

| Type | Command | Result |
|---|---|---|
| Typecheck | `pnpm run typecheck` | Pass |
| Unit + integration | `pnpm test:unit` | **88/88** (74 existing + 14 new: policy, CSRF, rate limiter, account flows with the real `createApp()`, sign-up consent) |
| Contract | inside `account.test.ts` | Register, export and delete responses validated against the generated OpenAPI Zod schemas |
| End-to-end (offline) | `pnpm test:e2e` | **182/182** |
| Catalog | `pnpm test:catalog` | 3/3 |
| Security (HTTP, black box) | `pnpm test:security` | **5/5** on Docker **and** on the Vercel preview |
| Browser | `pnpm test:browser` | **9/9** on Docker. **8/9** on preview `bookatlas-jyurxd1wc` (with the Legal Notice test): the one failure is a report-only CSP entry for the Clerk host derived when no publishable key is configured (F9) |
| Performance | `pnpm test:perf` | Pass: p95 ≤ 115 ms at 50 requests/s (Docker). Preview, warm, at 20 requests/s: p95 ≤ 295 ms including a ~280 ms network round trip |
| Dependencies | `pnpm audit --prod` | No known vulnerabilities |
| Build | `pnpm run build` | Pass |
| Signed-in end-to-end (sign up, verify, log in, reset, delete) | — | **Blocked** on valid Clerk keys (F9) |

**2026-11-09: everything in Docker.** `docker compose --env-file .env.local --profile test run --rm --build tests` runs every stage inside a Playwright container that shares the web container's network (`scripts/test-all.mjs`): typecheck, unit 93/93, e2e 182/182, catalog 3/3, security 5/5, browser 12/12 (new: the app shell and catalog load from the service worker cache with the network off), click-through sweep 48/48, performance p95 ≤ 45 ms at 50 requests/s. Fixed for a clean install: the e2e helper resolved `express` from a stray root copy; it now loads it from the API package. The signed-in journey is written (`pnpm test:account`: sign up with the age gate and Clerk test code, bookshelf, data export, sign out, sign in, delete, CSP clean) and failed at its first step until F9 was resolved: Clerk answered `host_invalid` for the publishable key and `clerk_key_invalid` for the secret key in `.env.local`.

**2026-11-09, with a real Clerk development instance:** the signed-in journey passes **7/7** (sign up with age gate and test code, bookshelf, data export, sign out and back in, delete, no CSP reports from the app's own page). It uses a Clerk testing token (`@clerk/testing`, dev dependency) to pass bot protection. API logs show `auth.consent_recorded`, `auth.register created:true`, `account.export` and `account.deleted` with masked emails. It found F13 and F14.

## 8. Monitoring

Events, alert rules and the uptime probe are defined in the [runbook](../runbooks/accounts-and-auth.md#monitoring). Creating the external uptime monitor and the log-based alerts in the hosting dashboard is an operator step (§12).

## 9. Deployment and rollback

- **Pipeline:** `vercel.json` (monorepo build, `api/index.mjs` function, headers). Verified with preview `bookatlas-1q6hcurb0-station9x.vercel.app`.
- **Production prerequisites:** a signing secret is set (`UNSUBSCRIBE_TOKEN_SECRET` exists in Production). Without Clerk keys, production runs guest-only.
- **Strategy:** Vercel immutable deployments. No database migration is required.
- **Rollback:** promote the previous deployment in the Vercel dashboard (or `vercel promote <url>`).

## 10. Approvals

| # | Decision | Level | Decision |
|---|---|---|---|
| A1 | Keep Clerk | 2 | Approved 2026-11-07 |
| A2 | Opt-in consent (no schema change was needed) | 2 | Approved |
| A3 | Self-service export and deletion | 2 and 3 | Approved |
| A4 | CSRF rule, age gate, privacy acceptance | 2 | Approved |
| A5 | Clerk security settings, retention policy | 3 | Approved; Clerk part blocked (F9) |
| A6 | Rate limiting, headers, log masking, dependencies | 0 and 1 | Approved |
| — | Restore the Vercel pipeline | 1 | Approved |
| — | **Production deployment** | **3** | **Approved 2026-11-08** by the owner; deployed the same day. Security 5/5 and browser 8/9 (known CSP report, F9) on production |

## 11. Lessons learned

- Read the existing schema and routes before proposing schema changes: D2 already existed.
- A blanket "missing Origin means 403" rule would have broken mail providers' one-click unsubscribe and every non-browser client. Scoping CSRF checks to requests that carry ambient credentials is the precise rule.
- Load tests must model arrivals (open loop at a target rate). Closed-loop concurrency measures queueing at saturation, not the latency users see.
- Missing identity-provider configuration must degrade to guest mode, not to a blank page or HTTP 500s.

## 12. Remaining work

| Item | Owner | Why it is open |
|---|---|---|
| Create a Clerk development instance and put its keys in `.env.local`; add production keys to Vercel | You | F9: requires your Clerk account |
| Apply the D9 Clerk dashboard checklist (runbook) | You, or agent with dashboard access | `pnpm test:account` passes locally (2026-11-09) |
| Roll the development secret key (it was pasted into a chat) and update `.env.local` | You | Hygiene; development instance only |
| Legal review of the Privacy Notice and Legal Notice; supply the full street address and VAT number | You or counsel | Contact details and KvK 89423496 added 2026-11-08; legal form corrected from "B.V." to the registered name. Other in-app copy still says "B.V."/Amsterdam (admin reports, AI persona, PDF exports) |
| Enforce the full CSP after observing signed-in flows; add the production Clerk domain | Agent | Runbook §CSP |
| Self-host Google Fonts (F11) | Agent | Small follow-up |
| Uptime probe and log alerts in the hosting dashboard | Operator | Requires dashboard access |
