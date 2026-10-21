type Environment = Record<string, string | undefined>;

function present(value?: string): boolean {
  return !!value?.trim() && !/^(YOUR_|MY_|your_.*_here)/.test(value.trim());
}

/** Server-only configuration. An explicit key mode never falls back to another project's key. */
export function resolveSupabaseConfig(env: Environment) {
  const keyMode = env.BOOKATLAS_SUPABASE_KEY_MODE ?? 'service_role';
  const url = env.SUPABASE_URL?.trim();
  const key = (keyMode === 'secret' ? env.SUPABASE_SECRET_KEY
    : keyMode === 'service_role' ? env.SUPABASE_SERVICE_ROLE_KEY : undefined)?.trim();
  let validUrl = false;
  try {
    const parsed = new URL(url ?? '');
    validUrl = parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
      (parsed.pathname === '/' || parsed.pathname === '') && !parsed.search && !parsed.hash;
  } catch {}
  const validKey = present(key) &&
    (keyMode !== 'secret' || /^sb_secret_[A-Za-z0-9_-]+$/.test(key ?? ''));
  return {
    url, key, keyMode,
    keyVariable: keyMode === 'secret' ? 'SUPABASE_SECRET_KEY' : 'SUPABASE_SERVICE_ROLE_KEY',
    isConfigured: validUrl && validKey && present(url),
  };
}
