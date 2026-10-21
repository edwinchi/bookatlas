import { Client } from 'pg';
import { readFile } from 'node:fs/promises';

// Explicit operator-run setup only. Never imported by app startup or Publish.
let client;
let directEndpoint = false;
try {
  const raw = process.env.SUPABASE_DATABASE_URL;
  if (!raw || !process.env.SUPABASE_URL) throw new Error('MISSING_SETUP_CONFIG');
  let uri;
  try { uri = new URL(raw); } catch { throw new Error('INVALID_DATABASE_URI'); }
  if (!['postgres:', 'postgresql:'].includes(uri.protocol) || !uri.username || !uri.password) {
    throw new Error('INVALID_DATABASE_URI');
  }
  const project = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
  const user = decodeURIComponent(uri.username);
  directEndpoint = uri.hostname === `db.${project}.supabase.co`;
  const sameProject =
    (uri.hostname === `db.${project}.supabase.co` && user === 'postgres') ||
    (uri.hostname.endsWith('.pooler.supabase.com') && user === `postgres.${project}`);
  if (!sameProject) {
    throw new Error('DATABASE_TARGET_NOT_CONFIRMED');
  }
  // Do not let connection-string SSL shortcuts override certificate validation.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) uri.searchParams.delete(key);
  client = new Client({
    connectionString: uri.toString(), ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 15_000, statement_timeout: 30_000,
  });
  await client.connect();
  const metadataSql = `select c.oid::text, c.relname, c.relrowsecurity, c.relacl::text
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
    and left(c.relname,10) <> 'bookatlas_' order by c.oid`;
  await client.query('BEGIN');
  const before = JSON.stringify((await client.query(metadataSql)).rows);
  const sql = (await readFile(new URL('./schema.sql', import.meta.url), 'utf8'))
    .replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, '');
  await client.query(sql);
  const after = JSON.stringify((await client.query(metadataSql)).rows);
  if (before !== after) throw new Error('UNRELATED_SCHEMA_CHANGED');
  await client.query('COMMIT');
  const result = await client.query(`select count(*)::int as total,
    bool_and(c.relrowsecurity) as rls_enabled from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and left(c.relname,10)='bookatlas_'`);
  console.log(JSON.stringify({
    setup: 'applied', targetProjectMatched: true, unrelatedTableMetadataUnchanged: true,
    prefixedTables: result.rows[0].total, rowLevelSecurityEnabled: result.rows[0].rls_enabled,
    demoRowsInserted: 0,
  }));
} catch (error) {
  try { await client?.query('ROLLBACK'); } catch {}
  // Connection errors can include sensitive connection details; never print them.
  const safeCodes = new Set(['MISSING_SETUP_CONFIG', 'INVALID_DATABASE_URI', 'DATABASE_TARGET_NOT_CONFIRMED', 'UNRELATED_SCHEMA_CHANGED']);
  console.error(JSON.stringify({
    setup: 'blocked',
    reason: safeCodes.has(error?.message) ? error.message
      : directEndpoint && ['ENOTFOUND', 'EAFNOSUPPORT', 'ENETUNREACH'].includes(error?.code)
        ? 'DIRECT_DATABASE_ENDPOINT_UNREACHABLE_USE_SESSION_POOLER'
        : 'DATABASE_CONNECTION_OR_SETUP_FAILED',
    errorCode: /^[A-Z0-9_]{3,40}$/.test(error?.code ?? '') ? error.code : undefined,
  }));
  process.exitCode = 1;
} finally {
  await client?.end().catch(() => {});
}
