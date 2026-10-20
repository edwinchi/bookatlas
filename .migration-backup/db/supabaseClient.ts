import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

if (isDbConfigured) {
  console.log('[db] Supabase persistence enabled');
} else {
  console.log('[db] Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing) — running in-memory only, data resets on restart');
}
