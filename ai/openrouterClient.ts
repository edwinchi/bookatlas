import crypto from 'crypto';

function isPlaceholderEnvValue(value?: string): boolean {
  if (!value) return true;
  const v = value.trim();
  return !v || v.startsWith('MY_') || v.startsWith('YOUR_') || v.startsWith('your_');
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const isOpenRouterConfigured = !isPlaceholderEnvValue(OPENROUTER_API_KEY) && !!OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith('sk-or-');

// Free-tier by default to keep this at $0 cost. Change via env if the
// model is retired or you want a stronger paid model — OpenRouter's
// free-model catalog rotates over time (check https://openrouter.ai/models).
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free';

if (isOpenRouterConfigured) {
  console.log(`[ai] OpenRouter enabled (model: ${OPENROUTER_MODEL})`);
} else {
  console.log('[ai] OpenRouter not configured — AI routes fall back to Gemini (if configured) or local heuristics');
}

export interface AiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GenerateOptions {
  systemInstruction?: string;
  messages: AiMessage[];
  jsonMode?: boolean;
  temperature?: number;
}

// Short-lived response cache so re-clicking a "Generate" button (or two
// requests with identical inputs) doesn't spend a second API call.
const CACHE_TTL_MS = 15 * 60 * 1000;
const responseCache = new Map<string, { text: string; expiresAt: number }>();

function cacheKeyFor(opts: GenerateOptions): string {
  const raw = JSON.stringify({
    s: opts.systemInstruction || '',
    m: opts.messages,
    j: !!opts.jsonMode,
  });
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function readCache(key: string): string | null {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return hit.text;
}

function writeCache(key: string, text: string): void {
  responseCache.set(key, { text, expiresAt: Date.now() + CACHE_TTL_MS });
  // Bound memory use — this is a demo cache, not a durable store.
  if (responseCache.size > 500) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
}

// Calls OpenRouter's OpenAI-compatible chat completions endpoint. Returns
// the generated text, or null on any failure (missing key, network error,
// non-2xx response, empty content) — callers fall back to Gemini or their
// own local heuristic, exactly like the app already does for Gemini alone.
export async function generateWithOpenRouter(opts: GenerateOptions): Promise<string | null> {
  if (!isOpenRouterConfigured) return null;

  const cacheKey = cacheKeyFor(opts);
  const cached = readCache(cacheKey);
  if (cached !== null) return cached;

  // Hard wall-clock bound, independent of the fetch's own AbortController —
  // some serverless runtimes don't reliably honor AbortSignal cancellation,
  // and a hung call here must never be allowed to run out the clock on the
  // whole request (Vercel functions have their own hard timeout).
  return Promise.race([
    generateWithOpenRouterInner(opts, cacheKey),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000)),
  ]);
}

async function generateWithOpenRouterInner(opts: GenerateOptions, cacheKey: string): Promise<string | null> {
  try {
    const messages: Array<{ role: string; content: string }> = [];
    if (opts.systemInstruction) {
      messages.push({ role: 'system', content: opts.systemInstruction });
    }
    for (const m of opts.messages) {
      messages.push({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text });
    }

    const body: Record<string, unknown> = {
      model: OPENROUTER_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
    };
    if (opts.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Bookatlas',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.error(`[ai] OpenRouter request failed: ${res.status} ${await res.text().catch(() => '')}`);
      return null;
    }

    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') return null;

    writeCache(cacheKey, text);
    return text;
  } catch (err) {
    console.error('[ai] OpenRouter call errored:', err);
    return null;
  }
}
