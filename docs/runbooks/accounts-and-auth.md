# Runbook: accounts, sign-in and abuse controls

For operators of BookAtlas. Background: [TASK-0001](../tasks/TASK-0001-user-registration.md), [data inventory](../privacy/data-inventory-and-retention.md).

## Configuration

| Variable | Where | Without it |
|---|---|---|
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` | API runtime | API logs `auth.provider_unconfigured`; public routes work, account routes return 503 |
| `VITE_CLERK_PUBLISHABLE_KEY` | Web build (Docker build arg / Vercel build env) | Clerk derives a host from the domain; the store falls back to guest mode after 6 s |
| `SESSION_SECRET` or `UNSUBSCRIBE_TOKEN_SECRET` | API runtime | API refuses to start (by design) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | API runtime | In-memory seed data; resets on restart |

Local stack: `docker compose --env-file .env.local up -d --build`, then http://localhost:5173. The compose file blanks the Supabase settings so local tests never write to the real project.

## Monitoring

Structured events (pino JSON, field `event`). Reader emails are masked (`s***@domain`).

| Event | Meaning | Metric |
|---|---|---|
| `auth.register` (`created: true/false`) | Profile synced after sign-in | Sign-up rate (`created: true`), active readers |
| `auth.consent_recorded` | Age and privacy confirmation stored | Verification funnel |
| `auth.denied` (`status` 401/403) | Account route without a valid identity | Login failure rate |
| `auth.csrf_blocked` | Cross-site mutation rejected | Attack signal |
| `ratelimit.blocked` | 429 returned | Abuse signal |
| `account.export`, `account.deleted` | Data-rights actions | Compliance reporting |
| `account.delete_failed` (`stage: data` or `identity`) | Erasure incomplete | **Must be followed up** |
| `auth.provider_unconfigured` | Clerk secret missing at boot | Configuration error |

Suggested alerts (configure in the log or monitoring tool):

- `account.delete_failed` count ≥ 1 → page the owner. A reader asked to be erased and it did not complete.
- `auth.denied` above 20% of account requests over 5 minutes → investigate an auth outage or credential stuffing.
- `ratelimit.blocked` above 50 in 5 minutes from one route → possible abuse.
- `auth.provider_unconfigured` at any time in production → sign-in is down.
- Uptime: probe `GET /api/healthz` and `GET /` every minute. The 99.9% monthly budget is 43 minutes.

## Rate limits

Defined in [app.ts](../../artifacts/api-server/src/app.ts), per client IP per minute: register 20, `/api/auth/me` 60, `/api/account` 30, export 5, AI routes 30 each. State is per process, so on Vercel each warm instance has its own budget. That caps bursts but isn't a global quota; use a shared store (e.g. Redis) if a global limit is ever required. The limiter trusts exactly one proxy hop (`trust proxy` = 1). If another proxy is added in front, update that setting or clients will share one IP.

## Content Security Policy rollout

1. Today: `frame-ancestors`, `object-src`, `base-uri` and `form-action` are enforced; the full allowlist is `Content-Security-Policy-Report-Only` in [security-headers.conf](../../docker/security-headers.conf) and [vercel.json](../../vercel.json).
2. With valid Clerk keys, add the instance's Frontend API host (production: `clerk.<your-domain>`) to `script-src` and `connect-src` in both files.
3. Run `pnpm test:browser` and a manual sign-up, sign-in and sign-out. The last browser test fails on any CSP report.
4. With zero reports, rename the header to `Content-Security-Policy` in both files. Roll back by renaming it back.

## Clerk dashboard checklist (D9)

Apply in the Clerk dashboard for development and production instances:

- Email address required; verification by email code required at sign-up.
- Password: minimum length 8 or more; "Reject compromised passwords" on.
- Attack protection: bot protection on; user lockout after repeated failed attempts.
- Multi-factor: allow authenticator app (optional for readers; recommended for admins).
- Legal consent: enable the sign-up consent checkbox, linking `/privacy`, so age and notice acceptance is enforced by Clerk as well as by the app.
- Confirm reset and sign-in errors don't reveal whether an email is registered.

## Deploy and rollback

- Preview: `npx vercel deploy --yes`. Preview environments have no secrets; add `-e SESSION_SECRET=<random>` for a functional preview API.
- Production: `npx vercel --prod --yes`. Level 3: requires the owner's explicit sign-off.
- Verify: `BASE_URL=<url> pnpm test:security` and `BASE_URL=<url> pnpm test:browser`.
- Rollback: Vercel dashboard → Deployments → previous production deployment → *Promote*. No database migrations are involved.

## Handling a failed account deletion

1. Find `account.delete_failed` and its `stage`.
2. `stage: data`: nothing was erased. Ask the reader to retry, or erase manually: delete rows by email from `bookatlas_publishing_messages` (`recipient`), `bookatlas_subscribers` and `bookatlas_registered_users`, then the Clerk user.
3. `stage: identity`: BookAtlas data is already erased. Delete the user in the Clerk dashboard.
4. Confirm completion to the reader within 30 days.
