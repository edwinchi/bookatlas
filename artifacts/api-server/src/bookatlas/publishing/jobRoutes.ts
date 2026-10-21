import type { Express, Request, Response } from 'express';
import type { Book } from '@workspace/bookatlas-catalog/types';
import { CreatePublishingJobBody, ActOnPublishingJobBody, SetReadingUpdatePreferenceBody } from '@workspace/api-zod';
import { randomUUID } from 'node:crypto';
import { database, loadJob, viewJob, updateJob, PublishingError, type Job } from './jobs.js';
import { createQueuedJob, startPublishingWorker } from './worker.js';
import { publishJob } from './publication.js';
import { queueLaunch, refreshDelivery, tickCampaignWorker, unsubscribeEmail } from './campaigns.js';
import { readAsset } from './storage.js';
import { probePublishingProviders } from './providers.js';
import { logger } from '../../lib/logger.js';

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try { await handler(req, res); }
    catch (error) {
      res.status(error instanceof PublishingError ? error.status : 503).json({
        error: error instanceof PublishingError ? error.message : 'Publishing operation failed safely. No completion or delivery is claimed.',
      });
    }
  };
}
function id(req: Request) {
  const value = String(req.params.id);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new PublishingError('Invalid publishing job identifier.');
  }
  return value;
}
async function readerJob(req: Request) {
  const job = await loadJob(id(req));
  if (job.is_test || job.status !== 'published') throw new PublishingError('This publication is not available to readers.', 403);
  const published = await database().from('books').select('id,price').eq('id', job.id).maybeSingle();
  if (published.error) throw new PublishingError('Publication access could not be checked.', 503);
  if (!published.data || Number(published.data.price) !== 0) throw new PublishingError('No free publication access is available.', 403);
  return job;
}
async function assetResponse(job: Job, asset: string, res: Response) {
  const audio = /^chapter-([1-9]\d*)\.wav$/.exec(asset);
  if (!(asset === 'book.epub' && job.data.progress.epub) &&
      !(audio && Number(audio[1]) <= job.data.progress.audio)) throw new PublishingError('Completed asset not found.', 404);
  const bytes = await readAsset(job.id, asset);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `${audio ? 'inline' : 'attachment'}; filename="${asset}"`);
  res.type(audio ? 'audio/wav' : 'application/epub+zip').send(bytes);
}

export function mountPublishingJobs(app: Express, onPublished: (book: Book) => void) {
  app.get('/api/account/reading-updates', guarded(async (req, res) => {
    const result = await database().from('subscribers')
      .select('status,is_demo,suppressed,marketing_consent_at,marketing_consent_source')
      .eq('email', req.bookatlasIdentity!.email.toLowerCase()).maybeSingle();
    if (result.error) throw new PublishingError('Could not load your email preference.', 503);
    const row = result.data;
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ subscribed: !!(row && row.status === 'subscribed' && !row.is_demo && !row.suppressed &&
      row.marketing_consent_at && row.marketing_consent_source), consentAt: row?.marketing_consent_at ?? null });
  }));
  app.post('/api/account/reading-updates', guarded(async (req, res) => {
    const parsed = SetReadingUpdatePreferenceBody.safeParse(req.body);
    if (!parsed.success) throw new PublishingError('Select an explicit email preference.');
    const identity = req.bookatlasIdentity!;
    const email = identity.email.toLowerCase();
    const previous = await database().from('subscribers').select('status,bounce_reason').eq('email', email).maybeSingle();
    if (previous.error) throw new PublishingError('Could not verify your email preference.', 503);
    if (parsed.data.subscribed && (previous.data?.bounce_reason ||
        ['bounced', 'complained'].includes(previous.data?.status ?? ''))) {
      throw new PublishingError('This email address requires a suppression review before resubscribing.', 409);
    }
    const consentAt = parsed.data.subscribed ? new Date().toISOString() : null;
    const result = await database().from('subscribers').upsert({
      email, name: identity.name, status: parsed.data.subscribed ? 'subscribed' : 'unsubscribed',
      subscribed_at: Date.now(), unsubscribe_token: randomUUID(),
      is_demo: false, suppressed: !parsed.data.subscribed,
      marketing_consent_at: consentAt,
      marketing_consent_source: parsed.data.subscribed ? 'verified_reader_explicit_opt_in' : null,
      unsubscribed_at: parsed.data.subscribed ? null : Date.now(), source: 'reader_account',
    });
    if (result.error) throw new PublishingError('Could not save your email preference.', 503);
    res.json({ subscribed: parsed.data.subscribed, consentAt });
  }));
  app.get('/api/manager/publishing-jobs', guarded(async (_req, res) => {
    const rows = await database().from('publishing_jobs').select('*').order('created_at', { ascending: false }).limit(30);
    if (rows.error) throw new PublishingError('Publishing jobs are unavailable. Check the isolated schema.', 503);
    res.setHeader('Cache-Control', 'no-store');
    res.json(await Promise.all((rows.data as Job[]).map(job => viewJob(job, false))));
  }));
  app.post('/api/manager/publishing-jobs', guarded(async (req, res) => {
    if (process.env.BOOKATLAS_PUBLISHING_ENABLED !== 'true') throw new PublishingError('Publishing is awaiting controlled verification.', 503);
    const parsed = CreatePublishingJobBody.safeParse(req.body);
    if (!parsed.success) throw new PublishingError('Invalid job settings. Check source type, chapter limits and the accepted budget.');
    const providers = await probePublishingProviders();
    if (!['database', 'text-model', ...(parsed.data.includeAudio ? ['speech-model'] : [])]
      .every(key => providers.some(check => check.id === key && check.state === 'verified'))) {
      throw new PublishingError('Required provider or database checks did not pass.', 503);
    }
    if (![parsed.data.title, parsed.data.author, parsed.data.category].every(value => value.trim()) ||
        Math.floor(parsed.data.budgetUsd * 1_000_000) < 1) throw new PublishingError('Title, author, category and a usable budget are required.');
    const job = await createQueuedJob(parsed.data, req.bookatlasIdentity!.id);
    res.status(201).json(await viewJob(job));
  }));
  app.get('/api/manager/publishing-jobs/:id', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await viewJob(await loadJob(id(req))));
  }));
  app.post('/api/manager/publishing-jobs/:id/actions', guarded(async (req, res) => {
    const parsed = ActOnPublishingJobBody.safeParse(req.body);
    if (!parsed.success) throw new PublishingError('Invalid publishing action.');
    let job = await loadJob(id(req));
    switch (parsed.data.action) {
      case 'cancel':
        if (!['queued', 'running'].includes(job.status)) throw new PublishingError('Only a queued or running job can be cancelled.', 409);
        job = await updateJob(job, { status: 'cancelled', stage: 'cancelled', lease_token: null, lease_until: null });
        break;
      case 'retry': {
        if (!['failed', 'cancelled'].includes(job.status) || job.data.retryCount >= 2) {
          throw new PublishingError('Retry is only available for stopped jobs, at most twice.', 409);
        }
        if (job.data.ledger.reservedMicros >= job.data.ledger.limitMicros) throw new PublishingError('No approved budget remains. Prior ambiguous attempts are not refunded.', 409);
        const { pendingCall: _pending, error: _error, ...data } = job.data;
        job = await updateJob(job, { status: 'queued', stage: 'resume', lease_token: null, lease_until: null,
          data: { ...data, retryCount: data.retryCount + 1 } });
        break;
      }
      case 'publish': {
        const publication = await publishJob(job);
        job = publication.job;
        if (!job.is_test) onPublished(publication.book);
        break;
      }
      case 'launch':
        await queueLaunch(job, parsed.data);
        break;
      case 'refresh-delivery':
        await refreshDelivery(job.id);
        break;
    }
    res.json(await viewJob(job));
  }));
  app.get('/api/manager/publishing-jobs/:id/assets/:asset', guarded(async (req, res) => {
    await assetResponse(await loadJob(id(req)), String(req.params.asset), res);
  }));
  app.get('/api/reader/books/:id/publication', guarded(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json(await viewJob(await readerJob(req), true, true));
  }));
  app.get('/api/reader/books/:id/assets/:asset', guarded(async (req, res) => {
    await assetResponse(await readerJob(req), String(req.params.asset), res);
  }));
  app.get('/api/reader-unsubscribe', guarded(async (req, res) => {
    const token = String(req.query.token ?? '');
    unsubscribeEmail(token);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; base-uri 'none'");
    res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Bookatlas email preferences</title><h1>Stop Bookatlas marketing emails</h1><p>Confirm below. You do not need an account or password.</p><form method="post"><input type="hidden" name="token" value="${token}"><button>Unsubscribe</button></form></html>`);
  }));
  app.post('/api/reader-unsubscribe', guarded(async (req, res) => {
    const email = unsubscribeEmail(String(req.body?.token ?? ''));
    const result = await database().from('subscribers').update({
      status: 'unsubscribed', suppressed: true, marketing_consent_at: null, unsubscribed_at: Date.now(),
    }).eq('email', email);
    if (result.error) throw new PublishingError('Could not save your preference. Please retry.', 503);
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsubscribed</title><h1>You are unsubscribed</h1><p>Bookatlas will no longer send you marketing emails.</p></html>');
  }));
  if (process.env.BOOKATLAS_PUBLISHING_ENABLED === 'true') {
    startPublishingWorker();
    const timer = setInterval(() => {
      void tickCampaignWorker().catch(() => logger.warn('Campaign queue is temporarily unavailable'));
    }, 3000);
    timer.unref();
  }
}
