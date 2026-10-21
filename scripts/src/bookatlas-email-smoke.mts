import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { database } from '../../artifacts/api-server/src/bookatlas/publishing/jobs.ts';
import { checkResendReadiness } from '../../artifacts/api-server/src/bookatlas/publishing/resend.ts';

// Operator-only, never startup/CI. --send-once requires separate recipient approval.
// An existing record is read-only on every subsequent run, including ambiguous sends.
const require = createRequire(new URL('../../artifacts/api-server/package.json', import.meta.url));
const { ReplitConnectors } = require('@replit/connectors-sdk');
const resend = new ReplitConnectors();
const recipient = (process.env.BOOKATLAS_EMAIL_TEST_RECIPIENTS ?? '').trim().toLowerCase();
let messageId: string | undefined;
let attempted = false;
try {
  if (process.env.BOOKATLAS_EMAIL_MODE !== 'test' ||
      !/^[^\s,@]+@[^\s,@]+\.[^\s,@]+$/.test(recipient)) {
    throw new Error('Exactly one approved inbox and test mode are required.');
  }
  const fixture = await database().from('publishing_jobs').select('id')
    .eq('owner_id', 'synthetic-publishing-verification').eq('is_test', true)
    .eq('status', 'published').order('created_at').limit(1).maybeSingle();
  if (fixture.error || !fixture.data) throw new Error('An isolated completed fixture is required.');
  messageId = createHash('sha256').update(`connection-test:${fixture.data.id}:${recipient}`).digest('hex');
  let result = await database().from('publishing_messages')
    .select('id,status,provider_id').eq('id', messageId).maybeSingle();
  if (result.error) throw new Error('Cannot read durable send record.');
  if (!result.data) {
    if (!process.argv.includes('--send-once')) throw new Error('No send requested.');
    const ready = await checkResendReadiness();
    if (!ready.every(item => item.state === 'verified')) throw new Error('Sender is not verified.');
    const suppression = await resend.proxy('resend', `/suppressions/${encodeURIComponent(recipient)}`, { method: 'GET' });
    if (suppression.status !== 404) throw new Error('Recipient is suppressed or suppression check is unavailable.');
    // Insert directly as sending: the campaign queue must never pick up this test.
    const claim = await database().from('publishing_messages').insert({
      id: messageId, job_id: fixture.data.id, recipient, kind: 'test',
      status: 'sending', attempts: 1, updated_at: new Date().toISOString(),
    });
    if (claim.error) throw new Error('Could not acquire a unique durable send record; nothing sent.');
    attempted = true;
    const response = await resend.proxy('resend', '/emails', {
      method: 'POST',
      headers: { 'Idempotency-Key': `bookatlas-connection-test-${messageId}` },
      body: {
        from: process.env.BOOKATLAS_EMAIL_FROM, to: [recipient],
        subject: 'Bookatlas — connection test (no action required)',
        text: 'This is the single Bookatlas connection-test email you approved.\n\nThis synthetic test checks the configured sender and Resend delivery. No real book has been launched, no reader campaign has been sent, and no action is required.\n\nBook generation, narration, and database persistence were tested separately. This email does not verify production publishing or unsubscribe links.',
      },
    });
    const body = await response.json() as { id?: string };
    const providerId = response.ok && typeof body.id === 'string' ? body.id : null;
    const saved = await database().from('publishing_messages').update({
      provider_id: providerId,
      status: providerId ? 'accepted' : response.status >= 500 || response.ok ? 'unknown' : 'failed',
      error: providerId ? null : `Provider HTTP ${response.status}; do not automatically resend.`,
      updated_at: new Date().toISOString(),
    }).eq('id', messageId).eq('status', 'sending');
    if (saved.error) throw new Error('Could not persist provider outcome; do not resend.');
    console.log(JSON.stringify({ providerAccepted: !!providerId, httpStatus: response.status }));
    if (!providerId) throw new Error('No confirmed provider acceptance; do not resend.');
  }
  result = await database().from('publishing_messages')
    .select('id,status,provider_id').eq('id', messageId).single();
  if (result.error || !result.data?.provider_id) throw new Error('No confirmed provider ID; do not resend.');
  const response = await resend.proxy('resend', `/emails/${encodeURIComponent(result.data.provider_id)}`, { method: 'GET' });
  if (!response.ok) throw new Error('Delivery status unavailable; no resend attempted.');
  const email = await response.json() as { last_event?: string };
  const event = email.last_event?.replace(/^email\./, '');
  const status = ['delivered', 'opened', 'clicked'].includes(event ?? '') ? 'delivered'
    : ['bounced', 'complained', 'failed', 'suppressed'].includes(event ?? '') ? 'failed' : 'accepted';
  const saved = await database().from('publishing_messages').update({
    status, updated_at: new Date().toISOString(),
  }).eq('id', messageId);
  if (saved.error) throw new Error('Provider status could not be persisted.');
  console.log(JSON.stringify({ status, providerEvent: event ?? 'not reported', readerCampaignSent: false }));
} catch {
  if (attempted && messageId) {
    await database().from('publishing_messages').update({
      status: 'unknown', error: 'Connection test interrupted; verify provider outcome, never automatically resend.',
      updated_at: new Date().toISOString(),
    }).eq('id', messageId).eq('status', 'sending');
  }
  console.error('Connection test could not finish. Inspect the durable message/provider status; do not resend. Provider exceptions and credentials are not logged.');
  process.exitCode = 1;
}
