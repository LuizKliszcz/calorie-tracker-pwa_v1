self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // IGNORAR urls inválidas
  if (
    url.startsWith("chrome-extension://") ||
    url.startsWith("chrome://") ||
    url.startsWith("devtools://")
  ) {
    return; 
  }

  event.respondWith(
    caches.open("v1").then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        // só cachear requisições http
        if (event.request.url.startsWith("http")) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (err) {
        return cached;
      }
    })
  );
});
