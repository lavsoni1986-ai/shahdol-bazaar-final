/**
 * Express Middleware for CDN Cache Headers
 * 
 * This Express middleware adds HTTP cache headers to API responses,
 * enabling CDNs (Cloudflare, Vercel, Fastly) to cache public endpoints.
 * 
 * WHAT IT DOES:
 * - Adds Cache-Control headers with appropriate max-age values
 * - Adds Cache-Tags for targeted invalidation
 * - Adds debugging headers (X-Cache-Key, X-Edge-Cache)
 * 
 * WHAT IT DOES NOT DO:
 * - This is NOT Vercel Edge Middleware
 * - This does NOT implement actual caching
 * - Actual caching happens at the CDN level
 * 
 * USAGE:
 * import { apiCacheMiddleware } from './api-cache-headers';
 * app.use(apiCacheMiddleware);
 */

import { type Request, type Response, type NextFunction } from 'express';

// ============================================
// CACHEABLE ROUTES CONFIGURATION
// ============================================

/**
 * Routes that can be cached at the edge
 * These are public, read-only endpoints
 */
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
] as const;

/**
 * Routes that should NEVER be cached
 * These are user-specific, write operations, or sensitive data
 */
const NON_CACHEABLE_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/verify',
  '/api/upload',
  '/api/orders',
  '/api/cart',
  '/api/checkout',
  '/api/admin',
  '/api/merchant',
  '/api/partner/shop', // Without :ownerId - user-specific
  '/api/shops/mine',
  '/api/user',
  '/api/debug',
  '/api/webhooks',
  '/api/payments',
] as const;

/**
 * Cache duration configuration (in seconds)
 */
const CACHE_CONFIG = {
  // Short cache for frequently changing data
  products: 60,        // 1 minute
  productDetail: 300,  // 5 minutes
  categories: 600,     // 10 minutes (rarely change)
  banners: 300,        // 5 minutes
  offers: 300,         // 5 minutes
  shops: 300,          // 5 minutes
  reviews: 600,        // 10 minutes
  health: 30,          // 30 seconds
  default: 60,        // 1 minute default
} as const;

/**
 * Stale-while-revalidate duration (in seconds)
 * Serve stale content while revalidating in background
 */
const STALE_WHILE_REVALIDATE = 600; // 10 minutes

// ============================================
// CACHE KEY GENERATION
// ============================================

/**
 * Generate cache key based on URL, query params, and location
 * Prevents cache poisoning by including all relevant factors
 */
function generateCacheKey(
  url: string,
  searchParams: URLSearchParams,
  country?: string
): string {
  // Normalize URL (remove trailing slashes, lowercase)
  const normalizedUrl = url.toLowerCase().replace(/\/$/, '');
  
  // Sort query params for consistent keys
  const sortedParams = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // Include country for geo-specific caching (optional)
  const geoKey = country ? `:${country}` : '';
  
  // Build cache key
  const key = `${normalizedUrl}${sortedParams ? `?${sortedParams}` : ''}${geoKey}`;

  // Hash for shorter keys - use encodeURIComponent for Unicode safety
  try {
    const safeKey = encodeURIComponent(key);
    return `cdn:${btoa(safeKey).replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' }[m] || ''))}`;
  } catch {
    // Fallback: simple hash if btoa fails
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return `cdn:${Math.abs(hash).toString(36)}`;
  }
}

/**
 * Check if a route is cacheable
 */
function isCacheableRoute(pathname: string): boolean {
  // Check non-cacheable first (higher priority)
  for (const route of NON_CACHEABLE_ROUTES) {
    // Handle routes with wildcards
    const routePattern = route.replace(/:[\w]+/g, '');
    if (pathname.startsWith(routePattern)) {
      return false;
    }
  }
  
  // Check cacheable routes
  for (const route of CACHEABLE_ROUTES) {
    const pattern = route
      .replace(':id', '\\d+')
      .replace(':ownerId', '\\d+')
      .replace(':productId', '\\d+');
    const regex = new RegExp(`^${pattern.replace(/\//g, '\\/')}`);
    
    if (regex.test(pathname)) {
      return true;
    }
    
    // Also check exact match or prefix
    const cacheablePattern = route.replace(/:[\w]+/g, '');
    if (pathname.startsWith(cacheablePattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get cache duration for a specific route
 */
function getCacheDuration(pathname: string): number {
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

// ============================================
// CACHE INVALIDATION TAGS
// ============================================

/**
 * Extract cache tags from response headers
 * Tags are used for targeted invalidation
 */
function extractCacheTags(pathname: string, method: string): string[] {
  const tags: string[] = [];
  
  // Route-based tags
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
  
  // Method-based tags (for invalidation on writes)
  if (method !== 'GET') {
    tags.push('mutations');
  }
  
  return tags;
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Express middleware for CDN cache headers
 * 
 * Adds HTTP cache headers to API responses:
 * - Cache-Control: tells CDNs how to cache
 * - Cache-Tags: for targeted invalidation (Cloudflare)
 * - X-Cache-Key: debugging
 * - X-CDN-Cache: status indicator
 * 
 * @param req - Express request
 * @param res - Express response  
 * @param next - Express next function
 */
export function apiCacheMiddleware(req: Request, res: Response, next: NextFunction) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;
  const method = req.method;
  
  // For non-API routes, skip caching
  if (!pathname.startsWith('/api/')) {
    return next();
  }
  
  // Skip non-GET requests - don't add caching headers
  if (method !== 'GET') {
    return next();
  }
  
  // Check if route is cacheable
  if (!isCacheableRoute(pathname)) {
    // Non-cacheable route - pass through without cache headers
    return next();
  }
  
  // Get cache configuration
  const maxAge = getCacheDuration(pathname);
  
  // Get country from headers (Vercel/Cloudflare add this)
  const country = req.headers['x-vercel-ip-country'] as string || 
                  req.headers['cf-ipcountry'] as string || 
                  undefined;
  
  // Generate cache key for debugging
  const cacheKey = generateCacheKey(pathname, searchParams, country);
  
  // Add cache control headers
  // These tell CDNs how to cache the response
  res.setHeader(
    'Cache-Control', 
    `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}, must-revalidate`
  );
  
  // Add cache tags for targeted invalidation (Cloudflare-specific)
  res.setHeader(
    'Cache-Tags', 
    extractCacheTags(pathname, method).join(',')
  );
  
  // Add debugging headers
  res.setHeader('X-Cache-Key', cacheKey);
  res.setHeader('X-CDN-Cache', 'ENABLED');
  res.setHeader('X-Cache-Duration', maxAge.toString());
  
  // Vary on encoding for proper cache differentiation
  res.setHeader('Vary', 'Accept-Encoding, Accept');
  
  return next();
}

// ============================================
// EXPORTS
// ============================================

// Backward compatibility alias
export const middleware = apiCacheMiddleware;

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
