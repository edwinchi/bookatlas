---
name: Legacy reader-data ownership
description: Why old anonymous and email-only browser data must not be adopted automatically by a new authenticated account.
---

Do not automatically assign legacy anonymous or email-only reader data to the first account that signs in.

**Why:** The imported app's registration gate did not prove email ownership and its demo library was shared browser state. On a shared device, the first verified account is not necessarily the owner of that state. Authentication intentionally starts with a separate personal library rather than claiming someone else's data.

**How to apply:** If future work adds migration or cross-device synchronization, require an explicit, authenticated import/reconciliation flow. Do not treat old local administrator or registration records as proof of identity or authority.
