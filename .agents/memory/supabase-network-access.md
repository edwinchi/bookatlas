---
name: Supabase database network access
description: Use the IPv4-compatible session pooler for database administration from this runtime.
---

Use the Supabase session-pooler PostgreSQL URI for schema administration from this environment, not an IPv6-only direct database endpoint.

**Why:** The supplied direct endpoint resolved only to IPv6, and an explicit IPv6 socket attempt failed with `EAFNOSUPPORT`. REST API access worked, but it does not provide schema-administrator access.

**How to apply:** Request the correct pooler URI through the secure secrets flow when needed. Do not guess regional pooler hosts, disable TLS verification, reveal connection strings, or switch database providers to work around connectivity.
