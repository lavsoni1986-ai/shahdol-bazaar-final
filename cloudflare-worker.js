/**
 * Cloudflare Worker for Global Edge Caching
 * 
 * Alternative to Vercel Edge Middleware
 * Deploy to Cloudflare Workers for global edge caching
 * 
 * Usage:
 * 1. Deploy to Cloudflare Workers
 * 2. Set up route rules in Cloudflare Dashboard
 * 3. Configure cache settings
 */

// ============================================
// CACHEABLE ROUTES CONFIGURATION
// ============================================

const CACHEABLE_ROUTES = [
  '/api/products',
  '/api/products/:id',
  '/api/categories',
  '/api/banners',
  '/api/offers',
  '/api/shops',
  '/api/reviews/:productId',
  '/api/partner/shop/:ownerId',
  '/api/health',
];

const NON_CACHEABLE_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/upload',
  '/api/orders',
  '/api/cart',
  '/api/checkout',
  '/api/admin',
  '/api/merchant',
  '/api/partner/shop',
  '/api/shops/mine',
  '/api/user',
  '/api/debug',
];

const CACHE_CONFIG = {
  products: 60,
  productDetail: 300,
  categories: 600,
  banners: 300,
  offers: 300,
  shops: 300,
  reviews: 600,
  health: 30,
  default: 60,
};

const STALE_WHILE_REVALIDATE = 600;

// ============================================
// HELPER FUNCTIONS
// ============================================

function isCacheableRoute(pathname) {
  for (const route of NON_CACHEABLE_ROUTES) {
    if (pathname.startsWith(route.replace(':id', '').replace(':ownerId', '').replace(':productId', ''))) {
      return false;
    }
  }
  
  for (const route of CACHEABLE_ROUTES) {
    const pattern = route
      .replace(':id', '\\d+')
      .replace(':ownerId', '\\d+')
      .replace(':productId', '\\d+');
    const regex = new RegExp(`^${pattern.replace(/\//g, '\\/')}`);
    
    if (regex.test(pathname)) {
      return true;
    }
    
    if (pathname.startsWith(route.replace(':id', '').replace(':ownerId', '').replace(':productId', ''))) {
      return true;
    }
  }
  
  return false;
}

function getCacheDuration(pathname) {
  if (pathname.startsWith('/api/products') && pathname.match(/\/\d+$/)) {
    return CACHE_CONFIG.productDetail;
  }
  if (pathname.startsWith('/api/categories')) {
    return CACHE_CONFIG.categories;
  }
  if (pathname.startsWith('/api/banners')) {
    return CACHE_CONFIG.banners;
  }
  if (pathname.startsWith('/api/offers')) {
    return CACHE_CONFIG.offers;
  }
  if (pathname.startsWith('/api/shops')) {
    return CACHE_CONFIG.shops;
  }
  if (pathname.startsWith('/api/reviews')) {
    return CACHE_CONFIG.reviews;
  }
  if (pathname.startsWith('/api/health')) {
    return CACHE_CONFIG.health;
  }
  if (pathname.startsWith('/api/products')) {
    return CACHE_CONFIG.products;
  }
  
  return CACHE_CONFIG.default;
}

function generateCacheKey(url, searchParams, country) {
  const normalizedUrl = url.toLowerCase().replace(/\/$/, '');
  const sortedParams = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const geoKey = country ? `:${country}` : '';
  const key = `${normalizedUrl}${sortedParams ? `?${sortedParams}` : ''}${geoKey}`;
  // Use encodeURIComponent for Unicode-safe btoa
  return `edge:${btoa(encodeURIComponent(key)).replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' }[m] || ''))}`;
}

function extractCacheTags(pathname, method) {
  const tags = [];
  
  if (pathname.startsWith('/api/products')) {
    tags.push('products');
    const productId = pathname.match(/\/products\/(\d+)/)?.[1];
    if (productId) {
      tags.push(`product:${productId}`);
    }
  }
  
  if (pathname.startsWith('/api/categories')) {
    tags.push('categories');
  }
  
  if (pathname.startsWith('/api/banners')) {
    tags.push('banners');
  }
  
  if (pathname.startsWith('/api/offers')) {
    tags.push('offers');
  }
  
  if (pathname.startsWith('/api/shops')) {
    tags.push('shops');
  }
  
  if (method !== 'GET') {
    tags.push('mutations');
  }
  
  return tags;
}

// ============================================
// CLOUDFLARE WORKER
// ============================================

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request, event));
});

async function handleRequest(request, event) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  const method = request.method;
  
  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return fetch(request);
  }
  
  // Skip non-GET requests
  if (method !== 'GET') {
    return fetch(request);
  }
  
  // Check if route is cacheable
  if (!isCacheableRoute(pathname)) {
    return fetch(request);
  }
  
  // Get cache configuration
  const maxAge = getCacheDuration(pathname);
  const country = request.cf?.country || request.headers.get('cf-ipcountry') || undefined;
  
  // Generate cache key
  const cacheKey = generateCacheKey(pathname, searchParams, country);
  
  // Get cache (Cloudflare Cache API)
  const cache = caches.default;
  const cacheKeyRequest = new Request(request.url, request);
  
  // Try to get from cache
  let response = await cache.match(cacheKeyRequest);
  
  if (response) {
    // Cache hit - add headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Cache-Status', 'HIT');
    newHeaders.set('X-Cache-Key', cacheKey);
    newHeaders.set('X-Edge-Cache', 'enabled');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
  
  // Cache miss - fetch from origin
  try {
    response = await fetch(request);
    
    // Clone response for caching
    const responseToCache = response.clone();
    
    // Only cache successful responses
    if (response.status === 200) {
      // Add cache headers
      const newHeaders = new Headers(responseToCache.headers);
      newHeaders.set(
        'Cache-Control',
        `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`
      );
      
      // Add cache tags (Cloudflare supports Cache-Tag header)
      const tags = extractCacheTags(pathname, method);
      if (tags.length > 0) {
        newHeaders.set('Cache-Tag', tags.join(','));
      }
      
      newHeaders.set('X-Cache-Status', 'MISS');
      newHeaders.set('X-Cache-Key', cacheKey);
      newHeaders.set('X-Edge-Cache', 'enabled');
      newHeaders.set('Vary', 'Accept-Encoding');
      
      // Cache the response
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: newHeaders,
      });
      
      // Store in cache with TTL
      event.waitUntil(
        cache.put(cacheKeyRequest, cachedResponse)
      );
      
      return cachedResponse;
    }
    
    return response;
  } catch (error) {
    // Origin failure - try to serve stale cache
    const staleResponse = await cache.match(cacheKeyRequest, { ignoreMethod: true });
    
    if (staleResponse) {
      const newHeaders = new Headers(staleResponse.headers);
      newHeaders.set('X-Cache-Status', 'STALE');
      newHeaders.set('X-Edge-Cache', 'enabled');
      newHeaders.set('X-Origin-Error', 'true');
      
      return new Response(staleResponse.body, {
        status: staleResponse.status,
        statusText: staleResponse.statusText,
        headers: newHeaders,
      });
    }
    
    // No stale cache available - return error
    return new Response('Origin unavailable and no stale cache', {
      status: 503,
      headers: {
        'X-Edge-Cache': 'enabled',
        'X-Origin-Error': 'true',
      },
    });
  }
}
