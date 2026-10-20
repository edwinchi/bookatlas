import test from 'node:test';
import assert from 'node:assert/strict';
import { publishingReadiness } from '../../artifacts/api-server/src/bookatlas/publishing/readiness.ts';
import { readSendingDomains, emailReadiness } from '../../artifacts/api-server/src/bookatlas/publishing/resend.ts';

const domain = { id: 'domain-1', name: 'example.test', status: 'verified', capabilities: { sending: 'enabled' } };

test('missing dependencies and even complete configuration cannot enable the legacy publishing engine', () => {
  const missing = publishingReadiness({}, []);
  assert.equal(missing.canPublish, false);
  for (const id of ['text-model', 'speech-model', 'database', 'storage']) {
    assert.equal(missing.checks.find(c => c.id === id).state, 'missing');
  }
  const configured = publishingReadiness({
    GEMINI_API_KEY: 'unit-test-placeholder',
    SUPABASE_URL: 'https://example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'unit-test-placeholder',
    PRIVATE_OBJECT_DIR: '/unit-test/private',
  }, emailReadiness([domain], 'studio@example.test'));
  assert.equal(configured.canPublish, false);
  assert.equal(configured.checks.find(c => c.id === 'pipeline').state, 'blocked');
  assert.equal(configured.checks.find(c => c.id === 'text-model').state, 'configured');
  assert.doesNotMatch(JSON.stringify(configured), /unit-test-placeholder/);
});

test('placeholder provider settings are not reported as configured', () => {
  assert.equal(publishingReadiness({ GEMINI_API_KEY: 'YOUR_KEY' }, []).checks[0].state, 'missing');
});

test('connected email is distinct from sender verification and delivery', () => {
  assert.equal(emailReadiness([domain])[0].state, 'verified');
  assert.equal(emailReadiness([domain])[1].state, 'missing');
  assert.equal(emailReadiness([domain], 'not-an-address')[1].state, 'missing');
  assert.equal(emailReadiness([domain], 'studio@other.test')[1].state, 'blocked');
  assert.equal(emailReadiness([{ ...domain, status: 'pending' }], 'studio@example.test')[1].state, 'blocked');
  assert.equal(emailReadiness([{ ...domain, capabilities: { sending: 'disabled' } }], 'studio@example.test')[1].state, 'blocked');
  assert.equal(emailReadiness([domain], 'studio@EXAMPLE.test')[1].state, 'verified');
  assert.match(emailReadiness([domain], 'studio@example.test')[1].detail, /Delivery has not been tested/);
});

test('provider domain checks only read domains, follow pagination, and do not send mail', async () => {
  const requests = [];
  const domains = await readSendingDomains(async (connector, path, options) => {
    requests.push({ connector, path, options });
    return Response.json({
      data: [{ ...domain, id: `domain-${requests.length}` }],
      has_more: requests.length === 1,
    });
  });
  assert.equal(domains.length, 2);
  assert.equal(requests[1].path, '/domains?limit=100&after=domain-1');
  assert.ok(requests.every(r => r.connector === 'resend' && r.options.method === 'GET' && r.path.startsWith('/domains?')));
});

test('provider errors and invalid responses never become verified readiness', async () => {
  await assert.rejects(readSendingDomains(async () => new Response('', { status: 403 })), /HTTP 403/);
  await assert.rejects(readSendingDomains(async () => Response.json({ data: 'invalid' })), /invalid domain response/);
  await assert.rejects(readSendingDomains(async () => Response.json({ data: [{}] })), /invalid domain metadata/);
  await assert.rejects(readSendingDomains(async () => Response.json({ data: [domain], has_more: true })), /did not advance/);
});
