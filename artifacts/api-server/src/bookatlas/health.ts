import type { Express } from 'express';
import { bookatlasDb } from './db/supabaseClient.js';
import { paymentsConfigured } from './payments/checkout.js';
import { logger } from '../lib/logger.js';

type Check = { status: 'ok' | 'fail' | 'off'; ms?: number };

async function timed(run: () => PromiseLike<{ error: unknown }>): Promise<Check> {
  const started = Date.now();
  try {
    const { error } = await run();
    return { status: error ? 'fail' : 'ok', ms: Date.now() - started };
  } catch {
    return { status: 'fail', ms: Date.now() - started };
  }
}

/**
 * Readiness for uptime monitors: is each dependency behind the site working? Public, so it
 * reports only ok, fail or off and timings, never errors, counts or configuration values.
 */
export function mountReadiness(app: Express) {
  app.get('/api/healthz/ready', async (_req, res) => {
    const db = bookatlasDb;
    const [database, catalogueCounts] = db
      ? await Promise.all([
        timed(() => db.from('books').select('id').limit(1)),
        timed(() => db.rpc('bookatlas_catalog_facets')),
      ])
      : [{ status: 'off' } as Check, { status: 'off' } as Check];
    const checks = { database, catalogueCounts, payments: { status: paymentsConfigured() ? 'ok' : 'off' } as Check };
    const failing = Object.entries(checks).filter(([, c]) => c.status === 'fail').map(([name]) => name);
    if (failing.length) logger.error({ event: 'health.degraded', failing }, 'Readiness check failed');
    res.setHeader('Cache-Control', 'no-store');
    res.status(failing.length ? 503 : 200).json({ status: failing.length ? 'degraded' : 'ok', checks });
  });
}
