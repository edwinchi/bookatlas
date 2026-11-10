import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../lib/logger';
import { bookatlasTable, type BookatlasTable } from './tables.js';
import { resolveSupabaseConfig } from './config.js';

// Server-side only. Never import this module from client code or expose
// SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY to the browser — both bypass RLS.
const config = resolveSupabaseConfig(process.env);
export const isDbConfigured = config.isConfigured;

export const supabase: SupabaseClient | null = isDbConfigured
  ? createClient(config.url as string, config.key as string, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  : null;

const persistenceClient = supabase;
/** Database functions the app may call (catalogue category counts, TASK-0005). */
const BOOKATLAS_FUNCTIONS = new Set(['bookatlas_catalog_facets', 'bookatlas_refresh_catalog_facets']);
/** Scoped repository surface; raw shared-project table names are not accepted. */
export const bookatlasDb = persistenceClient ? {
  from: (table: BookatlasTable) => persistenceClient.from(bookatlasTable(table)),
  rpc: (fn: string) => {
    if (!BOOKATLAS_FUNCTIONS.has(fn)) throw new Error('Unknown Bookatlas function');
    return persistenceClient.rpc(fn);
  },
} : null;

if (isDbConfigured) {
  logger.info('[db] Supabase persistence enabled');
} else {
  logger.warn({ keyVariable: config.keyVariable },
    '[db] Supabase connection settings are incomplete or invalid — running in-memory only, data resets on restart');
}
