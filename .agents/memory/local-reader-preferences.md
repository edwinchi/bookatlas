---
name: Local reader preferences
description: Storage boundary for non-sensitive Bookatlas locale and reader display choices.
---

Storefront language/currency and e-reader appearance settings are per-browser preferences. Preserve them across visits without requiring sign-in; they are not shelf, reading-progress, highlight, or account records.

**Why:** The user asked to apply draft changes describing device-local persistence without changing sign-in or reader-data ownership.

**How to apply:** Keep these display preferences in browser storage. Do not silently transfer them to an authenticated account or use them as proof of reader identity. Cross-device synchronization would require an explicit, identity-scoped design.
