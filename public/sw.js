const CACHE_NAME = 'pb-bilibili-v2-nocache';

self.addEventListener('install', (event) => {
  // Force active service worker to take control immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL caches to clear any stale index.html or assets
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Always prioritize the network to prevent stale index.html issues with new hashed assets.
  // If offline, fall back to cache.
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

