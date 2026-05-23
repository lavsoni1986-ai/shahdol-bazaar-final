import { getAdminMetrics } from "../repositories/admin.repo";

// ============================================
// 👑 ADMIN SERVICE LAYER
// ============================================
// Business logic for admin operations

export class AdminService {
  // Get cached admin metrics
  // 🚨 CRITICAL BLOCKER: This in-memory cache FAILS with multiple servers
  // REQUIRED: Redis implementation before 8+ districts
  // Current status: Single-server only, will cause data inconsistency
  private static metricsCache = new Map<string, { data: any; timestamp: number }>();

  static async getMetrics(districtId: number) {
    const cacheKey = `admin_metrics_${districtId}`;
    const CACHE_TTL = 60 * 1000; // 60 seconds

    // 🚨 TEMPORARY: In-memory cache (WORKS FOR SINGLE SERVER ONLY)
    // 🚨 WILL BREAK WITH LOAD BALANCER/MULTIPLE SERVERS
    const cached = this.metricsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }

    // Calculate real metrics using repo
    const metrics: any = await getAdminMetrics(districtId);

    // Calculate derived metrics
    const totalProducts = metrics.pendingApprovals + metrics.approvedProducts;
    metrics.approvalRate = totalProducts > 0 ? (metrics.approvedProducts / totalProducts * 100).toFixed(1) + '%' : '0%';
    metrics.orderCompletionRate = metrics.totalOrders > 0 ? (metrics.completedOrders / metrics.totalOrders * 100).toFixed(1) + '%' : '0%';

    // Cache the results (⚠️ Will not work across multiple server instances)
    this.metricsCache.set(cacheKey, { data: metrics, timestamp: Date.now() });

    return metrics;
  }

  // Invalidate metrics cache when data changes
  static invalidateMetricsCache(districtId: number) {
    const cacheKey = `admin_metrics_${districtId}`;
    this.metricsCache.delete(cacheKey);
  }
}
