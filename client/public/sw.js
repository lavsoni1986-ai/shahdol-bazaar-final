// 🚀 BharatOS Production Service Worker
// Version: Stable Semantic Release
const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `shahdolbazaar-${CACHE_VERSION}`;

// 🚨 DEVELOPMENT MODE DETECTION
const isDev = self.location.hostname === 'localhost' || 
             self.location.hostname === '127.0.0.1' ||
             self.location.hostname.includes('localhost');

console.log('[SW] 🚀 BharatOS Service Worker Active');
console.log('[SW] Mode:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
console.log('[SW] Cache Version:', CACHE_NAME);

const ASSETS_TO_CACHE = isDev ? [] : [
  '/',
  '/index.html',
  '/manifest.json',
  '/maskable_icon_x192.png',
  '/maskable_icon_x512.png',
  '/logo.webp'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  if (isDev) {
    console.log('[SW] 🚨 DEV MODE: Skipping wait, activating immediately');
    return self.skipWaiting();
  }
  
  // Production: Pre-cache basic static assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching basic assets');
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Service worker installed, skipping waiting');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Install failed:', err);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  console.log('[SW] Current cache:', CACHE_NAME);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[SW] Found caches:', cacheNames);
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete ALL old caches that don't match current version
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] ✅ Service worker activated');
        return self.clients.claim();
      })
      .catch((err) => {
        console.error('[SW] Activation failed:', err);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 🚨 DEVELOPMENT MODE: Always use network, no caching
  if (isDev) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({ success: false, message: "Offline" }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 🛡️ API Requests: NEVER intercept, always pass through to network
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip external cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // 🌐 1. SPA NAVIGATION REQUESTS: Network-First with /index.html fallback
  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(async () => {
          console.warn('[SW] Navigation failed, attempting offline cache fallback for:', event.request.url);
          const cachedDoc = await caches.match(event.request);
          if (cachedDoc) return cachedDoc;

          const cachedIndex = await caches.match('/index.html') || await caches.match('/');
          if (cachedIndex) return cachedIndex;

          return new Response('Offline - BharatOS', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // ⚡ 2. CRITICAL ASSETS (JS, CSS, HTML, Source): Network-First
  const isCriticalResource = 
    event.request.url.includes('.js') || 
    event.request.url.includes('.css') ||
    event.request.url.includes('.html') ||
    event.request.url.includes('/src/');

  if (isCriticalResource) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // 📦 3. NON-CRITICAL STATIC ASSETS (Images, Fonts, Manifest): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request)
      .then(async (cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Not cached - fetch from network
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        } catch (fetchErr) {
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      })
      .catch(() => {
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
