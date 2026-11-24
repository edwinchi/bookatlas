/**
 * Tells the server when a page crashes in a reader's browser (owner report 2026-11-25: a blank page on a phone that
 * could not be reproduced elsewhere). Sends the message, script file and line, and the page path; no account details.
 * At most five reports per page load, so a loop of errors cannot flood the server.
 */
let sent = 0;

export function reportClientError(kind: string, error: unknown, extra: { source?: string; line?: number } = {}) {
  if (sent >= 5 || typeof navigator === 'undefined') return;
  sent += 1;
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  const body = JSON.stringify({ kind, message: e.message, stack: e.stack, source: extra.source, line: extra.line, page: location.pathname });
  try {
    if (!navigator.sendBeacon?.('/api/client-error', new Blob([body], { type: 'text/plain' }))) {
      void fetch('/api/client-error', { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => undefined);
    }
  } catch { /* reporting must never break the page */ }
}

export function watchClientErrors() {
  window.addEventListener('error', (ev) => {
    // Failed images and scripts fire here too, without an error object; only real script errors are reported.
    if (!ev.error && !ev.message) return;
    reportClientError('error', ev.error ?? ev.message, { source: ev.filename, line: ev.lineno });
  });
  window.addEventListener('unhandledrejection', (ev) => reportClientError('rejection', ev.reason));
}
