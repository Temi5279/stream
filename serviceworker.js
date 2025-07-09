// Network-optimized service worker
const CACHE_NAME = 'stream-cache-v6';
const OFFLINE_CACHE = 'offline-content';
const MAX_CACHE_SIZE = 200; // MB

// Pre-cache critical resources
const CORE_ASSETS = [
  '/stream/index.html',
  '/stream/styles.css',
  '/stream/icon-192.png',
  '/stream/fallback-video.jpg'
];

// Install phase - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Network-optimized fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetchWithTimeout(event.request, 3000))
    );
  } 
  // Stale-while-revalidate for API calls
  else if (isAPIRequest(url)) {
    event.respondWith(
      fetchWithTimeout(event.request, 5000)
        .catch(() => caches.match(event.request))
    );
  }
});

// Helpers
function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('Timeout')), timeout);
    fetch(request)
      .then(response => {
        clearTimeout(timeoutId);
        // Cache successful responses
        if (response.ok && isCacheable(request)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        resolve(response);
      })
      .catch(reject);
  });
}

function isStaticAsset(url) {
  return url.pathname.endsWith('.css') || 
         url.pathname.endsWith('.js') || 
         url.pathname.endsWith('.png');
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isCacheable(request) {
  return request.method === 'GET' && 
         !request.url.includes('no-cache');
}

// Background sync for failed requests
self.addEventListener('sync', event => {
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

async function retryFailedRequests() {
  const cache = await caches.open('failed-requests');
  const requests = await cache.keys();
  await Promise.all(
    requests.map(async request => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (err) {
        console.log('Retry failed:', request.url);
      }
    })
  );
                      }
