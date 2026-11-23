// Bookatlas Offline-First Service Worker
// v6: API answers are no longer cached first (stale prices, payment settings and submissions).
// v7: the logo reads BOOKSATLAS; visitors drop the cached BOOKATLAS image.
const CACHE_VERSION = 'bookatlas-v7';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DATA_CACHE = `data-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './favicon-32.png',
  './logo-96.webp',
  './logo-192.webp',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DATA_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Audio goes straight to the network without this worker (2026-11-23): Safari streams it in byte ranges and has
  // refused range answers relayed by a service worker.
  if (request.headers.has('range') || request.destination === 'audio' || /^\/api\/(?:audio-samples\/|reader\/catalog\/[^/]+\/narration\/\d+$)/.test(url.pathname)) {
    return;
  }

  // The API always goes to the network: prices, payments, submissions and purchases change.
  // Only the public catalogue keeps a copy, used when the network is down. Personal answers
  // (accounts, submissions, purchases, reader text, checkout) are never stored.
  if (url.pathname.startsWith('/api/')) {
    const publicCatalogue = /^\/api\/(?:books|categories|catalog\/(?:search|facets|shelves|books\/[^/]+|covers\/[^/]+))$/.test(url.pathname);
    if (!publicCatalogue || request.headers.has('Authorization')) {
      event.respondWith(fetch(request));
      return;
    }
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Network First for page navigations so new releases load; cached app shell only when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('./index.html', responseToCache));
        }
        return networkResponse;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache First for static assets (scripts, styles, fonts, images)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

