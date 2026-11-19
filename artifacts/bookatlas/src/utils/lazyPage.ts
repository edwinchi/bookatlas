import React from 'react';

const KEY = 'bookatlas:chunk-reload-at';

/**
 * Reload once when a part of the app loaded on demand is missing: after a release, a tab opened earlier asks
 * for files of the old build, which no longer exist. Returns true when it reloads; never twice within 30 s.
 */
export function reloadForNewRelease(now = Date.now(), storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeSession(), reload = () => window.location.reload()) {
  try {
    const last = Number(storage?.getItem(KEY) || 0);
    if (now - last < 30_000) return false;
    storage?.setItem(KEY, String(now));
  } catch { return false; }
  reload();
  return true;
}

function safeSession() { try { return window.sessionStorage; } catch { return null; } }

/** React.lazy for a named export, recovering from a missing file of an older release. */
export function lazyPage<T extends React.ComponentType<any>>(load: () => Promise<T>) {
  return React.lazy(async () => {
    try { return { default: await load() }; } catch (error) {
      // The reload replaces the page; keep the component pending meanwhile instead of showing an error.
      if (reloadForNewRelease()) return new Promise<never>(() => {});
      throw error;
    }
  });
}
