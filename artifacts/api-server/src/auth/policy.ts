export type Identity = { id: string; email: string; name: string; role: 'reader' | 'admin' };

const publicGets = new Set(['/api/health', '/api/healthz', '/api/books', '/api/categories']);
const selfService = new Set(['/api/subscribers/unsubscribe-info', '/api/subscribers/unsubscribe']);
const accountPaths = new Set(['/api/auth/me', '/api/users/register', '/api/account/membership']);

/** Explicit public allowlist; unknown API routes fail closed. */
export function accessFor(method: string, path: string): 'public' | 'self-service' | 'reader' | 'admin' {
  const normalized = path.replace(/\/+$/, '') || '/';
  if (normalized === '/api/account/reading-updates') return 'reader';
  if (normalized === '/api/reader-unsubscribe' && ['GET', 'POST'].includes(method)) return 'self-service';
  if (method === 'GET' && /^\/api\/reader\/books\/[^/]+\/(?:publication|assets\/[^/]+)$/.test(normalized)) return 'reader';
  if (method === 'GET' && publicGets.has(normalized)) return 'public';
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
