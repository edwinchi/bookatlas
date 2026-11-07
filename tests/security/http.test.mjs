// Black-box security checks against a running stack (Docker: `docker compose --env-file .env.local up -d`).
// Run with `pnpm test:security`; BASE_URL overrides the default http://localhost:5173.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const get = (path, init) => fetch(base + path, init);

test('web responses carry baseline security headers and no server version', async () => {
  for (const path of ['/', '/sw.js', '/privacy']) {
    const res = await get(path);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(res.headers.get('x-frame-options'), 'DENY', path);
    assert.match(res.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/, path);
    assert.match(res.headers.get('content-security-policy-report-only') ?? '', /default-src 'self'/, path);
    assert.doesNotMatch(res.headers.get('server') ?? '', /\d/, `${path} must not disclose the server version`);
  }
});

test('API responses are hardened and do not advertise the framework', async () => {
  const res = await get('/api/healthz');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.match(res.headers.get('content-security-policy') ?? '', /default-src 'none'/);
});

// 401 when the identity provider is configured; 503 (fail closed) on deployments without its secret key.
const denied = [401, 503];

test('account data endpoints require a verified sign-in', async () => {
  for (const [path, init] of [
    ['/api/account/export'],
    ['/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{"confirm":"DELETE"}' }],
    ['/api/users/register', { method: 'POST' }],
    ['/api/not-a-route', { method: 'POST' }],
  ]) {
    const res = await get(path, init);
    assert.ok(denied.includes(res.status), `${path} answered ${res.status}`);
    assert.doesNotMatch(await res.text(), /@/, `${path} must not return personal data`);
  }
});

test('cross-site and cookie-only mutations are rejected before authentication', async () => {
  const post = headers => get('/api/users/register', { method: 'POST', headers });
  assert.equal((await post({ Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ Cookie: '__session=forged' })).status, 403, 'session cookie without Origin');
  assert.equal((await post({ Cookie: '__session=forged', 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.ok(denied.includes((await post({ Cookie: '__session=forged', 'Sec-Fetch-Site': 'same-origin' })).status), 'same-origin proceeds to authentication');
});

test('abusive request rates are throttled with Retry-After', async () => {
  let throttled;
  for (let i = 0; i < 10 && !throttled; i += 1) {
    const res = await get('/api/account/export');
    if (res.status === 429) throttled = res;
  }
  assert.ok(throttled, 'expected a 429 within 10 export requests');
  assert.ok(Number(throttled.headers.get('retry-after')) > 0);
});
