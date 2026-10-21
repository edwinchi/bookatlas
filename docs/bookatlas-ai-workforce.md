# Bookatlas AI Team

## Purpose and access

The AI Team is an administrator-only workspace in the existing Bookatlas manager.
Its 30 named roles represent different instructions and review perspectives, not
30 independent employees, deployed services, or credentials. Public readers
cannot access task briefs or worker reports.

The MVP reference preserves the requested 10-person human team. The scale-up
reference preserves the requested 38-person team for a product targeting 50k+
users. Neither reference asserts that the application has been load-tested for
that scale or that an AI role replaces a human role.

## What workers can do

An administrator saves an objective, supporting context, up to five selected
roles, and a task spending cap. Saving does not call the model. Each selected
worker runs only after a separate spending approval. Later workers can consider
the completed reports from earlier workers on the same assignment.

Workers produce reports, content drafts, structured recommendations, test plans,
and suggested relationships. They do not have live browsing, code execution,
database administration, campaign sending, advertising, payment, or deployment
tools. A QA report is not an executed test. A research report is not a verified
live-web search. Approving a report records the administrator's review; it does
not execute the proposed work.

Do not put passwords, API keys, financial account details, or personal reader
records in briefs. Only provide information appropriate to send to the configured
AI provider.

## Persistence and spending

Assignments and their reports are private document bundles in the existing App
Storage, scoped to the authenticated administrator. They survive reloads and
application restarts. No Supabase tables are dropped, reused, or modified for
this feature. This document-based workspace does not offer a relational analytics
index or a durable, automatically scheduled background worker queue.
The first version lists up to 100 assignment documents per administrator; it
returns an explicit capacity error rather than silently hiding additional work.

Concurrent changes use storage generation preconditions. Duplicate assignment
creation uses a stable per-owner identifier; explicit worker identities prevent
duplicate requests from advancing to a different worker.

The server reserves a conservative input/output cost bound before each paid
request and rejects requests exceeding the task cap. Reservations are not
provider invoices. Interrupted or ambiguous requests retain their reservations
and are not automatically retried. The administrator can mark stale interrupted
runs for review without refunding a potentially billed attempt.

## Development specialists

Backend and frontend/UX development specialists helped implement this feature.
These development helpers are separate from the in-app model roles: their source
changes are part of this development session, not tools available to workers in
the shipped application.

## Verification

Focused automated checks cover the complete role catalog, exact human staffing
totals, administrator-only access, explicit spending approval, bounded budgets,
idempotency, account isolation, concurrent run claims, report review, interrupted
runs, and cancellation of late results. A storage-only fixture exercised real
private document creation, duplicate protection, read-back, owner isolation,
generation preconditions, and cancellation without calling an AI provider or
changing Supabase.

Both production bundles build. Public browsing remains accessible and anonymous
requests to every workforce route are rejected. The browser tester could not
obtain an administrator role with its supported synthetic Clerk sign-in. It
found a missing root query provider on the signed-in route, which was corrected;
the signed-in AI Team interface and a real paid worker report remain unverified.
