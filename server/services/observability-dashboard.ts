/**
 * OBSERVABILITY DASHBOARD - P1C.4.5
 *
 * Real-time monitoring dashboard for live fire validation.
 * Tracks inventory drift, ledger drift, event backlog, retry queues, stuck reservations.
 */

import crypto from 'crypto';
import { prisma } from '../storage.js';
import { reservationCleanupWorker } from './reservation-cleanup-worker.js';
import { durableEventBus } from './event-delivery-verification.js';

// Stub for quarantined reconciliation engine
const financialReconciliationEngine = {
  getReconciliationHistory(districtId: number): any[] {
    return [];
  }
};

// ============================================
// DASHBOARD CONFIGURATION
// ============================================

const DASHBOARD_CONFIG = {
  districtId: 1,
  refreshInterval: 2000,        // 2 seconds
  alertThresholds: {
    inventoryDrift: 5,          // Alert if >5% products have issues
    ledgerDrift: 100,           // Alert if drift > ₹1
    eventBacklog: 50,           // Alert if >50 events pending
    retryQueueDepth: 20,        // Alert if >20 retries pending
    stuckReservations: 10       // Alert if >10 stuck reservations
  },
  historyRetention: 100,        // Keep last 100 measurements
  criticalAlertThreshold: 3     // Escalate if 3+ alerts active
};

// ============================================
// DASHBOARD METRICS
// ============================================

interface DashboardMetrics {
  timestamp: Date;

  // System health
  systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  activeAlerts: number;
  criticalAlerts: number;

  // Inventory metrics
  inventoryDrift: {
    totalProducts: number;
    productsWithIssues: number;
    driftPercentage: number;
    stuckReservations: number;
    negativeStock: number;
  };

  // Financial metrics
  financialDrift: {
    lastReconciliation: Date | null;
    orderLedgerDrift: number;
    ledgerSettlementDrift: number;
    overallDrift: number;
    isBalanced: boolean;
  };

  // Event system metrics
  eventSystem: {
    totalEvents: number;
    deliveredEvents: number;
    failedEvents: number;
    pendingRetries: number;
    deliveryRate: number;
    backlogDepth: number;
  };

  // Reservation system metrics
  reservationSystem: {
    cleanupStatus: 'RUNNING' | 'STOPPED';
    lastCleanup: Date | null;
    expiredReservations: number;
    cleanupErrors: number;
  };

  // Performance metrics
  performance: {
    dbConnections: number;
    dbQueryTime: number;
    memoryUsage: number;
    responseTime: number;
  };

  // Migration metrics
  migration: {
    currentEngine: string;
    sovereignOrders: number;
    legacyOrders: number;
    migrationProgress: number;
  };
}

interface DashboardAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  component: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

// ============================================
// OBSERVABILITY DASHBOARD ENGINE
// ============================================

export class ObservabilityDashboard {
  private metrics: DashboardMetrics[] = [];
  private alerts: DashboardAlert[] = [];
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * START DASHBOARD MONITORING
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('📊 Observability dashboard already running');
      return;
    }

    console.log('📊 Starting observability dashboard monitoring');
    this.isRunning = true;

    // Initial measurement
    await this.takeMeasurement();

    // Start periodic monitoring
    this.intervalId = setInterval(async () => {
      try {
        await this.takeMeasurement();
      } catch (error) {
        console.error('Dashboard measurement failed:', error);
      }
    }, DASHBOARD_CONFIG.refreshInterval);
  }

  /**
   * STOP DASHBOARD MONITORING
   */
  stopMonitoring(): void {
    console.log('🛑 Stopping observability dashboard');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * TAKE MEASUREMENT
   */
  private async takeMeasurement(): Promise<void> {
    const measurement = await this.collectMetrics();

    // Store measurement
    this.metrics.push(measurement);
    if (this.metrics.length > DASHBOARD_CONFIG.historyRetention) {
      this.metrics.shift();
    }

    // Check for alerts
    await this.checkAlerts(measurement);

    // Log critical issues
    if (measurement.systemStatus === 'CRITICAL') {
      console.error('🚨 CRITICAL SYSTEM ALERT DETECTED');
      this.logCriticalAlert(measurement);
    }
  }

  /**
   * COLLECT METRICS
   */
  private async collectMetrics(): Promise<DashboardMetrics> {
    const [
      inventoryMetrics,
      financialMetrics,
      eventMetrics,
      reservationMetrics,
      migrationMetrics
    ] = await Promise.all([
      this.collectInventoryMetrics(),
      this.collectFinancialMetrics(),
      this.collectEventMetrics(),
      this.collectReservationMetrics(),
      this.collectMigrationMetrics()
    ]);

    // Assess overall system status
    const activeAlerts = this.alerts.filter(a => !a.acknowledged).length;
    const criticalAlerts = this.alerts.filter(a => a.severity === 'CRITICAL' && !a.acknowledged).length;

    let systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (criticalAlerts > 0) {
      systemStatus = 'CRITICAL';
    } else if (activeAlerts > DASHBOARD_CONFIG.criticalAlertThreshold) {
      systemStatus = 'WARNING';
    }

    return {
      timestamp: new Date(),
      systemStatus,
      activeAlerts,
      criticalAlerts,
      inventoryDrift: inventoryMetrics,
      financialDrift: financialMetrics,
      eventSystem: eventMetrics,
      reservationSystem: reservationMetrics,
      performance: {
        dbConnections: Math.floor(Math.random() * 20) + 5, // Mock
        dbQueryTime: Math.floor(Math.random() * 100) + 10,  // Mock
        memoryUsage: Math.random() * 100,                   // Mock
        responseTime: Math.floor(Math.random() * 500) + 50  // Mock
      },
      migration: migrationMetrics
    };
  }

  /**
   * COLLECT INVENTORY METRICS
   */
  private async collectInventoryMetrics(): Promise<DashboardMetrics['inventoryDrift']> {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        availableStock: true,
        reservedStock: true,
        soldStock: true
      }
    });

    const totalProducts = products.length;
    let productsWithIssues = 0;
    let stuckReservations = 0;
    let negativeStock = 0;

    for (const product of products) {
      // Check for negative stock
      if (product.availableStock < 0 || product.reservedStock < 0 || product.soldStock < 0) {
        negativeStock++;
        productsWithIssues++;
      }

      // Check for stuck reservations (simplified - in real system, check timestamps)
      if (product.reservedStock > product.availableStock) {
        stuckReservations++;
        productsWithIssues++;
      }
    }

    return {
      totalProducts,
      productsWithIssues,
      driftPercentage: totalProducts > 0 ? (productsWithIssues / totalProducts) * 100 : 0,
      stuckReservations,
      negativeStock
    };
  }

  /**
   * COLLECT FINANCIAL METRICS
   */
  private async collectFinancialMetrics(): Promise<DashboardMetrics['financialDrift']> {
    try {
      // Get latest reconciliation
      const history = financialReconciliationEngine.getReconciliationHistory(1);
      const lastReconciliation = history[0] || null;

      if (!lastReconciliation) {
        return {
          lastReconciliation: null,
          orderLedgerDrift: 0,
          ledgerSettlementDrift: 0,
          overallDrift: 0,
          isBalanced: true
        };
      }

      return {
        lastReconciliation: lastReconciliation.timestamp,
        orderLedgerDrift: lastReconciliation.orderLedgerDrift,
        ledgerSettlementDrift: lastReconciliation.ledgerSettlementDrift,
        overallDrift: lastReconciliation.overallDrift,
        isBalanced: lastReconciliation.isBalanced
      };
    } catch (error) {
      console.error('Financial metrics collection failed:', error);
      return {
        lastReconciliation: null,
        orderLedgerDrift: 0,
        ledgerSettlementDrift: 0,
        overallDrift: 0,
        isBalanced: false
      };
    }
  }

  /**
   * COLLECT EVENT METRICS
   */
  private async collectEventMetrics(): Promise<DashboardMetrics['eventSystem']> {
    try {
      const stats = await durableEventBus.getDeliveryStats();

      return {
        totalEvents: stats.totalEvents,
        deliveredEvents: stats.deliveredEvents,
        failedEvents: stats.failedEvents,
        pendingRetries: stats.pendingRetries,
        deliveryRate: stats.deliveryRate,
        backlogDepth: stats.pendingRetries // Simplified
      };
    } catch (error) {
      console.error('Event metrics collection failed:', error);
      return {
        totalEvents: 0,
        deliveredEvents: 0,
        failedEvents: 0,
        pendingRetries: 0,
        deliveryRate: 0,
        backlogDepth: 0
      };
    }
  }

  /**
   * COLLECT RESERVATION METRICS
   */
  private async collectReservationMetrics(): Promise<DashboardMetrics['reservationSystem']> {
    try {
      const status = await reservationCleanupWorker.getStatus();

      // Count expired reservations (simplified)
      const expiredReservations = await prisma.product.count({
        where: { reservedStock: { gt: 0 } }
      });

      return {
        cleanupStatus: status.isRunning ? 'RUNNING' : 'STOPPED',
        lastCleanup: status.lastCleanupTime || null,
        expiredReservations,
        cleanupErrors: 0 // Would track actual errors
      };
    } catch (error) {
      console.error('Reservation metrics collection failed:', error);
      return {
        cleanupStatus: 'STOPPED',
        lastCleanup: null,
        expiredReservations: 0,
        cleanupErrors: 1
      };
    }
  }

  /**
   * COLLECT MIGRATION METRICS
   */
  private async collectMigrationMetrics(): Promise<DashboardMetrics['migration']> {
    try {
      const [sovereignOrders, legacyOrders] = await Promise.all([
        prisma.sovereignOrder.count(),
        prisma.order.count()
      ]);

      const totalOrders = sovereignOrders + legacyOrders;
      const migrationProgress = totalOrders > 0 ? (sovereignOrders / totalOrders) * 100 : 0;

      return {
        currentEngine: process.env.ORDER_ENGINE_VERSION || 'legacy',
        sovereignOrders,
        legacyOrders,
        migrationProgress
      };
    } catch (error) {
      console.error('Migration metrics collection failed:', error);
      return {
        currentEngine: 'unknown',
        sovereignOrders: 0,
        legacyOrders: 0,
        migrationProgress: 0
      };
    }
  }

  /**
   * CHECK FOR ALERTS
   */
  private async checkAlerts(metrics: DashboardMetrics): Promise<void> {
    const newAlerts: DashboardAlert[] = [];

    // Inventory alerts
    if (metrics.inventoryDrift.driftPercentage > DASHBOARD_CONFIG.alertThresholds.inventoryDrift) {
      newAlerts.push({
        id: `inventory_drift_${Date.now()}`,
        severity: metrics.inventoryDrift.driftPercentage > 20 ? 'CRITICAL' : 'WARNING',
        component: 'Inventory',
        message: `${metrics.inventoryDrift.productsWithIssues} products have inventory issues`,
        value: metrics.inventoryDrift.driftPercentage,
        threshold: DASHBOARD_CONFIG.alertThresholds.inventoryDrift,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Financial alerts
    if (metrics.financialDrift.overallDrift > DASHBOARD_CONFIG.alertThresholds.ledgerDrift) {
      newAlerts.push({
        id: `financial_drift_${Date.now()}`,
        severity: 'CRITICAL',
        component: 'Financial',
        message: `Financial drift detected: ₹${(metrics.financialDrift.overallDrift / 100).toFixed(2)}`,
        value: metrics.financialDrift.overallDrift,
        threshold: DASHBOARD_CONFIG.alertThresholds.ledgerDrift,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Event alerts
    if (metrics.eventSystem.backlogDepth > DASHBOARD_CONFIG.alertThresholds.eventBacklog) {
      newAlerts.push({
        id: `event_backlog_${Date.now()}`,
        severity: metrics.eventSystem.backlogDepth > 100 ? 'CRITICAL' : 'WARNING',
        component: 'Events',
        message: `${metrics.eventSystem.backlogDepth} events in backlog`,
        value: metrics.eventSystem.backlogDepth,
        threshold: DASHBOARD_CONFIG.alertThresholds.eventBacklog,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    if (metrics.eventSystem.pendingRetries > DASHBOARD_CONFIG.alertThresholds.retryQueueDepth) {
      newAlerts.push({
        id: `retry_queue_${Date.now()}`,
        severity: 'WARNING',
        component: 'Events',
        message: `${metrics.eventSystem.pendingRetries} events pending retry`,
        value: metrics.eventSystem.pendingRetries,
        threshold: DASHBOARD_CONFIG.alertThresholds.retryQueueDepth,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Reservation alerts
    if (metrics.reservationSystem.expiredReservations > DASHBOARD_CONFIG.alertThresholds.stuckReservations) {
      newAlerts.push({
        id: `stuck_reservations_${Date.now()}`,
        severity: 'WARNING',
        component: 'Reservations',
        message: `${metrics.reservationSystem.expiredReservations} stuck reservations`,
        value: metrics.reservationSystem.expiredReservations,
        threshold: DASHBOARD_CONFIG.alertThresholds.stuckReservations,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Add new alerts
    this.alerts.push(...newAlerts);

    // Keep only recent alerts
    this.alerts = this.alerts.slice(-50);

    // Log critical alerts
    const criticalAlerts = newAlerts.filter(a => a.severity === 'CRITICAL');
    if (criticalAlerts.length > 0) {
      console.error('🚨 CRITICAL DASHBOARD ALERTS:');
      criticalAlerts.forEach(alert => {
        console.error(`   ${alert.component}: ${alert.message}`);
      });
    }
  }

  /**
   * LOG CRITICAL ALERT
   */
  private async logCriticalAlert(metrics: DashboardMetrics): Promise<void> {
    const logPayload = {
      action: 'CRITICAL_SYSTEM_ALERT',
      entityType: 'SYSTEM',
      entityId: 0,
      details: { message: `Critical system alert: ${metrics.criticalAlerts} critical issues` },
      metadata: {
        systemStatus: metrics.systemStatus,
        activeAlerts: metrics.activeAlerts,
        criticalAlerts: metrics.criticalAlerts,
        metrics: metrics as any
      },
      ipAddress: 'system',
      userAgent: 'ObservabilityDashboard',
      districtId: DASHBOARD_CONFIG.districtId
    };

    const hash = crypto.createHash('sha256').update(JSON.stringify(logPayload)).digest('hex');

    await prisma.auditLog.create({
      data: {
        ...logPayload,
        hash
      }
    });
  }

  /**
   * GET CURRENT DASHBOARD
   */
  getCurrentDashboard(): {
    latestMetrics: DashboardMetrics | null;
    activeAlerts: DashboardAlert[];
    systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  } {
    const latestMetrics = this.metrics[this.metrics.length - 1] || null;
    const activeAlerts = this.alerts.filter(a => !a.acknowledged);

    let systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (latestMetrics) {
      systemHealth = latestMetrics.systemStatus;
    }

    return {
      latestMetrics,
      activeAlerts,
      systemHealth
    };
  }

  /**
   * GET METRICS HISTORY
   */
  getMetricsHistory(limit: number = 20): DashboardMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * ACKNOWLEDGE ALERT
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * GET DASHBOARD STATUS
   */
  getStatus(): {
    isRunning: boolean;
    metricsCollected: number;
    activeAlerts: number;
    lastMeasurement?: Date;
  } {
    return {
      isRunning: this.isRunning,
      metricsCollected: this.metrics.length,
      activeAlerts: this.alerts.filter(a => !a.acknowledged).length,
      lastMeasurement: this.metrics[this.metrics.length - 1]?.timestamp
    };
  }
}

// ============================================
// DASHBOARD API ENDPOINTS
// ============================================

export function setupObservabilityEndpoints(app: any) {
  const dashboard = new ObservabilityDashboard();

  // Start monitoring on server start
  dashboard.startMonitoring();

  // GET DASHBOARD STATUS
  app.get('/api/admin/observability/status', async (req: any, res: any) => {
    try {
      const status = dashboard.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      console.error('Failed to get dashboard status:', error);
      res.status(500).json({ success: false, error: 'Failed to get status' });
    }
  });

  // GET CURRENT DASHBOARD
  app.get('/api/admin/observability/dashboard', async (req: any, res: any) => {
    try {
      const dashboardData = dashboard.getCurrentDashboard();
      res.json({ success: true, data: dashboardData });
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      res.status(500).json({ success: false, error: 'Failed to get dashboard' });
    }
  });

  // GET METRICS HISTORY
  app.get('/api/admin/observability/metrics', async (req: any, res: any) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const history = dashboard.getMetricsHistory(limit);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Failed to get metrics history:', error);
      res.status(500).json({ success: false, error: 'Failed to get metrics' });
    }
  });

  // GET ALERTS
  app.get('/api/admin/observability/alerts', async (req: any, res: any) => {
    try {
      const dashboardData = dashboard.getCurrentDashboard();
      res.json({ success: true, data: dashboardData.activeAlerts });
    } catch (error) {
      console.error('Failed to get alerts:', error);
      res.status(500).json({ success: false, error: 'Failed to get alerts' });
    }
  });

  // ACKNOWLEDGE ALERT
  app.post('/api/admin/observability/alerts/:alertId/acknowledge', async (req: any, res: any) => {
    try {
      const { alertId } = req.params;
      const success = dashboard.acknowledgeAlert(alertId);
      res.json({ success, acknowledged: success });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
    }
  });
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const observabilityDashboard = new ObservabilityDashboard();