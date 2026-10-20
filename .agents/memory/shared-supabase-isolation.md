---
name: Shared Supabase isolation
description: Preserve existing shared-project data by using dedicated Bookatlas tables.
---

Use separate Bookatlas tables in the existing Supabase project. Never reuse, rename, migrate, or change access policies on unrelated unprefixed tables.

**Why:** The user chose “Use separate Bookatlas tables here” after an incompatible existing categories table was discovered. The shared database must remain intact.

**How to apply:** All Bookatlas persistence, readiness probes, schema changes, fixtures, and future publishing features must use the dedicated `bookatlas_` namespace. Do not treat matching unprefixed table names as Bookatlas-owned.
