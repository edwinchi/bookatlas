// Registers the offline service worker. Kept as a file (not inline) so the CSP needs no script hashes.
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
