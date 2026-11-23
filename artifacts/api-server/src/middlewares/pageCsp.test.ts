import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PAGE_CSP } from './pageCsp';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

test('the page CSP is enforced and blocks scripts from other hosts, inline scripts, plugins and framing', () => {
  const script = PAGE_CSP.split('; ').find((d) => d.startsWith('script-src '))!;
  assert.doesNotMatch(script, /'unsafe-inline'|'unsafe-eval'|\*(?!\.)|data:|https:(?!\/\/)/, 'no inline, eval, wildcard host or scheme sources for scripts');
  for (const d of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", 'upgrade-insecure-requests']) {
    assert.ok(PAGE_CSP.split('; ').includes(d), d);
  }
});

test('Vercel and the Docker stack serve exactly the same enforced page CSP', () => {
  const vercel = JSON.parse(readFileSync(`${root}vercel.json`, 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const all = vercel.headers.find((h) => h.source === '/(.*)')!.headers;
  assert.equal(all.find((h) => h.key === 'Content-Security-Policy')?.value, PAGE_CSP);
  assert.equal(all.find((h) => h.key === 'Content-Security-Policy-Report-Only'), undefined, 'no report-only duplicate');
  const docker = readFileSync(`${root}docker/security-headers.conf`, 'utf8');
  assert.ok(docker.includes(`add_header Content-Security-Policy "${PAGE_CSP}" always;`), 'docker/security-headers.conf');
  assert.doesNotMatch(docker, /Report-Only/);
});
