/**
 * MIGRATION OBSERVABILITY DASHBOARD
 *
 * Real-time monitoring for order engine migration.
 * Tracks discrepancies between legacy and sovereign systems.
 */

import { prisma } from '../storage.js';

export interface MigrationMetrics {
  legacyOrdersCount: number;
  sovereignOrdersCount: number;
  stockDiscrepancies: number;
  orderDiscrepancies: number;
  paymentMismatches: number;
  duplicateAttempts: number;
  lastMigrationCheck: Date;
}

export class MigrationObservability {

  /**
   * GET MIGRATION HEALTH METRICS
   */
  async getMigrationHealth(): Promise<MigrationMetrics> {
    const [
      legacyOrdersCount,
      sovereignOrdersCount,
      stockDiscrepancies,
      orderDiscrepancies,
      paymentMismatches,
      duplicateAttempts
    ] = await Promise.all([
      // Legacy orders count
      prisma.order.count(),

      // Sovereign orders count
      prisma.sovereignOrder.count(),

      // Stock discrepancies (products with negative available stock)
      prisma.product.count({
        where: { availableStock: { lt: 0 } }
      }),

      // Order discrepancies (orders without matching items)
      this.getOrderDiscrepancies(),

      // Payment mismatches
      this.getPaymentMismatches(),

      // Duplicate order attempts (same user, same items within time window)
      this.getDuplicateAttempts()
    ]);

    return {
      legacyOrdersCount,
      sovereignOrdersCount,
      stockDiscrepancies,
      orderDiscrepancies,
      paymentMismatches,
      duplicateAttempts,
      lastMigrationCheck: new Date()
    };
  }

  /**
   * DETECT ORDER DISCREPANCIES
   */
  private async getOrderDiscrepancies(): Promise<number> {
    // Orders that exist but have no corresponding items
    const ordersWithoutItems = await prisma.order.count({
      where: {
        // Legacy orders don't have item relationships
        // This would need custom logic for legacy vs sovereign comparison
      }
    });

    return ordersWithoutItems;
  }

  /**
   * DETECT PAYMENT MISMATCHES
   */
  private async getPaymentMismatches(): Promise<number> {
    // Orders where payment status doesn't match expectations
    const mismatchedPayments = await prisma.order.count({
      where: {
        paymentStatus: "pending",
        status: "delivered" // Should have been paid if delivered
      }
    });

    return mismatchedPayments;
  }

  /**
   * DETECT DUPLICATE ORDER ATTEMPTS
   */
  private async getDuplicateAttempts(): Promise<number> {
    // This would require analyzing order creation patterns
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * LOG MIGRATION EVENT
   */
  async logMigrationEvent(eventType: string, data: any) {
    console.log(`🔄 [MIGRATION MONITOR] ${eventType}:`, data);

    // TODO: Store in migration audit table
    // await prisma.migrationAudit.create({
    //   data: { eventType, data, timestamp: new Date() }
    // });
  }

  /**
   * HEALTH CHECK ENDPOINT DATA
   */
  async getHealthDashboard() {
    const metrics = await this.getMigrationHealth();

    return {
      status: "migration_active",
      timestamp: new Date().toISOString(),
      metrics,
      alerts: this.generateAlerts(metrics),
      recommendations: this.generateRecommendations(metrics)
    };
  }

  /**
   * GENERATE ALERTS BASED ON METRICS
   */
  private generateAlerts(metrics: MigrationMetrics): string[] {
    const alerts: string[] = [];

    if (metrics.stockDiscrepancies > 0) {
      alerts.push(`🚨 ${metrics.stockDiscrepancies} products have negative stock`);
    }

    if (metrics.paymentMismatches > 0) {
      alerts.push(`🚨 ${metrics.paymentMismatches} orders have payment mismatches`);
    }

    if (metrics.duplicateAttempts > 10) {
      alerts.push(`⚠️ High duplicate order attempts detected`);
    }

    if (metrics.sovereignOrdersCount === 0 && metrics.legacyOrdersCount > 100) {
      alerts.push(`⚠️ No sovereign orders created yet`);
    }

    return alerts;
  }

  /**
   * GENERATE RECOMMENDATIONS
   */
  private generateRecommendations(metrics: MigrationMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.stockDiscrepancies > 0) {
      recommendations.push("Audit products with negative stock and correct inventory");
    }

    if (metrics.sovereignOrdersCount < metrics.legacyOrdersCount * 0.1) {
      recommendations.push("Increase sovereign engine adoption rate");
    }

    if (metrics.paymentMismatches > 0) {
      recommendations.push("Review payment reconciliation process");
    }

    recommendations.push("Monitor migration metrics daily");
    recommendations.push("Prepare rollback plan if discrepancies exceed threshold");

    return recommendations;
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const migrationObservability = new MigrationObservability();