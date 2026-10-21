---
name: Shared Supabase isolation
description: Preserve existing shared-project data by using dedicated Bookatlas tables.
---

Use separate Bookatlas tables in the existing Supabase project. Never delete tables or data belonging to already existing projects. Never reuse, rename, migrate, or change access policies on unrelated tables, whether prefixed or unprefixed.

The user explicitly chose to keep the current Supabase project `aklxrbozgnwueswyerfz` after supplying details for `nodzslouearhjsiwhvst`. Supplying another project's connection details alone is not an instruction to switch or transfer data. Changing any connection target does not authorize copying or deleting the previous project's records, and the dedicated-table isolation rule still applies.

**Why:** The user chose “Use separate Bookatlas tables here” after an incompatible existing categories table was discovered, and explicitly reiterated: “do not delete tables for already existing projectes on superbase database please.” The shared database must remain intact.

**How to apply:** All Bookatlas persistence, readiness probes, schema changes, fixtures, and future publishing features must use the dedicated `bookatlas_` namespace. Do not treat matching unprefixed table names as Bookatlas-owned.
