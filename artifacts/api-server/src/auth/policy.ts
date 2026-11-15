export type Identity = { id: string; email: string; name: string; role: 'reader' | 'admin' };

const publicGets = new Set(['/api/health', '/api/healthz', '/api/healthz/ready', '/api/books', '/api/categories', '/api/payments/config']);
const selfService = new Set(['/api/subscribers/unsubscribe-info', '/api/subscribers/unsubscribe']);
const accountPaths = new Set(['/api/auth/me', '/api/users/register', '/api/account/membership', '/api/account', '/api/account/export']);

/** Explicit public allowlist; unknown API routes fail closed. */
export function accessFor(method: string, path: string): 'public' | 'self-service' | 'reader' | 'admin' {
  const normalized = path.replace(/\/+$/, '') || '/';
  if (normalized === '/api/account/reading-updates') return 'reader';
  if (normalized === '/api/reader-unsubscribe' && ['GET', 'POST'].includes(method)) return 'self-service';
  if (method === 'GET' && /^\/api\/reader\/books\/[^/]+\/(?:publication|assets\/[^/]+)$/.test(normalized)) return 'reader';
  if (method === 'GET' && publicGets.has(normalized)) return 'public';
  // eBook submissions (TASK-0003): authors are signed-in readers; publish and reject stay admin.
  if (method === 'GET' && /^\/api\/catalog\/covers\/[^/]+$/.test(normalized)) return 'public';
  // The scalable catalogue (TASK-0005): search, categories, shelves and book pages are public.
  if (method === 'GET' && /^\/api\/catalog\/(?:search|facets|shelves|books\/[^/]+)$/.test(normalized)) return 'public';
  // Reviews and author pages (TASK-0009): reading is public; writing needs a signed-in reader.
  if (method === 'GET' && /^\/api\/catalog\/(?:books\/[^/]+\/reviews|authors\/[a-z0-9-]+)$/.test(normalized)) return 'public';
  if (/^\/api\/reviews\/books\/[^/]+(?:\/mine)?$/.test(normalized) && ['GET', 'PUT', 'DELETE'].includes(method)) return 'reader';
  // Follow authors (cycle 5c); the unsubscribe link is checked by its signed token.
  if (normalized === '/api/follows/unsubscribe' && ['GET', 'POST'].includes(method)) return 'self-service';
  if (/^\/api\/follows\/[a-z0-9-]+(?:\/mine)?$/.test(normalized) && ['GET', 'POST', 'DELETE'].includes(method)) return 'reader';
  // Everyone may read a prepared book's preview; the route decides who gets the whole book.
  if (method === 'GET' && /^\/api\/reader\/catalog\/[^/]+\/(?:content|images\/[^/]+)$/.test(normalized)) return 'self-service';
  if (normalized === '/api/ebook-submissions' && ['GET', 'POST'].includes(method)) return 'reader';
  if (/^\/api\/ebook-submissions\/[^/]+$/.test(normalized) && method === 'GET') return 'reader';
  if (/^\/api\/ebook-submissions\/[^/]+\/upload\/\d+$/.test(normalized) && method === 'PUT') return 'reader';
  if (/^\/api\/ebook-submissions\/[^/]+\/(?:prepare|reupload|new-version)$/.test(normalized) && method === 'POST') return 'reader';
  if (/^\/api\/ebook-submissions\/[^/]+\/(?:intake|print-links|price)$/.test(normalized) && method === 'PUT') return 'reader';
  if (/^\/api\/ebook-submissions\/[^/]+\/cover$/.test(normalized) && ['PUT', 'DELETE'].includes(method)) return 'reader';
  if (/^\/api\/ebook-submissions\/[^/]+\/cover\/enlarge$/.test(normalized) && method === 'POST') return 'reader';
  if (/^\/api\/ebook-submissions\/[^/]+\/files\/(?:epub|cover)(?:\/parts\/\d+)?$/.test(normalized) && method === 'GET') return 'reader';
  if (/^\/api\/ebook-submissions\/[^/]+\/readiness$/.test(normalized) && method === 'GET') return 'reader';
  // Payments (TASK-0004): Stripe signs its webhook; buyers are signed-in readers.
  if (normalized === '/api/stripe/webhook' && method === 'POST') return 'self-service';
  if (normalized === '/api/checkout/sessions' && method === 'POST') return 'reader';
  if (/^\/api\/checkout\/sessions\/[^/]+$/.test(normalized) && method === 'GET') return 'reader';
  if (normalized === '/api/purchases' && method === 'GET') return 'reader';
  // Crypto (CoinGate): the callback proves itself with the order's token and is re-checked with CoinGate's API.
  if (normalized === '/api/crypto/callback' && method === 'POST') return 'self-service';
  if (normalized === '/api/crypto/orders' && method === 'POST') return 'reader';
  if (/^\/api\/crypto\/orders\/[^/]+$/.test(normalized) && method === 'GET') return 'reader';
  if (normalized === '/api/author/sales' && method === 'GET') return 'reader';
  // Author hub (cycle 6): CSV export, royalty statements, payout details.
  if ((normalized === '/api/author/sales.csv' || /^\/api\/author\/statements\/[^/]+$/.test(normalized)) && method === 'GET') return 'reader';
  if (normalized === '/api/author/payout' && ['GET', 'PUT'].includes(method)) return 'reader';
  // BooksAtlas Reader sync (cycle 7): progress, highlights, bookmarks, notes, settings, sessions and stats.
  if (method === 'GET' && (/^\/api\/reader\/state\/[^/]+$/.test(normalized) || ['/api/reader/annotations', '/api/reader/preferences', '/api/reader/stats'].includes(normalized))) return 'reader';
  if (method === 'PUT' && (/^\/api\/reader\/progress\/[^/]+$/.test(normalized) || normalized === '/api/reader/preferences')) return 'reader';
  if (method === 'POST' && (normalized === '/api/reader/annotations' || normalized === '/api/reader/sessions')) return 'reader';
  // Reader Phase 3 (cycle 10): achievements, shared notes, reports, reading groups; moderation for administrators.
  if (method === 'GET' && (normalized === '/api/reader/achievements' || normalized === '/api/reader/groups' || /^\/api\/reader\/social\/[^/]+\/\d+$/.test(normalized) || /^\/api\/reader\/groups\/[0-9a-f-]{36}$/.test(normalized))) return 'reader';
  if (method === 'PATCH' && /^\/api\/reader\/annotations\/[^/]+\/share$/.test(normalized)) return 'reader';
  if (method === 'POST' && (['/api/reader/reports', '/api/reader/groups', '/api/reader/groups/join'].includes(normalized) || /^\/api\/reader\/groups\/[0-9a-f-]{36}\/posts$/.test(normalized))) return 'reader';
  if (method === 'DELETE' && /^\/api\/reader\/groups\/[0-9a-f-]{36}\/(?:posts\/[0-9a-f-]{36}|membership)$/.test(normalized)) return 'reader';
  if (/^\/api\/manager\/reader-reports(?:\/|$)/.test(normalized)) return 'admin';
  if (['PATCH', 'DELETE'].includes(method) && /^\/api\/reader\/annotations\/[^/]+$/.test(normalized)) return 'reader';
  // Reader Phase 2 (cycle 8): AI tools for signed-in readers; the language list is public.
  if (method === 'POST' && /^\/api\/reader\/ai\/(?:ask|study|explain|translate|define)$/.test(normalized)) return 'reader';
  if (method === 'GET' && normalized === '/api/reader/ai/config') return 'public';
  // Narration (TASK-0008): authors order and listen to samples; the step authenticates with its own key.
  if (method === 'GET' && /^\/api\/narration\/(?:books\/[^/]+|samples\/[^/]+)$/.test(normalized)) return 'reader';
  if (method === 'POST' && (/^\/api\/narration\/books\/[^/]+\/order$/.test(normalized) || normalized === '/api/narration/confirm')) return 'reader';
  if (method === 'PUT' && /^\/api\/narration\/books\/[^/]+\/sale$/.test(normalized)) return 'reader';
  if (method === 'POST' && normalized === '/api/internal/narration/step') return 'self-service';
  if (method === 'GET' && /^\/api\/reader\/catalog\/[^/]+\/narration(?:\/\d+)?$/.test(normalized)) return 'self-service';
  if (method === 'GET' && /^\/api\/invoices(?:\/\d+)?$/.test(normalized)) return 'reader';
  if (method === 'POST' && /^\/api\/invoices\/\d+\/refund-request$/.test(normalized)) return 'reader';
  // The EPUBCheck worker authenticates with its bearer token inside the route.
  if (/^\/api\/internal\/ebook-checks\/(?:claim|[^/]+\/(?:parts\/\d+|result))$/.test(normalized)) return 'self-service';
  if ((method === 'GET' && normalized.endsWith('/unsubscribe-info')) ||
      (method === 'POST' && normalized.endsWith('/unsubscribe'))) {
    if (selfService.has(normalized)) return 'self-service';
  }
  if (accountPaths.has(normalized)) return 'reader';
  if (normalized.startsWith('/api/ai/')) return 'reader';
  if (normalized.startsWith('/api/gemini/') &&
      !['/api/gemini/generate-video', '/api/gemini/video-status'].includes(normalized)) return 'reader';
  return 'admin';
}

export function canBootstrapOwner(email: string, verified: boolean, configuredEmail: string | undefined, alreadyBootstrapped: unknown) {
  return verified && !alreadyBootstrapped && !!configuredEmail?.trim() &&
    email.toLowerCase() === configuredEmail.trim().toLowerCase();
}

export function authorizationStatus(access: ReturnType<typeof accessFor>, identity?: Identity): 200 | 401 | 403 {
  if (access === 'public' || access === 'self-service') return 200;
  if (!identity) return 401;
  return access === 'admin' && identity.role !== 'admin' ? 403 : 200;
}

type HeaderValue = string | string[] | undefined;

/**
 * CSRF guard for cookie-authenticated mutations. A request carrying a session cookie must prove it
 * came from this app: a matching Origin, or Sec-Fetch-Site: same-origin when Origin is absent.
 * Requests without session cookies hold no ambient credentials, and signed-token self-service
 * links (one-click unsubscribe from mail providers) are validated by their token instead.
 */
export function isCrossSiteMutation(
  method: string, path: string, headers: { origin?: HeaderValue; cookie?: HeaderValue; 'sec-fetch-site'?: HeaderValue },
  appHost: string | undefined,
): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return false;
  const origin = typeof headers.origin === 'string' ? headers.origin : undefined;
  if (origin) {
    try { return new URL(origin).host !== appHost; } catch { return true; }
  }
  if (accessFor(method, path) === 'self-service') return false;
  const cookie = typeof headers.cookie === 'string' ? headers.cookie : '';
  if (!/(?:^|;\s*)__session(?:_[\w-]+)?=/.test(cookie)) return false;
  return headers['sec-fetch-site'] !== 'same-origin';
}
