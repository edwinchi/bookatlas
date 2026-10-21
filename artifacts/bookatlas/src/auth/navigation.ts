const privateReturnPaths = new Set(['/user-portal', '/checkout']);

/** Accept only same-origin Bookatlas destinations that have a rendered route. */
export function safeReaderReturnPath(
  candidate: string | null | undefined,
  origin = 'https://bookatlas.invalid',
  basePath = '/',
): string {
  const base = basePath === '/' ? '' : `/${basePath.replace(/^\/+|\/+$/g, '')}`;
  if (!candidate?.startsWith('/') || candidate.startsWith('//') || /[\\\u0000-\u001f]/.test(candidate)) return '/';
  let url: URL;
  try { url = new URL(candidate, origin); } catch { return '/'; }
  if (url.origin !== origin) return '/';
  let pathname = url.pathname;
  if (base) {
    // Wouter navigation targets are unprefixed app paths, whereas URLs
    // returned by the identity provider can include the deployed base path.
    if (pathname.startsWith(`${base}/`) || pathname === base) pathname = pathname.slice(base.length) || '/';
  }
  if (pathname !== '/' && pathname !== '/admin' && !privateReturnPaths.has(pathname)) return '/';
  if (pathname === '/user-portal') {
    const allowed = new URLSearchParams();
    const resume = url.searchParams.get('resume');
    const view = url.searchParams.get('view');
    const service = url.searchParams.get('service');
    if (resume === 'checkout') allowed.set('resume', resume);
    if (view === 'wishlist' || view === 'ai') allowed.set('view', view);
    if (view === 'ai' && ['studio', 'chat', 'voice', 'matchmaker', 'search'].includes(service || '')) allowed.set('service', service!);
    return `/user-portal${allowed.size ? `?${allowed.toString()}` : ''}`;
  }
  if (pathname === '/checkout') return '/checkout';
  if (pathname === '/admin') return '/admin';
  // Preserve existing, server-verified unsubscribe links when a sign-in flow
  // is explicitly initiated from a public message.
  if (url.searchParams.get('action') === 'unsubscribe' || url.searchParams.get('unsub') === 'true') {
    const allowed = new URLSearchParams();
    for (const key of ['action', 'unsub', 'email', 'token']) {
      const value = url.searchParams.get(key);
      if (value) allowed.set(key, value);
    }
    return `/${allowed.size ? `?${allowed.toString()}` : ''}`;
  }
  return '/';
}

export function readerReturnUrl(path: string, origin: string, basePath: string): string {
  const safePath = safeReaderReturnPath(path, origin, basePath);
  const base = basePath === '/' ? '' : `/${basePath.replace(/^\/+|\/+$/g, '')}`;
  return `${origin}${base}${safePath === '/' ? '/' : safePath}`;
}
