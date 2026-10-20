import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../lib/logger';
import { bookatlasTable, type BookatlasTable } from './tables.js';

// Server-side only. Never import this module from client code or expose
// SUPABASE_SERVICE_ROLE_KEY to the browser — it bypasses Row Level Security.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  return v.startsWith('YOUR_') || v.startsWith('MY_') || v === 'your_supabase_project_url_here' || v === 'your_supabase_service_role_key_here';
}

export const isDbConfigured = !isPlaceholder(url) && !isPlaceholder(serviceKey);

export const supabase: SupabaseClient | null = isDbConfigured
  ? createClient(url as string, serviceKey as string, { auth: { persistSession: false } })
  : null;

const persistenceClient = supabase;
/** Scoped repository surface; raw shared-project table names are not accepted. */
export const bookatlasDb = persistenceClient ? {
  from: (table: BookatlasTable) => persistenceClient.from(bookatlasTable(table)),
} : null;

if (isDbConfigured) {
  logger.info('[db] Supabase persistence enabled');
} else {
  logger.warn('[db] Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing) — running in-memory only, data resets on restart');
}
