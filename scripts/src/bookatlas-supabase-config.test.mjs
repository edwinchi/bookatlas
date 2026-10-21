import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSupabaseConfig } from '../../artifacts/api-server/src/bookatlas/db/config.ts';
import { publishingReadiness } from '../../artifacts/api-server/src/bookatlas/publishing/readiness.ts';

const base = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-old-project-key',
  BOOKATLAS_SUPABASE_KEY_MODE: 'secret',
};

test('switching to secret-key mode never reuses the previous service-role credential', () => {
  const config = resolveSupabaseConfig(base);
  assert.equal(config.isConfigured, false);
  assert.equal(config.key, undefined);
  assert.equal(config.keyVariable, 'SUPABASE_SECRET_KEY');
  const readiness = publishingReadiness(base, []);
  assert.equal(readiness.checks.find(c => c.id === 'database').state, 'missing');
  assert.doesNotMatch(JSON.stringify(readiness), /synthetic-old-project-key/);
});

test('new server-side secret-key mode configures persistence and readiness consistently', () => {
  const env = { ...base, SUPABASE_SECRET_KEY: 'sb_secret_synthetic_test_value' };
  const config = resolveSupabaseConfig(env);
  assert.equal(config.isConfigured, true);
  assert.equal(config.key, env.SUPABASE_SECRET_KEY);
  const readiness = publishingReadiness(env, []);
  assert.equal(readiness.checks.find(c => c.id === 'database').state, 'configured');
  assert.equal(readiness.canPublish, false);
  assert.doesNotMatch(JSON.stringify(readiness), /sb_secret_/);
});

test('publishable keys, invalid modes, invalid URLs and placeholders fail closed', () => {
  for (const override of [
    { SUPABASE_SECRET_KEY: 'sb_publishable_synthetic_test_value' },
    { SUPABASE_SECRET_KEY: 'YOUR_KEY' },
    { BOOKATLAS_SUPABASE_KEY_MODE: 'unexpected', SUPABASE_SECRET_KEY: 'sb_secret_test' },
    { SUPABASE_URL: 'not-a-url', SUPABASE_SECRET_KEY: 'sb_secret_test' },
    { SUPABASE_URL: 'https://example.supabase.co/rest/v1', SUPABASE_SECRET_KEY: 'sb_secret_test' },
  ]) {
    assert.equal(resolveSupabaseConfig({ ...base, ...override }).isConfigured, false);
  }
});

test('explicit legacy mode remains available without an implicit credential crossover', () => {
  const config = resolveSupabaseConfig({ ...base, BOOKATLAS_SUPABASE_KEY_MODE: 'service_role' });
  assert.equal(config.isConfigured, true);
  assert.equal(config.key, base.SUPABASE_SERVICE_ROLE_KEY);
});
