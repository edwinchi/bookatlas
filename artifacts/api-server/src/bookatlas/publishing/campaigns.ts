import { createHmac, timingSafeEqual } from 'node:crypto';
import { ReplitConnectors } from '@replit/connectors-sdk';
import type { PublishingJobAction } from '@workspace/api-zod';
import { database, loadJob, PublishingError, type Job } from './jobs.js';
import { checkResendReadiness } from './resend.js';

const resend = new ReplitConnectors();
export function eligibleReader(row: {
  status?: string; is_demo?: boolean; suppressed?: boolean;
  marketing_consent_at?: string | null; marketing_consent_source?: string | null;
} | null | undefined): boolean {
  return !!row && row.status === 'subscribed' && row.is_demo === false && row.suppressed === false &&
    !!row.marketing_consent_at && Number.isFinite(Date.parse(row.marketing_consent_at)) &&
    !!row.marketing_consent_source?.trim();
}
function unsubscribeToken(email: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new PublishingError('Unsubscribe signing is not configured.', 503);
  const payload = Buffer.from(JSON.stringify({ email, purpose: 'marketing-unsubscribe' })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}`;
}
export function unsubscribeEmail(token: string): string {
  if (token.length > 1500 || !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token)) {
    throw new PublishingError('Invalid unsubscribe link.', 403);
  }
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !/^[a-f0-9]{64}$/.test(signature) || !process.env.SESSION_SECRET) {
    throw new PublishingError('Invalid unsubscribe link.', 403);
  }
  const expected = createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new PublishingError('Invalid unsubscribe link.', 403);
  let data: { email: string; purpose: string };
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
  catch { throw new PublishingError('Invalid unsubscribe link.', 403); }
  if (data.purpose !== 'marketing-unsubscribe' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new PublishingError('Invalid unsubscribe link.', 403);
  }
  return data.email;
}

function sendingAllowed(email: string) {
  if (process.env.BOOKATLAS_EMAIL_MODE === 'live') return true;
  const approved = (process.env.BOOKATLAS_EMAIL_TEST_RECIPIENTS ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return approved.includes(email.toLowerCase());
}
async function provider(method: 'GET' | 'POST', path: string, body?: unknown, key?: string) {
  return resend.proxy('resend', path, {
    method, ...(body ? { body } : {}),
    ...(key ? { headers: { 'Idempotency-Key': key } } : {}),
  });
}

export async function queueLaunch(job: Job, input: PublishingJobAction) {
  if (job.is_test || job.status !== 'published') throw new PublishingError('Only a real, reviewed publication can launch campaigns.', 409);
  if (!input.notifyPublisher && !input.readerCampaign) throw new PublishingError('Select a notification or campaign explicitly.');
  const readiness = await checkResendReadiness();
  if (!readiness.every(check => check.state === 'verified')) throw new PublishingError('Resend and the sender domain must be verified before launch.', 503);
  const recipients: { recipient: string; kind: 'reader' | 'publisher' }[] = [];
  if (input.notifyPublisher) {
    if (!input.publisherEmail) throw new PublishingError('A publisher notification address is required.');
    recipients.push({ recipient: input.publisherEmail.toLowerCase(), kind: 'publisher' });
  }
  if (input.readerCampaign) {
    if (process.env.BOOKATLAS_EMAIL_MODE !== 'live') {
      throw new PublishingError('Reader campaigns are blocked in test mode. No live recipient campaign has been authorized.');
    }
    if (!process.env.BOOKATLAS_PUBLIC_URL?.startsWith('https://') || !process.env.SESSION_SECRET) {
      throw new PublishingError('A verified published app URL and unsubscribe signing are required for reader campaigns.', 503);
    }
    const audience = await database().from('subscribers')
      .select('email').eq('status', 'subscribed').eq('is_demo', false).eq('suppressed', false)
      .not('marketing_consent_at', 'is', null).not('marketing_consent_source', 'is', null)
      .order('email').limit(101);
    if (audience.error) throw new PublishingError('Could not verify campaign consent. Nothing was queued.', 503);
    if (audience.data.length > 100) throw new PublishingError('This bounded launch supports at most 100 eligible readers. Use a reviewed bulk-broadcast workflow for a larger audience.');
    recipients.push(...audience.data.map(row => ({ recipient: row.email as string, kind: 'reader' as const })));
  }
  if (!recipients.length) throw new PublishingError('No eligible, explicitly consented recipients were found. No emails were queued.');
  if (recipients.some(row => !sendingAllowed(row.recipient))) throw new PublishingError('Test mode can send only to explicitly approved test inboxes. No messages were queued.');
  const rows = recipients.map(row => ({
    id: createHmac('sha256', job.id).update(`${row.kind}:${row.recipient}`).digest('hex'),
    job_id: job.id, recipient: row.recipient, kind: row.kind, status: 'queued',
  }));
  const result = await database().from('publishing_messages').upsert(rows, {
    onConflict: 'job_id,recipient,kind', ignoreDuplicates: true,
  });
  if (result.error) throw new PublishingError('Could not persist the campaign. No new provider request was started.', 503);
}

export async function refreshDelivery(jobId: string) {
  const rows = await database().from('publishing_messages').select('id,provider_id,status')
    .eq('job_id', jobId).not('provider_id', 'is', null).in('status', ['accepted', 'unknown']);
  if (rows.error) throw new PublishingError('Could not read provider delivery records.', 503);
  for (const row of rows.data) {
    const response = await provider('GET', `/emails/${encodeURIComponent(row.provider_id)}`);
    if (!response.ok) throw new PublishingError('Provider status is currently unavailable. Existing delivery states were not invented.', 503);
    const email = await response.json() as { last_event?: string };
    const event = email.last_event?.replace(/^email\./, '');
    const status = ['delivered', 'opened', 'clicked'].includes(event ?? '') ? 'delivered'
      : ['bounced', 'complained', 'failed', 'suppressed'].includes(event ?? '') ? 'failed' : 'accepted';
    const update = await database().from('publishing_messages').update({
      status, updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    if (update.error) throw new PublishingError('Could not persist provider status.', 503);
  }
}

let dispatching = false;
export async function tickCampaignWorker() {
  if (dispatching) return;
  dispatching = true;
  try {
    // An interrupted send is ambiguous: never automatically send it again.
    await database().from('publishing_messages').update({
      status: 'unknown', error: 'Send interrupted; verify with the provider before any manual retry.',
      updated_at: new Date().toISOString(),
    }).eq('status', 'sending').lt('updated_at', new Date(Date.now() - 10 * 60_000).toISOString());
    const queued = await database().from('publishing_messages').select('*')
      .eq('status', 'queued').order('created_at').limit(1);
    if (queued.error || !queued.data.length) return;
    const message = queued.data[0]!;
    const claim = await database().from('publishing_messages').update({
      status: 'sending', attempts: message.attempts + 1, updated_at: new Date().toISOString(),
    }).eq('id', message.id).eq('status', 'queued').select('id');
    if (claim.error || !claim.data?.length) return;
    let status = 'failed';
    let error: string | null = null;
    let providerId: string | null = null;
    try {
      const job = await loadJob(message.job_id);
      if (job.is_test || job.status !== 'published' || !sendingAllowed(message.recipient)) {
        throw new PublishingError('Sending is not authorized for this publication or recipient.');
      }
      if (message.kind === 'reader') {
        const consent = await database().from('subscribers')
          .select('status,is_demo,suppressed,marketing_consent_at,marketing_consent_source').eq('email', message.recipient).maybeSingle();
        if (consent.error || !eligibleReader(consent.data)) {
          throw new PublishingError('Recipient is no longer eligible for marketing.');
        }
      }
      const suppression = await provider('GET', `/suppressions/${encodeURIComponent(message.recipient)}`);
      if (suppression.ok) { status = 'suppressed'; throw new PublishingError('Provider reports this recipient as suppressed.'); }
      if (suppression.status !== 404) throw new PublishingError('Provider suppression checks are unavailable.');
      let text = `New Bookatlas publication: ${job.data.config.title}\nBy ${job.data.config.author}\n`;
      if (process.env.BOOKATLAS_PUBLIC_URL) text += `\nBrowse: ${process.env.BOOKATLAS_PUBLIC_URL}\n`;
      const headers: Record<string, string> = {};
      if (message.kind === 'reader') {
        const link = `${process.env.BOOKATLAS_PUBLIC_URL!.replace(/\/$/, '')}/api/reader-unsubscribe?token=${unsubscribeToken(message.recipient)}`;
        text += `\nYou opted in to Bookatlas reading updates. Unsubscribe: ${link}\n`;
        headers['List-Unsubscribe'] = `<${link}>`;
      }
      // A timeout after this point is ambiguous and may already have sent.
      status = 'unknown';
      const sent = await provider('POST', '/emails', {
        from: process.env.BOOKATLAS_EMAIL_FROM, to: [message.recipient],
        subject: `New publication: ${job.data.config.title}`, text, headers,
      }, `bookatlas-${message.id}`);
      if (!sent.ok) {
        status = sent.status >= 500 || sent.status === 429 ? 'unknown' : 'failed';
        throw new PublishingError('Provider did not confirm acceptance. Delivery is not claimed.');
      }
      const body = await sent.json() as { id?: string };
      if (!body.id) throw new PublishingError('Provider returned no message identifier.');
      providerId = body.id;
      status = 'accepted';
    } catch (failure) {
      error = failure instanceof PublishingError ? failure.message : 'Provider operation failed or its outcome is unknown. No delivery is claimed.';
    }
    await database().from('publishing_messages').update({
      status, error, provider_id: providerId, updated_at: new Date().toISOString(),
    }).eq('id', message.id).eq('status', 'sending');
  } finally { dispatching = false; }
}
