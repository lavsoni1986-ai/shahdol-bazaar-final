/**
 * Cache Invalidation Utility
 * 
 * Provides functions to invalidate edge cache by tags
 * 
 * Usage:
 * - Call after product updates
 * - Call after category changes
 * - Call after admin actions
 */

import fetch from 'node-fetch';

const EDGE_CACHE_API_URL = process.env.EDGE_CACHE_API_URL || 'https://api.vercel.com/v1/invalidate';
const EDGE_CACHE_TOKEN = process.env.EDGE_CACHE_TOKEN || process.env.VERCEL_TOKEN;

/**
 * Invalidate cache by tags
 * 
 * @param tags - Array of cache tags to invalidate
 * @param paths - Optional specific paths to invalidate
 */
export async function invalidateCacheByTags(
  tags: string[],
  paths?: string[]
): Promise<void> {
  if (!EDGE_CACHE_TOKEN) {
    console.warn('⚠️ Edge cache token not configured, skipping invalidation');
    return;
  }

  try {
    // Vercel Cache Tags API (if using Vercel)
    if (EDGE_CACHE_API_URL.includes('vercel.com')) {
      const response = await fetch(`${EDGE_CACHE_API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EDGE_CACHE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags,
          paths: paths || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Cache invalidation failed: ${response.statusText}`);
      }

      console.log(`✅ Cache invalidated for tags: ${tags.join(', ')}`);
    } else {
      // Cloudflare Cache Tags API
      const response = await fetch(`${EDGE_CACHE_API_URL}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EDGE_CACHE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags,
        }),
      });

      if (!response.ok) {
        throw new Error(`Cache invalidation failed: ${response.statusText}`);
      }

      console.log(`✅ Cache invalidated for tags: ${tags.join(', ')}`);
    }
  } catch (error: any) {
    console.error('❌ Cache invalidation error:', error.message);
    // Don't throw - cache invalidation failure shouldn't break the app
  }
}

/**
 * Invalidate product cache
 */
export async function invalidateProductCache(productId: number): Promise<void> {
  await invalidateCacheByTags([
    'products',
    `product:${productId}`,
  ]);
}

/**
 * Invalidate all products cache
 */
export async function invalidateAllProductsCache(): Promise<void> {
  await invalidateCacheByTags(['products']);
}

/**
 * Invalidate category cache
 */
export async function invalidateCategoryCache(): Promise<void> {
  await invalidateCacheByTags(['categories']);
}

/**
 * Invalidate banner cache
 */
export async function invalidateBannerCache(): Promise<void> {
  await invalidateCacheByTags(['banners']);
}

/**
 * Invalidate offers cache
 */
export async function invalidateOffersCache(): Promise<void> {
  await invalidateCacheByTags(['offers']);
}

/**
 * Invalidate shops cache
 */
export async function invalidateShopsCache(shopId?: number): Promise<void> {
  const tags = ['shops'];
  if (shopId) {
    tags.push(`shop:${shopId}`);
  }
  await invalidateCacheByTags(tags);
}

/**
 * Invalidate reviews cache for a product
 */
export async function invalidateReviewsCache(productId: number): Promise<void> {
  await invalidateCacheByTags([
    'reviews',
    `product:${productId}`,
  ]);
}
