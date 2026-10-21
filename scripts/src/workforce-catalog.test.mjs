import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workforceRoles, workforceTeams, workforcePolicy } from '../../artifacts/api-server/src/bookatlas/workforce/catalog.ts';
import { accessFor, authorizationStatus } from '../../artifacts/api-server/src/auth/policy.ts';
import { CreateWorkforceTaskBody, RunWorkforceWorkerBody } from '../../lib/api-zod/src/generated/api.ts';

test('all 30 requested roles have distinct stable identities and meaningful briefs', () => {
  assert.equal(workforceRoles.length, 30);
  assert.equal(new Set(workforceRoles.map(role => role.id)).size, 30);
  const names = [
    'CEO', 'COO', 'CTO', 'Product', 'UX', 'Frontend', 'Backend', 'Database', 'DevOps',
    'Security', 'Research', 'SEO', 'Content', 'Copywriting', 'Social Media', 'Ads',
    'Email Marketing', 'Sales', 'Customer Success', 'Analytics', 'Knowledge Graph',
    'Documentation', 'QA', 'Bug Triage', 'Release Manager', 'Investor Relations',
    'Compliance', 'Revenue Operations', 'Marketplace', 'Growth',
  ].map(name => `${name} Agent`);
  assert.deepEqual(workforceRoles.map(role => role.name), names);
  for (const role of workforceRoles) {
    assert.ok(role.mandate.length > 20 && role.deliverable.length > 20);
  }
});

test('human team sizing preserves the user-provided MVP and scale-up numbers', () => {
  const [mvp, scale] = workforceTeams;
  assert.equal(mvp.humanHeadcount, 10);
  assert.equal(scale.humanHeadcount, 38);
  assert.deepEqual(mvp.disciplines.map(row => row.count), [1, 1, 2, 2, 1, 1, 1, 1]);
  assert.deepEqual(scale.disciplines.map(row => row.count), [5, 6, 6, 5, 3, 2, 3, 4, 4]);
  for (const team of workforceTeams) {
    assert.equal(team.disciplines.reduce((n, row) => n + row.count, 0), team.humanHeadcount);
    assert.ok(team.workerIds.every(id => workforceRoles.some(role => role.id === id)));
  }
  assert.match(workforcePolicy, /not independent employees/);
  assert.match(workforcePolicy, /no live web research/);
});

test('every workforce read, mutation, and nested report operation is administrator-only', () => {
  const reader = { id: 'synthetic-reader', email: 'reader@example.test', name: 'Reader', role: 'reader' };
  for (const [method, path] of [
    ['GET', '/api/manager/workforce'],
    ['POST', '/api/manager/workforce/tasks'],
    ['POST', '/api/manager/workforce/tasks/task/workers/ceo/run'],
    ['POST', '/api/manager/workforce/tasks/task/review'],
  ]) {
    const access = accessFor(method, path);
    assert.equal(access, 'admin');
    assert.equal(authorizationStatus(access), 401);
    assert.equal(authorizationStatus(access, reader), 403);
  }
  assert.equal(accessFor('GET', '/api/books'), 'public');
});

test('the API contract requires per-worker spending consent and a bounded task budget', () => {
  const input = {
    idempotencyKey: '36dff024-f9af-4163-9881-358791ed1eea',
    objective: 'Review this synthetic Bookatlas MVP brief.',
    workerIds: ['product', 'qa'], budgetUsd: 0.25,
  };
  assert.ok(CreateWorkforceTaskBody.safeParse(input).success);
  for (const budgetUsd of [0, -1, 1.01, Infinity, NaN]) {
    assert.equal(CreateWorkforceTaskBody.safeParse({ ...input, budgetUsd }).success, false);
  }
  assert.equal(CreateWorkforceTaskBody.safeParse({ ...input, workerIds: [] }).success, false);
  assert.equal(CreateWorkforceTaskBody.safeParse({ ...input, workerIds: Array(6).fill('product') }).success, false);
  assert.equal(RunWorkforceWorkerBody.safeParse({ approveSpend: false }).success, false);
  assert.equal(RunWorkforceWorkerBody.safeParse({}).success, false);
  assert.ok(RunWorkforceWorkerBody.safeParse({ approveSpend: true }).success);
});

test('the root query provider includes authenticated routes and never retries paid mutations', () => {
  const source = readFileSync(new URL('../../artifacts/bookatlas/src/main.tsx', import.meta.url), 'utf8');
  assert.match(source, /<QueryClientProvider client=\{queryClient\}>\s*<App\s*\/>\s*<\/QueryClientProvider>/);
  assert.match(source, /mutations:\s*\{\s*retry:\s*false\s*\}/);
});
