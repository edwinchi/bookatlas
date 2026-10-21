import type { Express } from 'express';
import { checkResendReadiness } from './resend.js';
import { publishingReadiness } from './readiness.js';
import { probePublishingProviders } from './providers.js';

/**
 * Mounted inside the existing authenticated app. Unknown /api routes default
 * to administrator-only in the central access policy.
 */
export function mountPublishingReadiness(app: Express): void {
  app.get('/api/manager/publishing-readiness', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const [email, providers] = await Promise.all([checkResendReadiness(), probePublishingProviders()]);
    const readiness = publishingReadiness(process.env, email);
    const verified = new Map(providers.map(check => [check.id, check]));
    readiness.checks = readiness.checks.map(check => verified.get(check.id) ?? check);
    if (process.env.BOOKATLAS_PUBLISHING_ENABLED === 'true') {
      readiness.canPublish = ['text-model', 'speech-model', 'database'].every(id => verified.get(id)?.state === 'verified') &&
        !!process.env.PRIVATE_OBJECT_DIR?.trim();
      readiness.summary = readiness.canPublish
        ? 'Ready to create guarded publishing jobs. Outputs require separate review and publication; campaigns remain opt-in and respect email test mode.'
        : 'The durable publishing pipeline is installed, but required provider, storage or schema checks are not passing.';
      readiness.checks = readiness.checks.map(check => check.id === 'pipeline' ? {
        ...check, state: 'verified',
        detail: 'Durable jobs, conservative paid-call reservations, private EPUB/chapter audio, explicit review/publication, and consent-filtered campaign dispatch are installed. Legacy simulated sends remain disabled. Live delivery and full browser/auth flows require separate verification.',
      } : check);
    }
    res.json(readiness);
  });

  // These old handlers manufactured books and email delivery. Keep them blocked
  // even when credentials are supplied, until the durable replacement is ready.
  app.post(['/api/manager/multimodal-ingest', '/api/subscribers/send-campaign'], (_req, res) => {
    res.status(503).json({
      success: false,
      code: 'PUBLISHING_PIPELINE_UNAVAILABLE',
      error: 'This legacy publishing/campaign operation is disabled because it does not create complete book/audio assets or send verified email. No book was published and no campaign was sent.',
      readinessUrl: '/api/manager/publishing-readiness',
    });
  });
}
