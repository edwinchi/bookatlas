# Data inventory and retention

Owner: Atlantean Globals Services B.V. (controller). Last reviewed: 2026-11-08 (TASK-0001, D11). The reader-facing summary is the Privacy Notice at `/privacy` ([PrivacyNotice.tsx](../../artifacts/bookatlas/src/components/PrivacyNotice.tsx)); keep the two consistent and bump `PRIVACY_NOTICE_VERSION` in both [account.ts](../../artifacts/api-server/src/bookatlas/account.ts) and [signupConsent.ts](../../artifacts/bookatlas/src/auth/signupConsent.ts) when the notice changes (a unit test checks they match).

> **Status:** the engineering inventory is complete. The notice still needs legal review and a contact address for data-subject requests.

## Personal data held

| Data | Store | Legal basis | Retention | Erased by `DELETE /api/account` |
|---|---|---|---|---|
| Name, email, verification status, password hash, sessions | Clerk (processor) | Contract | Until account deletion | Yes: Clerk user deleted last |
| Sign-up confirmation (age 16+, notice version, time) | Clerk `privateMetadata.bookatlasSignupConsent` | Legal obligation / accountability | Until account deletion | Yes (with the Clerk user) |
| Reader profile: registered, last active, streak, books read | `bookatlas_registered_users` (Supabase) and in-memory | Contract | Until account deletion | Yes |
| Email preference: status, consent time and source, unsubscribe token | `bookatlas_subscribers` | Consent | Until withdrawal or account deletion | Yes |
| Email delivery records: kind, status, timestamps | `bookatlas_publishing_messages` | Consent / accountability | Until account deletion | Yes |
| Automation log lines mentioning a reader | In-memory only (resets on restart) | Legitimate interest | Process lifetime | Yes (scrubbed). New lines store masked emails |
| Request logs (method, path, status; no bodies, no full emails) | Hosting provider logs | Legitimate interest (security) | Hosting provider's log retention | No. Contains no full email address |
| Cart, wishlist, reading progress, reader settings | Reader's browser (`localStorage`) | — | Until the reader clears it | No: never leaves the device |
| Text submitted to AI features | Sent to OpenRouter / Google Gemini at request time | Contract (feature requested) | Not stored by BookAtlas | n/a |

Admin-only data (publishing jobs, workforce tasks, imported CSV audiences) concerns operators or imported contacts rather than reader accounts. Imported subscribers can be removed by administrators in the Subscriber CRM.

## Processors

Clerk (identity), Supabase (database), Vercel (hosting and logs), Resend (email delivery, opted-in readers only), OpenRouter and Google Gemini (AI features), Google Fonts and Unsplash (page assets; they receive visitor IP addresses). Data processing agreements with each processor are a legal task outside this repository.

## Data-subject rights

| Right | How |
|---|---|
| Access, portability | "Privacy & data" → *Download my data* (`GET /api/account/export`, JSON). The unsubscribe capability token is excluded |
| Erasure | "Privacy & data" → *Delete account* (`DELETE /api/account`, typed confirmation). Completes immediately. If the Clerk deletion fails, the API returns 502 and the reader is asked to retry |
| Withdraw marketing consent | "Reading updates" → Opt out, or the link in every email |
| Rectification | Name and email through the Clerk account profile |
| Other requests | Within 30 days via the controller's contact address (**to be added**) |

Administrators cannot delete their own account through self-service, so the platform always keeps an owner. Removing an admin is a manual operator action.

## Known gaps

- Entries in hosting logs written before 2026-11-08 may contain full reader emails. They expire with the provider's log retention.
- Database backups follow Supabase's backup retention; erased rows persist in backups until those expire.
- Google Fonts is loaded from Google's servers; self-hosting would remove that transfer.
