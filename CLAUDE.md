# BookAtlas: agent instructions

Follow the governance documents in `docs/governance/`:

- [agent-governance.md](docs/governance/agent-governance.md): operating contract, mandatory controls, approval levels, task register
- [master-system-prompt.md](docs/governance/master-system-prompt.md): lifecycle, definition of done, the 15 directives
- [master-coding-directives.md](docs/governance/master-coding-directives.md): engineering directives

## Rules that change behavior

- Lifecycle for every task: understand → analyze → design → threat model → implement → test → validate → document → deploy → monitor → improve. Code that compiles is not finished.
- Approval levels:
  - **0** Proceed: refactors, docs, tests, bug fixes, monitoring.
  - **1** Notify, then proceed: dependencies, CI/CD, infrastructure, indexes. Include the change summary, expected impact and rollback plan.
  - **2** Stop for approval: schema, architecture, auth, payments, retention, permissions.
  - **3** Explicit sign-off: **production deployment (`vercel --prod`)**, destructive operations, data deletion, security policy, credentialed external integrations.
- Tasks live in `docs/tasks/TASK-XXXX-*.md`. Record findings, decisions, blockers and status there.
- Never commit secrets. `.env`, `.env.local` and `.vercel/` stay uncommitted.

## Commands

- `pnpm run typecheck`, `pnpm test:unit`, `pnpm test:e2e`, `pnpm test:catalog`, `pnpm audit --prod`
- Against a running stack (`BASE_URL`, default http://localhost:5173): `pnpm test:security`, `pnpm test:browser`, `pnpm test:perf`
- After changing `lib/api-spec/openapi.yaml`: `pnpm --filter ./lib/api-spec run codegen`
- Preview deploy: `npx vercel deploy --yes -e SESSION_SECRET=<random>`. Production deploy is Level 3. See `docs/runbooks/accounts-and-auth.md`
- Local stack: `docker compose --env-file .env.local up -d --build`, then open http://localhost:5173. The API runs on in-memory seed data. http://localhost:5173/__reset clears the browser's site data.
