import { createHmac } from 'node:crypto';

/**
 * A signing key for one purpose, derived from the server's secret (found 2026-11-23: production has no
 * SESSION_SECRET, so keys fell back to a phrase that is in this public repository). Each label gives an unrelated
 * key, so one purpose's signature never works for another. In production a missing secret is an error, never a
 * guessable default.
 */
export function derivedKey(label: string): Buffer {
  const base = process.env.SESSION_SECRET?.trim() || process.env.UNSUBSCRIBE_TOKEN_SECRET?.trim();
  if (!base) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('Server signing secret is not configured.');
    return createHmac('sha256', 'bookatlas-local').update(label).digest();
  }
  return createHmac('sha256', base).update(label).digest();
}
