---
name: AI workforce scope
description: User intent and safety boundaries for the Bookatlas AI team.
---

The user requested both an in-app Bookatlas AI team and development specialists
helping build Bookatlas. Preserve all 30 requested role identities. Their MVP
staffing reference totals 10 people; the scale-up reference totals 38 people and
targets 50k+ users. These are human staffing references, not assertions that AI
roles equal human employees or that the app supports that load.

**Why:** The user explicitly selected “Both” when asked where the team should
operate and supplied the roles and staffing counts.

**How to apply:** Distinguish development assistants from shipped model roles.
Keep internal workforce briefs and reports behind administrator authorization,
without adding a public browsing login gate.

The initial in-app workers are report-only, with approval per paid request.
Report approval is not permission to execute code, send messages, spend on ads,
publish, or modify databases. Briefs and reports use private document storage so
this feature does not require changes to the shared Supabase schema.

**Why:** External actions have real consequences, and the user explicitly
requires other projects' database tables and data to remain untouched.

**How to apply:** Adding executable tools or an autonomous scheduler is a
separate capability requiring scoped authorization, spending controls, and an
audit trail. Do not reuse the earlier bounded publishing-test allowance for new
workforce paid tests.
