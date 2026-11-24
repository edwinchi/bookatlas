import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MOVE_FLAG, USER_ID_COLUMNS, moveAccount, type MoveDeps, type MoveUser } from './accountMove';
import { BOOKATLAS_TABLES } from '../bookatlas/db/tables';

const schema = readFileSync(fileURLToPath(new URL('../bookatlas/db/schema.sql', import.meta.url)), 'utf8');

test('account move: every column holding a Clerk user id in schema.sql is moved', () => {
  const found: string[] = [];
  for (const m of schema.matchAll(/create table if not exists public\.(\w+) \(([\s\S]*?)\n\);/g)) {
    for (const c of m[2].matchAll(/^\s+(user_id|owner_id|reporter_id) text/gm)) found.push(`${m[1]}.${c[1]}`);
  }
  const moved = USER_ID_COLUMNS.map(([t, c]) => `${BOOKATLAS_TABLES[t]}.${c}`);
  assert.ok(found.length >= 17);
  assert.deepEqual([...found].sort(), [...moved].sort());
});

function fakeDeps(previous?: MoveUser, failOn?: string) {
  const calls = { rekey: [] as string[], metadata: [] as unknown[] };
  const deps: MoveDeps = {
    findPrevious: async () => previous,
    rekey: async (table, column, from, to) => { calls.rekey.push(`${table}.${column}:${from}>${to}`); return table === failOn ? 'boom' : undefined; },
    updateMetadata: async (_id, m) => { calls.metadata.push(m); },
  };
  return { deps, calls };
}
const now = new Date('2026-11-24T12:00:00Z');
const prodUser: MoveUser = { id: 'user_prod', email: 'a@b.nl', publicMetadata: {}, privateMetadata: {} };
const devUser: MoveUser = { id: 'user_dev', email: 'a@b.nl', publicMetadata: { role: 'admin' }, privateMetadata: { bookatlasSignupConsent: { ageConfirmed: true } } };

test('account move: re-keys every table, copies the admin role and consent, and marks the account', async () => {
  const { deps, calls } = fakeDeps(devUser);
  const r = await moveAccount(prodUser, deps, now);
  assert.equal(r.moved, true);
  assert.equal(calls.rekey.length, USER_ID_COLUMNS.length);
  assert.ok(calls.rekey.every((c) => c.endsWith(':user_dev>user_prod')));
  assert.deepEqual(calls.metadata, [{
    publicMetadata: { role: 'admin' },
    privateMetadata: { [MOVE_FLAG]: { from: 'user_dev', at: now.toISOString() }, bookatlasSignupConsent: { ageConfirmed: true } },
  }]);
});

test('account move: a new reader is only marked; a moved account is left alone', async () => {
  const fresh = fakeDeps(undefined);
  assert.equal((await moveAccount(prodUser, fresh.deps, now)).reason, 'no previous account');
  assert.equal(fresh.calls.rekey.length, 0);
  assert.deepEqual(fresh.calls.metadata, [{ privateMetadata: { [MOVE_FLAG]: { from: null, at: now.toISOString() } } }]);

  const done = fakeDeps(devUser);
  assert.equal((await moveAccount({ ...prodUser, privateMetadata: { [MOVE_FLAG]: { from: 'x' } } }, done.deps)).reason, 'done');
  assert.equal(done.calls.rekey.length + done.calls.metadata.length, 0);
});

test('account move: a failed table leaves the account unmarked so the next sign-in retries', async () => {
  const { deps, calls } = fakeDeps(devUser, 'invoices');
  const r = await moveAccount(prodUser, deps, now);
  assert.equal(r.reason, 'failed');
  assert.equal(calls.metadata.length, 0);
});
