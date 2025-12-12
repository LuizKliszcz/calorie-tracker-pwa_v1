const CACHE_VERSION = 'calorie-tracker-v1';
const PRECACHE = [
  '/', // start url
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// During install: cache core files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE))
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  clients.claim();
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    ))
  );
});

// Helper: is navigation request?
function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
}

// Fetch handler: navigation -> network-first (with offline fallback); assets -> cache-first
self.addEventListener('fetch', event => {
  const req = event.request;

  // ignore non-GET
  if (req.method !== 'GET') return;

  // navigation requests (pages) -> network-first
  if (isNavigationRequest(req)) {
    event.respondWith(
      fetch(req).then(res => {
        // update cache
        const rClone = res.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(req, rClone));
        return res;
      }).catch(() => {
        // fallback to cache -> offline.html
        return caches.match(req).then(cached => cached || caches.match('/offline.html'));
      })
    );
    return;
  }

  // static assets -> cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // avoid caching opaque responses (cross-origin) or large files if you prefer
        const rClone = res.clone();
        caches.open(CACHE_VERSION).then(cache => {
          // optional: limit caching to same-origin assets
          if (req.url.startsWith(self.location.origin)) cache.put(req, rClone);
        });
        return res;
      }).catch(() => {
        // optional: return placeholder for images etc.
        return caches.match('/offline.html');
      });
    })
  );
});

// Optional: listen for messages to skipWaiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
