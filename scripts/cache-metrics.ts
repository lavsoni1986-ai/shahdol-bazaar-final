/**
 * Cache Metrics Tracking
 * 
 * Tracks cache performance metrics:
 * - Cache hit ratio
 * - Edge latency
 * - Origin load reduction
 * - TTFB
 */

interface CacheMetrics {
  hits: number;
  misses: number;
  stales: number;
  errors: number;
  totalRequests: number;
  totalLatency: number;
  originRequests: number;
}

class CacheMetricsTracker {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    stales: 0,
    errors: 0,
    totalRequests: 0,
    totalLatency: 0,
    originRequests: 0,
  };

  /**
   * Record a cache event
   */
  recordCacheEvent(
    status: 'HIT' | 'MISS' | 'STALE' | 'ERROR',
    latency: number,
    fromOrigin: boolean = false
  ): void {
    this.metrics.totalRequests++;
    this.metrics.totalLatency += latency;

    switch (status) {
      case 'HIT':
        this.metrics.hits++;
        break;
      case 'MISS':
        this.metrics.misses++;
        if (fromOrigin) {
          this.metrics.originRequests++;
        }
        break;
      case 'STALE':
        this.metrics.stales++;
        break;
      case 'ERROR':
        this.metrics.errors++;
        break;
    }
  }

  /**
   * Get cache hit ratio
   */
  getCacheHitRatio(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.hits + this.metrics.stales) / this.metrics.totalRequests;
  }

  /**
   * Get origin load reduction
   */
  getOriginLoadReduction(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return 1 - (this.metrics.originRequests / this.metrics.totalRequests);
  }

  /**
   * Get average latency
   */
  getAverageLatency(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return this.metrics.totalLatency / this.metrics.totalRequests;
  }

  /**
   * Get all metrics
   */
  getMetrics(): CacheMetrics & {
    hitRatio: number;
    originLoadReduction: number;
    averageLatency: number;
  } {
    return {
      ...this.metrics,
      hitRatio: this.getCacheHitRatio(),
      originLoadReduction: this.getOriginLoadReduction(),
      averageLatency: this.getAverageLatency(),
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      stales: 0,
      errors: 0,
      totalRequests: 0,
      totalLatency: 0,
      originRequests: 0,
    };
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(this.getMetrics(), null, 2);
  }
}

// Singleton instance
export const cacheMetrics = new CacheMetricsTracker();

/**
 * Extract cache status from response headers
 */
export function extractCacheStatus(response: Response): 'HIT' | 'MISS' | 'STALE' | 'ERROR' {
  const status = response.headers.get('X-Cache-Status');
  
  switch (status?.toUpperCase()) {
    case 'HIT':
      return 'HIT';
    case 'MISS':
      return 'MISS';
    case 'STALE':
      return 'STALE';
    default:
      return 'ERROR';
  }
}

/**
 * Log cache metrics (for monitoring)
 */
export function logCacheMetrics(): void {
  const metrics = cacheMetrics.getMetrics();
  
  console.log('📊 Cache Metrics:', {
    hitRatio: `${(metrics.hitRatio * 100).toFixed(2)}%`,
    originLoadReduction: `${(metrics.originLoadReduction * 100).toFixed(2)}%`,
    averageLatency: `${metrics.averageLatency.toFixed(2)}ms`,
    totalRequests: metrics.totalRequests,
    hits: metrics.hits,
    misses: metrics.misses,
    stales: metrics.stales,
  });
}
