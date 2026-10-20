---
name: Supabase schema readiness
description: Why metadata readiness checks must use GET rather than HEAD.
---

Validate Supabase REST table/column availability with an explicit GET selection and zero result rows, not a HEAD-only query.

**Why:** HEAD probes returned successful HTTP statuses for absent tables in this project's environment. A GET query correctly reported PostgREST's missing-table error. A successful connection or HEAD response is not proof that the application schema exists.

**How to apply:** Use read-only schema checks before enabling publishing. Never "fix" missing tables by silently switching databases or seeding demonstration subscribers into the connected project.
