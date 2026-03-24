// 🚀 STRIKE 104: Cache Exorcism - Service Worker with Dynamic Versioning
// Version: Dynamic (v + Date.now())
const CACHE_NAME = 'shahdolbazaar-v' + Date.now();

// 🚨 DEVELOPMENT MODE DETECTION
const isDev = self.location.hostname === 'localhost' || 
             self.location.hostname === '127.0.0.1' ||
             self.location.hostname.includes('localhost');

console.log('[SW] 🚀 STRIKE 104 - Cache Exorcism Active');
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
  
  // 🚨 DEVELOPMENT: Skip waiting, activate immediately
  if (isDev) {
    console.log('[SW] 🚨 DEV MODE: Skipping wait, activating immediately');
    return self.skipWaiting();
  }
  
  // Production: Cache assets
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

// Fetch event - Network-First with No-Store for Critical Resources
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 🚨 DEVELOPMENT MODE: Always use network, no caching
  if (isDev) {
    console.log('[SW] 🚨 DEV MODE: Bypassing cache for:', event.request.url);
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone and return fresh response
          return response;
        })
        .catch(() => {
          // ✅ Fallback: If network fails, return a proper empty Response object
          return new Response(JSON.stringify({ success: false, message: "Offline" }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // PRODUCTION MODE: Network-First with Stale-While-Revalidate
  // Skip API requests (always use network)
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // 🚨 CRITICAL FIX: Use no-store for JS/HTML to always get fresh content
  const isCriticalResource = 
    event.request.url.includes('.js') || 
    event.request.url.includes('.html') ||
    event.request.url.includes('/src/');

  if (isCriticalResource) {
    console.log('[SW] 🔥 CRITICAL: Fetching fresh for:', event.request.url);
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache the fresh response
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Network failed - try cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] 📦 Serving from cache:', event.request.url);
              return cachedResponse;
            }
            
            // If no cache and it's a navigation request, return index.html
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
    return;
  }

  // Non-critical resources: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached immediately if available
        if (cachedResponse) {
          console.log('[SW] 📦 Cached:', event.request.url);
          // Also fetch fresh in background
          fetch(event.request)
            .then((response) => {
              if (response.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }
        
        // Not cached - fetch from network
        return fetch(event.request)
          .then((response) => {
            const responseToCache = response.clone();
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          });
      })
  );
});
