import { GoogleGenAI } from '@google/genai';
import type { PublishingReadinessCheck } from '@workspace/api-zod';
import { supabase } from '../db/supabaseClient.js';
import { bookatlasTable } from '../db/tables.js';

// GET requests with explicit column selection validate the REST schema.
// Do not use HEAD: it can return success even when the table is absent.
const REQUIRED_TABLES = [
  ['books', 'id,title,author,primary_genre,price,data,updated_at'],
  ['categories', 'name'],
  ['subscribers', 'email,status,marketing_consent_at,marketing_consent_source,is_demo,suppressed'],
  ['publishing_jobs', 'id,owner_id,status,stage,version,lease_token,lease_until,is_test,data,created_at,updated_at'],
  ['publishing_messages', 'id,job_id,recipient,kind,status,provider_id,attempts,error,created_at,updated_at'],
  ['publishing_test_books', 'id,data,updated_at'],
] as const;

let cached: { until: number; checks: PublishingReadinessCheck[] } | undefined;
let pending: Promise<PublishingReadinessCheck[]> | undefined;

async function models(): Promise<PublishingReadinessCheck[]> {
  if (!process.env.GEMINI_API_KEY?.trim()) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 10_000 } });
  return Promise.all([
    { id: 'text-model', label: 'Text and document generation', model: 'gemini-3.7-flash' },
    { id: 'speech-model', label: 'Studio narration', model: 'gemini-3.8-flash-tts' },
  ].map(async ({ id, label, model }): Promise<PublishingReadinessCheck> => {
    try {
      const metadata = await ai.models.get({ model });
      if (!metadata.supportedActions?.includes('generateContent')) throw new Error('Missing generation capability');
      return {
        id, label, state: 'verified',
        detail: id === 'text-model'
          ? 'Gemini accepts gemini-3.7-flash. Google now routes this identifier to Gemini 3.8 Flash. Metadata access is verified; manuscript generation is not yet tested.'
          : 'gemini-3.8-flash-tts is available. Metadata access is verified; no narration has been generated or billed.',
      };
    } catch {
      return { id, label, state: 'error', detail: `The configured credential could not verify ${model}. Generation remains blocked; no paid generation was attempted.` };
    }
  }));
}

async function database(): Promise<PublishingReadinessCheck[]> {
  const client = supabase;
  if (!client) return [];
  try {
    const results = await Promise.all(REQUIRED_TABLES.map(async ([table, columns]) => {
      const target = bookatlasTable(table);
      const response = await client.from(target).select(columns).limit(0).abortSignal(AbortSignal.timeout(10_000));
      return response.error ? target : null;
    }));
    const unavailable = results.filter((table): table is NonNullable<typeof table> => table !== null);
    return [{
      id: 'database', label: 'Supabase persistence',
      state: unavailable.length ? 'blocked' : 'verified',
      detail: unavailable.length
        ? `Connection configured, but required tables or columns are unavailable: ${unavailable.join(', ')}. Apply the reviewed Bookatlas schema using database-administrator access. No records were written.`
        : 'Required tables and columns passed read-only checks. Durable writes and job recovery still require verification.',
    }];
  } catch {
    return [{ id: 'database', label: 'Supabase persistence', state: 'error', detail: 'The database schema check failed or timed out. No records were written.' }];
  }
}

/** Metadata-only checks: no text/audio generation, contacts, writes, or sends. */
export async function probePublishingProviders(): Promise<PublishingReadinessCheck[]> {
  if (cached && cached.until > Date.now()) return cached.checks;
  if (!pending) {
    pending = Promise.all([models(), database()]).then(groups => {
      const checks = groups.flat();
      cached = { until: Date.now() + 60_000, checks };
      return checks;
    }).finally(() => { pending = undefined; });
  }
  return pending;
}
