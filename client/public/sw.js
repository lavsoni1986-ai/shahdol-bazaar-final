// Basic Service Worker for ShahdolBazaar PWA
const CACHE_NAME = 'shahdolbazaar-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/maskable_icon_x192.png',
  '/maskable_icon_x512.png',
  '/logo.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching basic assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Simple fetch handler
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

