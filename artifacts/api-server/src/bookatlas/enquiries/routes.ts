import express, { type Express, type Request, type Response } from 'express';
import { logger } from '../../lib/logger.js';
import { notifyTeam } from './notify.js';
import { EnquiryError, listEnquiries, purgeOldEnquiries, setAnswered, submitEnquiry } from './service.js';

function guarded(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof EnquiryError) { res.status(error.status).json({ error: error.message }); return; }
      logger.error({ err: error, event: 'enquiry.failed' }, 'Book enquiry request failed');
      res.status(503).json({ error: 'Your message could not be sent just now. Please try again in a moment.' });
    }
  };
}

const admin = (req: Request) => {
  if (req.bookatlasIdentity?.role !== 'admin') throw new EnquiryError('Administrator access is required.', 403);
  return req.bookatlasIdentity;
};

/**
 * Visitors send an enquiry (public, rate-limited); administrators read and answer them (default admin policy).
 * With RESEND_API_KEY, EMAIL_FROM and ENQUIRY_NOTIFY_TO (or BOOKATLAS_OWNER_EMAIL) set, the team also gets an email.
 */
export function mountEnquiries(app: Express, appUrl = 'https://booksatlas.app') {
  const json = express.json({ limit: '16kb' });
  app.post('/api/book-enquiries', json, guarded(async (req, res) => {
    const { id, enquiry } = await submitEnquiry((req.body ?? {}) as Record<string, unknown>);
    // Awaited, not fire-and-forget: a serverless function may stop once it has answered. Never throws.
    const notified = enquiry ? await notifyTeam(enquiry, appUrl) : false;
    logger.info({ event: 'enquiry.received', id, notified }, 'Book enquiry received');
    res.status(201).json({ id });
  }));
  app.get('/api/manager/book-enquiries', guarded(async (req, res) => {
    admin(req);
    await purgeOldEnquiries().catch(() => undefined);
    res.json({ enquiries: await listEnquiries() });
  }));
  app.post('/api/manager/book-enquiries/:id/answered', json, guarded(async (req, res) => {
    const by = admin(req).id;
    res.json({ enquiry: await setAnswered(String(req.params.id), req.body?.answered !== false, by) });
  }));
}
