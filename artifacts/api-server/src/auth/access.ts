import { clerkClient, getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { accessFor, authorizationStatus, canBootstrapOwner, isCrossSiteMutation, type Identity } from './policy';
import { getClerkProxyHost } from '../middlewares/clerkProxyMiddleware';
import { logger } from '../lib/logger';

declare global {
  namespace Express {
    interface Request { bookatlasIdentity?: Identity }
  }
}

async function resolveIdentity(req: Request): Promise<Identity | undefined> {
  const { userId } = getAuth(req);
  if (!userId) return;
  const user = await clerkClient.users.getUser(userId);
  const email = user.emailAddresses.find(address => address.id === user.primaryEmailAddressId);
  if (!email || email.verification?.status !== 'verified') return;

  let metadata = user.publicMetadata;
  if (canBootstrapOwner(email.emailAddress, true, process.env.BOOKATLAS_OWNER_EMAIL, metadata.bookatlasOwnerBootstrapped)) {
    const updated = await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { ...metadata, role: 'admin', bookatlasOwnerBootstrapped: true },
    });
    metadata = updated.publicMetadata;
    logger.info({ userId }, 'Verified owner administrator role initialized');
  }
  return {
    id: user.id,
    email: email.emailAddress.trim().toLowerCase(),
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Reader',
    role: metadata.role === 'admin' ? 'admin' : 'reader',
  };
}

export async function bookatlasAccess(req: Request, res: Response, next: NextFunction) {
  const path = req.originalUrl.split('?')[0];
  const access = accessFor(req.method, path);
  // Cookie-authenticated mutations may only originate from this app.
  if (isCrossSiteMutation(req.method, path, req.headers, getClerkProxyHost(req))) {
    req.log.warn({ event: 'auth.csrf_blocked', method: req.method, path }, 'Cross-site mutation rejected');
    res.status(403).json({ error: 'Cross-origin changes are not allowed.' }); return;
  }
  if (access === 'public') { next(); return; }
  res.setHeader('Cache-Control', 'no-store');
  try {
    req.bookatlasIdentity = await resolveIdentity(req);
    // Anonymous email links are checked with the signed unsubscribe token
    // inside the application, before any subscriber lookup or mutation.
    if (access === 'self-service') { next(); return; }
    const status = authorizationStatus(access, req.bookatlasIdentity);
    if (status !== 200) req.log.info({ event: 'auth.denied', status, path }, 'Account access denied');
    if (status === 401) {
      res.status(401).json({ error: 'Please sign in with a verified email address.' }); return;
    }
    if (status === 403) {
      res.status(403).json({ error: 'Administrator access is required.' }); return;
    }
    next();
  } catch (err) {
    req.log.error({ err }, 'Authentication verification failed');
    res.status(503).json({ error: 'Account verification is temporarily unavailable. Please try again.' });
  }
}
