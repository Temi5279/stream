const CACHE_NAME = 'stream-cache-v1';
const urlsToCache = [
  '/stream/',
  '/stream/index.html',
  '/stream/styles.css',
  '/stream/script.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
