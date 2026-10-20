import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOOKATLAS_TABLES, bookatlasTable } from '../../artifacts/api-server/src/bookatlas/db/tables.ts';

test('every allowed persistence table is Bookatlas-prefixed', () => {
  for (const [logical, physical] of Object.entries(BOOKATLAS_TABLES)) {
    assert.equal(bookatlasTable(logical), `bookatlas_${logical}`);
    assert.equal(physical, `bookatlas_${logical}`);
  }
  assert.throws(() => bookatlasTable('orders'), /Unknown/);
  assert.throws(() => bookatlasTable('__proto__'), /Unknown/);
  assert.throws(() => bookatlasTable('bookatlas_books; drop table categories'), /Unknown/);
});

test('setup SQL changes only prefixed tables and inserts no demo records', () => {
  const sql = readFileSync('artifacts/api-server/src/bookatlas/db/schema.sql', 'utf8').replace(/--[^\n]*/g, '');
  const changed = [...sql.matchAll(/(?:create table if not exists|alter table)\s+([\w.]+)/gi)];
  assert.equal(changed.length, 20);
  assert.ok(changed.every(match => match[1].startsWith('public.bookatlas_')));
  assert.doesNotMatch(sql, /\b(?:drop|truncate)\b|\binsert\s+into\b/i);
  assert.match(sql, /^begin;/m);
  assert.match(sql, /^commit;/m);
  for (const table of Object.values(BOOKATLAS_TABLES)) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  const privilegeSection = sql.slice(sql.indexOf('revoke all'));
  const privilegeTables = [...privilegeSection.matchAll(/public\.(\w+)/g)].map(m => m[1]);
  assert.ok(privilegeTables.length >= 16);
  assert.ok(privilegeTables.every(table => Object.values(BOOKATLAS_TABLES).includes(table)));
});

test('legacy repository uses only the scoped database surface', () => {
  const repository = readFileSync('artifacts/api-server/src/bookatlas/db/repository.ts', 'utf8');
  assert.match(repository, /import \{ bookatlasDb as supabase \}/);
  const calls = [...repository.matchAll(/\.from\('([^']+)'\)/g)];
  assert.ok(calls.length >= 15);
  assert.ok(calls.every(call => Object.hasOwn(BOOKATLAS_TABLES, call[1])));
  const server = readFileSync('artifacts/api-server/src/bookatlas/server.ts', 'utf8');
  const startup = server.slice(server.indexOf('export async function createApp'), server.indexOf("app.use(express.json"));
  assert.doesNotMatch(startup, /\bdb\.seed\w+InDb\s*\(/);
});
