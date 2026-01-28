// public/sw.js
const CACHE_NAME = 'morpho-app-v1';

// 1. Install Event: Cache critical static assets immediately
// This ensures the App Shell exists even before the first reload.
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate worker immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // These files are critical for the app to open offline
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/favicon.ico',
        '/morpho-pwa-192x192.png',
        '/morpho-pwa-512x512.png',
        '/morpho-maskable-512.png'
      ]);
    })
  );
});

// 2. Activate Event: Clean up old caches
// This runs when you update the version (v1 -> v2)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  // Ignore cross-origin requests (like Google Maps) or POST requests
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If network works, cache the fresh copy for next time
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails (Offline), try to serve from cache
        console.log('Network failed, serving from cache:', event.request.url);
        return caches.match(event.request);
      })
  );
});