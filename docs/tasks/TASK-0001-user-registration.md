# TASK-0001: User Registration System

| Field | Value |
|---|---|
| Objective | A secure user registration and authentication system |
| Business goal | New users can create accounts and use platform features |
| Priority | High |
| Approval level | **2: human approval required** (authentication and schema changes) |
| Status | **Security review complete. Awaiting human approval.** No auth code has been changed yet. |
| Ready for deployment | No |
| Blockers | Approval decisions A1–A6 (§10); invalid Clerk keys (F9); broken production deploy pipeline (F10) |
| Last updated | 2026-11-07 |

Governance: [agent-governance.md](../governance/agent-governance.md). Lifecycle stages done in this file: understand → analyze → design → threat model → security review → approval request.

---

## 1. Understand: current state

BookAtlas already has registration, built on **Clerk** as the identity provider. The task's assumptions ("PostgreSQL database", "email provider available") are met by Supabase Postgres (accessed over REST) and Clerk's transactional email.

| Capability | Where | How it works today |
|---|---|---|
| Sign-up and sign-in UI | [AuthApp.tsx](../../artifacts/bookatlas/src/auth/AuthApp.tsx) | Clerk `<SignUp>` and `<SignIn>` at `/sign-up` and `/sign-in`, keeping the return-to intent |
| Email verification | [access.ts](../../artifacts/api-server/src/auth/access.ts) `resolveIdentity` | The API treats a user with no **verified** primary email as anonymous, so every account route returns 401 |
| Password reset | Clerk `<SignIn>` "Forgot password" | Run by Clerk; BookAtlas has no reset code of its own |
| Password policy, brute-force and bot protection, MFA | Clerk dashboard | Instance settings. **Unverified:** the keys are invalid (F9) |
| Profile sync | `POST /api/users/register` ([server.ts:650](../../artifacts/api-server/src/bookatlas/server.ts#L650)) | Upserts `bookatlas_registered_users` and the subscriber pool |
| Authorization | [policy.ts](../../artifacts/api-server/src/auth/policy.ts) | An explicit public allowlist; unknown `/api` routes fail closed to `admin` |
| Roles | Clerk `publicMetadata.role` | `reader` or `admin`. A one-time owner bootstrap via `BOOKATLAS_OWNER_EMAIL` requires a verified email |
| CSRF | `access.ts` | Mutations whose `Origin` doesn't match the app host get a 403 |
| Auth outage | `AuthApp.tsx` | Since `a220744`, the public store falls back to guest mode when Clerk fails to load |

**Personas** (refined after reviewing lulu.com, a self-publishing and print-on-demand platform):

- **Reader:** browses, buys, reads and listens.
- **Author or creator:** publishes through the publishing pipeline and receives revenue.
- **Administrator:** catalog, CRM and workforce operations.

Lulu routes authors, businesses and enterprise publishers into separate journeys, and gives the person who receives revenue its own role. BookAtlas has only `reader` and `admin` today. A creator role would be a separate permission-model task (Level 2) and is out of scope here.

## 2. Discover: gaps against the task requirements

| Requirement | Status | Gap |
|---|---|---|
| User sign-up | Met (Clerk) | Can't be exercised locally: the Clerk keys are invalid (F9) |
| Email verification | Met (enforced on the server) | Clerk instance settings unverified |
| Password reset | Probably met (Clerk) | Unverified: requires dashboard access |
| Password policy enforced | Unknown | Clerk dashboard setting; no repo-level evidence |
| User can log in | Met | Same caveat as F9 |
| GDPR compliant | **Not met** | Implicit marketing subscription (F1), no erasure or export (F5), PII in logs (F8), no age gate, no documented retention periods |
| OWASP compliant | **Partial** | No rate limiting (F3), missing security headers (F4), vulnerable dependencies (F2) |
| 99.9% uptime | **Not measurable** | No SLO, uptime probe or alerting. Clerk is a single dependency; the guest fallback limits the impact of an outage |

## 3. Requirements: epic, stories, acceptance criteria

**Epic:** Readers can create, verify, use, and delete a BookAtlas account safely and in line with GDPR and CCPA.

| ID | Story | Acceptance criteria |
|---|---|---|
| US-1 | As a visitor, I can create an account with my email | Given a new email, when I sign up, I get a verification code; until I verify, every account API returns 401 |
| US-2 | As a new reader, I choose whether to receive marketing email | The marketing opt-in is **unchecked by default**; without it, no `subscribed` row is created; consent time and source are recorded |
| US-3 | As a reader, I can log in and my session survives a reload | `/api/auth/me` returns my identity after a reload; sign-out invalidates the session |
| US-4 | As a reader, I can reset a forgotten password | The reset flow responds the same way whether or not the email exists (no account enumeration) |
| US-5 | As a reader, weak or breached passwords are rejected | Minimum length of 8 or more; breached-password check on; the rule is shown in the form |
| US-6 | As a reader, I can export and delete my data | Self-service from the account page; export returns JSON of everything held; deletion completes within **30 days** and is confirmed |
| US-7 | As the operator, abuse is throttled | More than N register or login-adjacent calls per minute per IP or user returns 429 with `Retry-After` |
| US-8 | As a visitor under the minimum age, I can't register | Sign-up requires confirming I'm 16 or older (the GDPR Art. 8 default) |

Edge cases to cover: an unverified email that becomes verified mid-session; registering twice with the same email in different letter case (already lower-cased); a Clerk outage (guest fallback, 503 on account APIs); a user deleted in Clerk but still present in Supabase; the owner bootstrap email registered by someone else (blocked by the verification requirement).

## 4. Design (proposed, needs approval)

**Recommendation A1: keep Clerk as the identity provider.** Don't build the custom `auth-service` and `email-service` sketched in the original task. Clerk already stores password hashes and handles reset tokens, verification email, brute-force protection, bot detection and MFA. Building our own would add a password database and token handling, which means more attack surface and a larger compliance scope for no added user value. The task's three services map to:

- **auth-service:** Clerk plus the `bookatlasAccess` middleware.
- **user-service:** `/api/users/register` and `bookatlas_registered_users`.
- **email-service:** Clerk transactional email.

| # | Change | Files | Level |
|---|---|---|---|
| D1 | Registration stops auto-subscribing. An explicit `marketingConsent` flag is stored with a timestamp and source | `server.ts` register route, `AuthContext.tsx`, sign-up UI | 2 (consent behavior) |
| D2 | Add nullable `consent_marketing_at` and `consent_source` columns to `bookatlas_subscribers` | `db/schema.sql` (additive migration) | 2 (schema) |
| D3 | Self-service `GET /api/account/export` and `DELETE /api/account` (removes the Supabase rows and the Clerk user) | `server.ts`, `policy.ts`, account UI | 2 and 3 (data deletion) |
| D4 | Per-IP and per-user rate limiting on `/api/users/register`, `/api/auth/me` and AI routes | new middleware in `app.ts` | 1 if a dependency is added, otherwise 0 |
| D5 | Security headers: `helmet` on the API, plus CSP, HSTS, `X-Content-Type-Options` and `Referrer-Policy` in `docker/nginx.conf` and the Vercel config; `app.disable('x-powered-by')` | `app.ts`, `docker/nginx.conf` | 1 |
| D6 | Cookie-authenticated mutations must send `Origin` or `Sec-Fetch-Site: same-origin` | `access.ts` | 2 (auth) |
| D7 | Mask reader emails in the automation log and drop `totalRegistered` from the reader response (unused by clients) | `server.ts:670`, `server.ts:684` | 0 |
| D8 | Upgrade vulnerable dependencies (pnpm overrides for `body-parser` and `qs`; evaluate moving `zod` from v3 to v4) | `pnpm-workspace.yaml` | 1 |
| D9 | Clerk dashboard settings: email code verification required, password minimum 8 plus the breached-password check, bot protection, sign-in lockout, optional MFA, enumeration-safe errors | Clerk dashboard (operator) | 3 (security policy) |
| D10 | Age confirmation (16+) and a link to Terms and Privacy on sign-up; honor Global Privacy Control for marketing tracking | sign-up UI | 2 |
| D11 | Document retention: profile kept until deletion; subscriber row purged 30 days after erasure; logs 30 days | `docs/` privacy and data-model doc | 2 (retention) |

Patterns taken from lulu.com's public privacy policy and terms (2026-11-07): self-service deletion under **My Account** that takes effect within 30 days; a 30-day response target for data-rights requests; a minimum age of 16; honoring Global Privacy Control; and explicit retention periods for unused content. Lulu's terms rely on browsewrap acceptance (using the site counts as accepting). We will **not** copy that: D10 asks for affirmative acceptance instead, which is stronger evidence under GDPR.

## 5. Threat model

| Threat (STRIDE) | Vector | Current mitigation | Residual risk | Proposed |
|---|---|---|---|---|
| Brute force (S) | Password guessing | Clerk lockout (unverified) | Unknown until the dashboard is checked | D9 |
| Credential stuffing (S) | Leaked credential lists | Clerk bot protection (unverified) | Medium | D9 breached-password check plus MFA option, D4 |
| Session hijacking (S/E) | Stolen `__session` cookie | Clerk short-lived JWT, HttpOnly cookie, TLS in production | Low | D5 HSTS and CSP (limit XSS-based theft) |
| CSRF (T) | Cross-site POST | Origin check, SameSite cookie | Low: a request without an Origin header gets through | D6 |
| Account enumeration (I) | Sign-up and reset responses | Clerk default messages | Medium until configured | D9 |
| Email abuse (D) | Mass sign-ups triggering verification email | Clerk rate limits | Medium | D9 bot protection, D4 |
| Privilege escalation (E) | Taking over the owner-bootstrap email | Requires a verified email, applied once | Low | Keep; add an audit log entry (exists: `logger.info`) |
| PII disclosure (I) | Logs, `totalRegistered`, CRM | Admin-only routes | Low–medium | D7, D11 |
| Denial of service (D) | Compressed-body and oversized-input bugs in dependencies | None | **High** (published advisories) | D8 |
| Repudiation (R) | Who changed roles or consent | Partial pino logs | Medium | Structured audit events (§8) |

## 6. Security review findings

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| F1 | **High** | Registration silently subscribes every reader to marketing (`status: 'subscribed'`, `source: 'registration_gate'`) without opt-in consent. This breaks GDPR Art. 6/7 and the ePrivacy rules | [server.ts:675-681](../../artifacts/api-server/src/bookatlas/server.ts#L675-L681) |
| F2 | **High** | `pnpm audit --prod`: `body-parser` <2.4.0 (DoS via a compressed body; reached through `@clerk/express` → `express`), `zod` <4.6.6 (memory exhaustion), `qs` ≤6.16.0 (moderate DoS) | `pnpm audit`, 2026-11-07 |
| F3 | Medium | No application-level rate limiting on any API route | `app.ts` |
| F4 | Medium | No security headers on the web tier (CSP, HSTS, X-Frame-Options, `nosniff`); the API sends `X-Powered-By: Express` | `curl -I`, both containers |
| F5 | Medium | No self-service data export or erasure (GDPR Art. 15/17/20, CCPA right to delete) | no route exists |
| F6 | Low | `/api/users/register` returns the platform-wide `totalRegistered` to every reader (unused by the client) | [server.ts:684](../../artifacts/api-server/src/bookatlas/server.ts#L684) |
| F7 | Low | The Origin check is skipped when the header is missing. Modern browsers send it on POST and cookies are SameSite, so exploiting this is unlikely | [access.ts](../../artifacts/api-server/src/auth/access.ts) |
| F8 | Low | Reader email addresses are written in plain text to the automation log | [server.ts:670](../../artifacts/api-server/src/bookatlas/server.ts#L670) |
| F9 | Info, blocks testing | Both Clerk keys in `.env.local` are rejected (`clerk_key_invalid`; the instance `bookatlas.clerk.accounts.dev` doesn't resolve). Sign-in can't be tested, and the Clerk dashboard controls can't be verified | Clerk API, 2026-11-07 |
| F10 | Info, blocks deployment | Vercel production builds fail (`vite build` exit 127) because `vercel.json` was removed in `b1e09cd` (2026-10-20). Production is about 74 days out of date | `vercel --prod` log |

Controls already in place that are working well: authorization fails closed by default; verified email is required server-side; the owner bootstrap is bound to verified email and applied once; the secret key stays server-only; `Cache-Control: no-store` on authenticated responses; HMAC-signed unsubscribe links; tables are prefix-isolated with row-level security enabled; and the guest storefront survives an auth-provider outage.

## 7. Test plan

| Type | Cases |
|---|---|
| Unit | `accessFor` covers the new routes (export and delete are `reader`); consent defaults to false; rate-limiter window and reset; email masking |
| Integration | `POST /api/users/register` with a stubbed identity: without consent, no subscriber row; with consent, timestamp and source are recorded; export contains exactly the user's rows; delete removes them |
| Contract | The register, export and delete response shapes are added to `lib/api-spec/openapi.yaml` and validated with `lib/api-zod` |
| End-to-end | Playwright with Clerk testing tokens: sign up, verify, log in, reload, sign out, reset password, delete the account |
| Security | Unverified email gets 401; foreign `Origin` gets 403; missing `Origin` on a mutation gets 403 (after D6); the 21st request in a minute gets 429; required headers are present; `pnpm audit --prod` shows no high findings |
| Performance | `register` p95 under 300 ms at 50 requests per second against Docker (autocannon); no growth in the memory baseline |
| Regression | `pnpm run typecheck`, `test:unit` (74), `test:e2e` (182), `test:catalog` (3) stay green |

## 8. Monitoring

- **Metrics**, derived from structured pino events `auth.register`, `auth.verify_required`, `auth.denied` and `account.deleted`: sign-up rate, verification rate, login success rate, 429 rate.
- **Alerts:** auth-failure ratio above 20% over 5 minutes; Clerk returning 5xx; verification-email failures (Clerk webhook); any high finding from `pnpm audit` in CI.
- **Uptime:** an external probe of `/api/healthz` and `/` every minute, with a 99.9% monthly SLO budget of 43 minutes.

## 9. Deployment and rollback

- **Prerequisite:** restore the Vercel build configuration (F10) before any production change.
- **Strategy:** rolling (Vercel immutable deployments). The schema change D2 is additive and nullable, so older code keeps working.
- **Rollback:** promote the previous Vercel deployment. D2 needs no down-migration. If needed, D1 can be reverted by restoring the old route, but consent already recorded is kept.

## 10. Approval request

None of the decisions below have been implemented. Each needs your decision:

| # | Decision | Level | Recommendation |
|---|---|---|---|
| A1 | Keep Clerk instead of building custom auth, user and email services | 2 (architecture, auth) | **Approve:** keep Clerk |
| A2 | D1 and D2: opt-in marketing consent plus consent columns | 2 (auth flow, schema) | **Approve:** fixes F1 |
| A3 | D3: self-service export and account deletion (deletes Supabase rows and the Clerk user) | 2 and 3 (data deletion) | **Approve** with a confirmation step and a 30-day completion window |
| A4 | D6 and D10: stricter Origin rule, age gate and Terms acceptance at sign-up | 2 (auth) | **Approve** |
| A5 | D9 and D11: Clerk security settings and the retention policy | 3 (security policy, retention) | **Approve** and apply in the Clerk dashboard (needs valid keys, F9) |
| A6 | D4, D5, D7 and D8: rate limiting, headers, log masking, dependency upgrades | 0 and 1 (notify) | Can proceed now if you approve the plan |

**Next actions:** (1) you decide on A1–A6; (2) you provide valid Clerk development keys (F9); (3) restore the Vercel deploy pipeline (F10, a separate task); (4) implement the approved items with the tests in §7; (5) production deployment only after your explicit Level 3 sign-off.
