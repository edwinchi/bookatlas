import type { Express, Request, Response } from 'express';
import { DeleteOwnAccountBody } from '@workspace/api-zod';
import { logger } from '../lib/logger.js';

/** Version of the privacy notice readers accept at sign-up; bump when the notice changes. */
export const PRIVACY_NOTICE_VERSION = '2026-11-08';

/** Keeps logs useful for support without storing full reader addresses (GDPR data minimisation). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

export class AccountStoreError extends Error {}

/** Every place Bookatlas keeps data about one reader. Implementations must throw rather than report partial success. */
export interface AccountStore {
  profile(email: string): unknown | null;
  subscriber(email: string): Record<string, unknown> | null;
  emailDeliveries(email: string): Promise<Record<string, unknown>[]>;
  /** Removes the profile, subscriber and delivery records for this email. */
  erase(email: string): Promise<void>;
  /** Removes the sign-in account at the identity provider. */
  deleteIdentity(userId: string): Promise<void>;
}

export function mountAccountRoutes(app: Express, store: AccountStore) {
  app.get('/api/account/export', async (req: Request, res: Response) => {
    const identity = req.bookatlasIdentity!;
    try {
      const subscriber = store.subscriber(identity.email);
      // The unsubscribe token is a bearer capability, not personal data; keep it out of downloaded files.
      const { unsubscribeToken: _token, ...subscriberData } = subscriber ?? {};
      const body = {
        exportedAt: new Date().toISOString(),
        identity,
        profile: store.profile(identity.email),
        subscriber: subscriber ? subscriberData : null,
        emailDeliveries: await store.emailDeliveries(identity.email),
      };
      logger.info({ event: 'account.export', user: maskEmail(identity.email) }, 'Reader exported account data');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Disposition', 'attachment; filename="bookatlas-account-export.json"');
      res.json(body);
    } catch (err) {
      logger.error({ err, event: 'account.export_failed' }, 'Account export failed');
      res.status(503).json({ error: 'Your data could not be exported right now. Please try again.' });
    }
  });

  app.delete('/api/account', async (req: Request, res: Response) => {
    const identity = req.bookatlasIdentity!;
    if (!DeleteOwnAccountBody.safeParse(req.body).success) {
      res.status(400).json({ error: 'Type DELETE to confirm permanent account deletion.' }); return;
    }
    if (identity.role === 'admin') {
      res.status(409).json({ error: 'Administrator accounts must be removed by another administrator.' }); return;
    }
    try {
      await store.erase(identity.email);
    } catch (err) {
      logger.error({ err, event: 'account.delete_failed', stage: 'data' }, 'Account data erasure failed');
      res.status(503).json({ error: 'Your data could not be erased right now. Nothing was deleted; please try again.' });
      return;
    }
    try {
      await store.deleteIdentity(identity.id);
    } catch (err) {
      logger.error({ err, event: 'account.delete_failed', stage: 'identity' }, 'Sign-in account removal failed');
      res.status(502).json({ error: 'Your Bookatlas data was erased, but your sign-in account could not be removed. Please try again.' });
      return;
    }
    logger.info({ event: 'account.deleted', user: maskEmail(identity.email) }, 'Reader account deleted');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ deleted: true });
  });
}
