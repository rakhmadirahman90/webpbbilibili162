const CACHE_NAME = 'pb-bilibili-v3-20260831';

self.addEventListener('install', (event) => {
  // Take control as soon as the new worker is installed.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first so new Vite assets are picked up immediately after deployment.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
