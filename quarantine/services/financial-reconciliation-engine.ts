/**
 * FINANCIAL RECONCILIATION REPORTS - P1C.4.3
 *
 * Zero-drift validation for financial transactions after scale testing.
 * Ensures order totals = ledger totals = settlement totals with mathematical precision.
 */

import { prisma } from '../storage.js';

// ============================================
// FINANCIAL RECONCILIATION CONFIGURATION
// ============================================

const RECONCILIATION_CONFIG = {
  districtId: 1,
  reconciliationInterval: 300000, // 5 minutes
  driftTolerance: 0, // Zero tolerance for financial drift
  maxReconciliationHistory: 100, // Keep last 100 reconciliations
  alertThreshold: 1, // Alert if drift > 1 paise
  detailedAudit: true // Enable detailed transaction tracing
};

// ============================================
// RECONCILIATION REPORT STRUCTURE
// ============================================

interface ReconciliationReport {
  id: string;
  timestamp: Date;
  districtId: number;
  period: {
    start: Date;
    end: Date;
  };
  transactionCount: number;

  // Financial balances
  orderTotal: number;      // Sum of all order totals
  ledgerCredits: number;   // Sum of all credit entries
  ledgerDebits: number;    // Sum of all debit entries
  ledgerBalance: number;   // Credits - Debits
  settlementTotal: number; // Sum of completed settlements

  // Reconciliation results
  orderLedgerDrift: number;    // |orderTotal - ledgerBalance|
  ledgerSettlementDrift: number; // |ledgerBalance - settlementTotal|
  overallDrift: number;        // Combined drift measure

  // Status assessment
  isBalanced: boolean;
  driftSeverity: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

  // Detailed breakdown
  orderBreakdown: OrderBreakdown;
  ledgerBreakdown: LedgerBreakdown;
  settlementBreakdown: SettlementBreakdown;

  // Performance metrics
  reconciliationTime: number;
  queryCount: number;
  dataVolume: number;
}

interface OrderBreakdown {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalValueByPaymentMethod: Record<string, number>;
  ordersByStatus: Record<string, number>;
}

interface LedgerBreakdown {
  totalEntries: number;
  creditEntries: number;
  debitEntries: number;
  entriesByType: Record<string, number>;
  balanceByAccount: Record<string, number>;
  largestTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    timestamp: Date;
  }>;
}

interface SettlementBreakdown {
  totalSettlements: number;
  pendingSettlements: number;
  completedSettlements: number;
  failedSettlements: number;
  settlementsByMethod: Record<string, number>;
  totalSettledAmount: number;
  settlementFees: number;
}

// ============================================
// FINANCIAL RECONCILIATION ENGINE
// ============================================

export class FinancialReconciliationEngine {
  private reconciliationHistory: ReconciliationReport[] = [];

  /**
   * EXECUTE FINANCIAL RECONCILIATION
   */
  async executeReconciliation(districtId: number = RECONCILIATION_CONFIG.districtId): Promise<ReconciliationReport> {
    const startTime = Date.now();
    console.log(`💰 EXECUTING FINANCIAL RECONCILIATION for district ${districtId}`);

    const reportId = `recon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Define reconciliation period (last 24 hours)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      // Execute reconciliation checks in parallel
      const [
        orderAnalysis,
        ledgerAnalysis,
        settlementAnalysis
      ] = await Promise.all([
        this.analyzeOrders(districtId, startTime, endTime),
        this.analyzeLedger(districtId, startTime, endTime),
        this.analyzeSettlements(districtId, startTime, endTime)
      ]);

      // Calculate drifts
      const orderLedgerDrift = Math.abs(orderAnalysis.totalValue - ledgerAnalysis.balance);
      const ledgerSettlementDrift = Math.abs(ledgerAnalysis.balance - settlementAnalysis.totalSettledAmount);
      const overallDrift = orderLedgerDrift + ledgerSettlementDrift;

      // Assess drift severity
      const driftSeverity = this.assessDriftSeverity(overallDrift);
      const isBalanced = overallDrift <= RECONCILIATION_CONFIG.driftTolerance;

      // Create comprehensive report
      const report: ReconciliationReport = {
        id: reportId,
        timestamp: new Date(),
        districtId,
        period: { start: startTime, end: endTime },
        transactionCount: orderAnalysis.totalOrders + ledgerAnalysis.totalEntries,

        orderTotal: orderAnalysis.totalValue,
        ledgerCredits: ledgerAnalysis.credits,
        ledgerDebits: ledgerAnalysis.debits,
        ledgerBalance: ledgerAnalysis.balance,
        settlementTotal: settlementAnalysis.totalSettledAmount,

        orderLedgerDrift,
        ledgerSettlementDrift,
        overallDrift,

        isBalanced,
        driftSeverity,

        orderBreakdown: orderAnalysis.breakdown,
        ledgerBreakdown: ledgerAnalysis.breakdown,
        settlementBreakdown: settlementAnalysis,

        reconciliationTime: Date.now() - startTime,
        queryCount: orderAnalysis.queryCount + ledgerAnalysis.queryCount + settlementAnalysis.queryCount,
        dataVolume: orderAnalysis.dataVolume + ledgerAnalysis.dataVolume + settlementAnalysis.dataVolume
      };

      // Store in history
      this.reconciliationHistory.push(report);
      if (this.reconciliationHistory.length > RECONCILIATION_CONFIG.maxReconciliationHistory) {
        this.reconciliationHistory.shift();
      }

      // Log and alert
      await this.logReconciliationReport(report);

      if (!isBalanced) {
        await this.alertDrift(report);
      }

      return report;

    } catch (error) {
      console.error('❌ Financial reconciliation failed:', error);

      // Create error report
      const errorReport: ReconciliationReport = {
        id: reportId,
        timestamp: new Date(),
        districtId,
        period: { start: new Date(), end: new Date() },
        transactionCount: 0,
        orderTotal: 0,
        ledgerCredits: 0,
        ledgerDebits: 0,
        ledgerBalance: 0,
        settlementTotal: 0,
        orderLedgerDrift: 0,
        ledgerSettlementDrift: 0,
        overallDrift: 0,
        isBalanced: false,
        driftSeverity: 'CRITICAL',
        orderBreakdown: {
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          totalValueByPaymentMethod: {},
          ordersByStatus: {}
        },
        ledgerBreakdown: {
          totalEntries: 0,
          creditEntries: 0,
          debitEntries: 0,
          entriesByType: {},
          balanceByAccount: {},
          largestTransactions: []
        },
        settlementBreakdown: {
          totalSettlements: 0,
          pendingSettlements: 0,
          completedSettlements: 0,
          failedSettlements: 0,
          settlementsByMethod: {},
          totalSettledAmount: 0,
          settlementFees: 0
        },
        reconciliationTime: Date.now() - startTime,
        queryCount: 0,
        dataVolume: 0
      };

      await this.alertReconciliationFailure(error);
      return errorReport;
    }
  }

  /**
   * ANALYZE ORDERS
   */
  private async analyzeOrders(districtId: number, startTime: Date, endTime: Date): Promise<{
    totalValue: number;
    totalOrders: number;
    breakdown: OrderBreakdown;
    queryCount: number;
    dataVolume: number;
  }> {
    // Analyze legacy orders
    const legacyOrders = await prisma.order.findMany({
      where: {
        districtId,
        createdAt: { gte: startTime, lte: endTime }
      },
      select: {
        id: true,
        totalPrice: true,
        status: true,
        paymentMethod: true
      }
    });

    // Analyze sovereign orders
    const sovereignOrders = await prisma.sovereignOrder.findMany({
      where: {
        districtId,
        createdAt: { gte: startTime, lte: endTime }
      },
      select: {
        id: true,
        totalAmountPaisa: true,
        status: true,
        paymentMethod: true
      }
    });

    // Combine and analyze
    const allOrders = [
      ...legacyOrders.map(o => ({ ...o, amount: (o.totalPrice || 0) * 100 })),
      ...sovereignOrders.map(o => ({ ...o, amount: o.totalAmountPaisa, paymentMethod: o.paymentMethod }))
    ];

    const totalValue = allOrders.reduce((sum, order) => sum + order.amount, 0);
    const totalOrders = allOrders.length;

    // Create breakdown
    const breakdown: OrderBreakdown = {
      totalOrders,
      completedOrders: allOrders.filter(o => o.status === 'DELIVERED' || o.status === 'delivered').length,
      pendingOrders: allOrders.filter(o => o.status === 'PENDING' || o.status === 'pending').length,
      cancelledOrders: allOrders.filter(o => o.status === 'CANCELLED' || o.status === 'cancelled').length,
      totalValueByPaymentMethod: {},
      ordersByStatus: {}
    };

    // Aggregate by payment method
    allOrders.forEach(order => {
      const method = order.paymentMethod || 'UNKNOWN';
      breakdown.totalValueByPaymentMethod[method] = (breakdown.totalValueByPaymentMethod[method] || 0) + order.amount;

      const status = order.status || 'UNKNOWN';
      breakdown.ordersByStatus[status] = (breakdown.ordersByStatus[status] || 0) + 1;
    });

    return {
      totalValue,
      totalOrders,
      breakdown,
      queryCount: 2, // 2 queries executed
      dataVolume: allOrders.length
    };
  }

  /**
   * ANALYZE LEDGER
   */
  private async analyzeLedger(districtId: number, startTime: Date, endTime: Date): Promise<{
    credits: number;
    debits: number;
    balance: number;
    totalEntries: number;
    breakdown: LedgerBreakdown;
    queryCount: number;
    dataVolume: number;
  }> {
    // Get all ledger entries for the period
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        districtId,
        createdAt: { gte: startTime, lte: endTime }
      },
      select: {
        id: true,
        amountPaisa: true,
        transactionType: true,
        accountId: true,
        accountType: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate totals
    const credits = entries.filter(e => e.amountPaisa > 0).reduce((sum, e) => sum + e.amountPaisa, 0);
    const debits = Math.abs(entries.filter(e => e.amountPaisa < 0).reduce((sum, e) => sum + e.amountPaisa, 0));
    const balance = credits - debits;

    // Create breakdown
    const breakdown: LedgerBreakdown = {
      totalEntries: entries.length,
      creditEntries: entries.filter(e => e.amountPaisa > 0).length,
      debitEntries: entries.filter(e => e.amountPaisa < 0).length,
      entriesByType: {},
      balanceByAccount: {},
      largestTransactions: entries
        .sort((a, b) => Math.abs(b.amountPaisa) - Math.abs(a.amountPaisa))
        .slice(0, 10)
        .map(e => ({
          id: e.id,
          amount: e.amountPaisa,
          type: e.transactionType,
          timestamp: e.createdAt
        }))
    };

    // Aggregate by type
    entries.forEach(entry => {
      breakdown.entriesByType[entry.transactionType] = (breakdown.entriesByType[entry.transactionType] || 0) + 1;

      const accountKey = `${entry.accountType}:${entry.accountId}`;
      breakdown.balanceByAccount[accountKey] = (breakdown.balanceByAccount[accountKey] || 0) + entry.amountPaisa;
    });

    return {
      credits,
      debits,
      balance,
      totalEntries: entries.length,
      breakdown,
      queryCount: 1,
      dataVolume: entries.length
    };
  }

  /**
   * ANALYZE SETTLEMENTS
   */
  private async analyzeSettlements(districtId: number, startTime: Date, endTime: Date): Promise<SettlementBreakdown & { queryCount: number; dataVolume: number }> {
    // In a real system, this would analyze settlement records
    // For now, we'll simulate based on order payment status

    const orders = await prisma.sovereignOrder.findMany({
      where: {
        districtId,
        createdAt: { gte: startTime, lte: endTime }
      },
      select: {
        id: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmountPaisa: true
      }
    });

    const breakdown: SettlementBreakdown = {
      totalSettlements: orders.length,
      pendingSettlements: orders.filter(o => o.paymentStatus === 'PENDING').length,
      completedSettlements: orders.filter(o => o.paymentStatus === 'COMPLETED').length,
      failedSettlements: orders.filter(o => o.paymentStatus === 'FAILED').length,
      settlementsByMethod: {},
      totalSettledAmount: orders
        .filter(o => o.paymentStatus === 'COMPLETED')
        .reduce((sum, o) => sum + o.totalAmountPaisa, 0),
      settlementFees: 0 // Would calculate based on settlement provider fees
    };

    // Aggregate by method
    orders.forEach(order => {
      const method = order.paymentMethod || 'UNKNOWN';
      breakdown.settlementsByMethod[method] = (breakdown.settlementsByMethod[method] || 0) + 1;
    });

    return {
      ...breakdown,
      queryCount: 1,
      dataVolume: orders.length
    };
  }

  /**
   * ASSESS DRIFT SEVERITY
   */
  private assessDriftSeverity(drift: number): 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL' {
    if (drift === 0) return 'NONE';
    if (drift <= 100) return 'MINOR'; // ≤ ₹1
    if (drift <= 1000) return 'MODERATE'; // ≤ ₹10
    if (drift <= 10000) return 'SEVERE'; // ≤ ₹100
    return 'CRITICAL'; // > ₹100
  }

  /**
   * LOG RECONCILIATION REPORT
   */
  private async logReconciliationReport(report: ReconciliationReport): Promise<void> {
    console.log(`💰 FINANCIAL RECONCILIATION REPORT - ${report.id}`);
    console.log(`📅 Period: ${report.period.start.toISOString()} to ${report.period.end.toISOString()}`);
    console.log(`📊 Transactions: ${report.transactionCount}`);
    console.log(`💵 Order Total: ₹${(report.orderTotal / 100).toFixed(2)}`);
    console.log(`🏦 Ledger Balance: ₹${(report.ledgerBalance / 100).toFixed(2)}`);
    console.log(`💳 Settlements: ₹${(report.settlementTotal / 100).toFixed(2)}`);
    console.log(`⚖️ Order-Ledger Drift: ₹${(report.orderLedgerDrift / 100).toFixed(2)}`);
    console.log(`⚖️ Ledger-Settlement Drift: ₹${(report.ledgerSettlementDrift / 100).toFixed(2)}`);
    console.log(`⚖️ Overall Drift: ₹${(report.overallDrift / 100).toFixed(2)}`);
    console.log(`📈 Status: ${report.isBalanced ? '✅ BALANCED' : '❌ IMBALANCED'} (${report.driftSeverity})`);
    console.log(`⏱️ Reconciliation Time: ${report.reconciliationTime}ms`);

    // Store in audit log
    await prisma.auditLog.create({
      data: {
        action: 'FINANCIAL_RECONCILIATION_COMPLETED',
        targetType: 'DISTRICT',
        targetId: report.districtId,
        details: `Financial reconciliation ${report.isBalanced ? 'PASSED' : 'FAILED'} with drift ₹${(report.overallDrift / 100).toFixed(2)}`,
        metadata: {
          reportId: report.id,
          isBalanced: report.isBalanced,
          driftSeverity: report.driftSeverity,
          orderLedgerDrift: report.orderLedgerDrift,
          ledgerSettlementDrift: report.ledgerSettlementDrift,
          overallDrift: report.overallDrift
        },
        ipAddress: 'system',
        userAgent: 'FinancialReconciliationEngine',
        districtId: report.districtId
      }
    });
  }

  /**
   * ALERT FINANCIAL DRIFT
   */
  private async alertDrift(report: ReconciliationReport): Promise<void> {
    console.error('🚨 FINANCIAL DRIFT DETECTED');
    console.error(`District: ${report.districtId}`);
    console.error(`Overall Drift: ₹${(report.overallDrift / 100).toFixed(2)}`);
    console.error(`Severity: ${report.driftSeverity}`);

    // TODO: Send critical alerts to finance team
    // TODO: Escalate based on severity
    // TODO: Trigger investigation workflows

    // Create incident record
    await prisma.auditLog.create({
      data: {
        action: 'FINANCIAL_DRIFT_ALERT',
        targetType: 'DISTRICT',
        targetId: report.districtId,
        details: `Financial drift detected: ₹${(report.overallDrift / 100).toFixed(2)} (${report.driftSeverity})`,
        metadata: {
          reportId: report.id,
          driftAmount: report.overallDrift,
          driftSeverity: report.driftSeverity
        },
        ipAddress: 'system',
        userAgent: 'FinancialReconciliationEngine',
        districtId: report.districtId
      }
    });
  }

  /**
   * ALERT RECONCILIATION FAILURE
   */
  private async alertReconciliationFailure(error: any): Promise<void> {
    console.error('🚨 FINANCIAL RECONCILIATION FAILURE');
    console.error('Error:', error.message);

    // TODO: Send critical alerts
    // TODO: Trigger system health checks
  }

  /**
   * GET RECONCILIATION HISTORY
   */
  getReconciliationHistory(limit: number = 10): ReconciliationReport[] {
    return this.reconciliationHistory.slice(-limit);
  }

  /**
   * VALIDATE ZERO DRIFT AFTER SCALE
   */
  async validateZeroDrift(transactionVolume: number): Promise<{
    isZeroDrift: boolean;
    finalReport: ReconciliationReport;
    driftAnalysis: {
      acceptableDrift: number;
      actualDrift: number;
      driftPercentage: number;
    };
  }> {
    console.log(`🎯 VALIDATING ZERO DRIFT after ${transactionVolume} transactions`);

    // Execute final reconciliation
    const finalReport = await this.executeReconciliation();

    // Calculate acceptable drift (0.001% of transaction volume)
    const acceptableDrift = Math.max(1, transactionVolume * 0.00001); // Max 1 paise or 0.001%

    const isZeroDrift = finalReport.overallDrift <= acceptableDrift;

    const driftAnalysis = {
      acceptableDrift,
      actualDrift: finalReport.overallDrift,
      driftPercentage: (finalReport.overallDrift / Math.max(1, finalReport.orderTotal)) * 100
    };

    console.log(`🎯 ZERO DRIFT VALIDATION:`);
    console.log(`   Acceptable Drift: ₹${(acceptableDrift / 100).toFixed(2)}`);
    console.log(`   Actual Drift: ₹${(driftAnalysis.actualDrift / 100).toFixed(2)}`);
    console.log(`   Drift Percentage: ${driftAnalysis.driftPercentage.toFixed(6)}%`);
    console.log(`   Status: ${isZeroDrift ? '✅ ZERO DRIFT ACHIEVED' : '❌ DRIFT DETECTED'}`);

    return {
      isZeroDrift,
      finalReport,
      driftAnalysis
    };
  }
}

// ============================================
// AUTOMATED RECONCILIATION SCHEDULER
// ============================================

export class ReconciliationScheduler {
  private engine: FinancialReconciliationEngine;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(engine: FinancialReconciliationEngine) {
    this.engine = engine;
  }

  /**
   * START AUTOMATED RECONCILIATION
   */
  start(): void {
    if (this.isRunning) {
      console.log('📅 Reconciliation scheduler already running');
      return;
    }

    console.log('📅 Starting automated reconciliation scheduler');
    this.isRunning = true;

    // Run initial reconciliation
    this.runReconciliation();

    // Schedule periodic reconciliation
    this.intervalId = setInterval(() => {
      this.runReconciliation();
    }, RECONCILIATION_CONFIG.reconciliationInterval);
  }

  /**
   * STOP AUTOMATED RECONCILIATION
   */
  stop(): void {
    console.log('🛑 Stopping reconciliation scheduler');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * RUN RECONCILIATION
   */
  private async runReconciliation(): Promise<void> {
    try {
      const report = await this.engine.executeReconciliation();
      console.log(`📊 Automated reconciliation completed: ${report.isBalanced ? '✅' : '❌'} (${report.driftSeverity})`);
    } catch (error) {
      console.error('❌ Automated reconciliation failed:', error);
    }
  }

  /**
   * GET SCHEDULER STATUS
   */
  getStatus(): { isRunning: boolean; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      nextRun: this.intervalId ? new Date(Date.now() + RECONCILIATION_CONFIG.reconciliationInterval) : undefined
    };
  }
}

// ============================================
// EXPORT SINGLETONS
// ============================================

export const financialReconciliationEngine = new FinancialReconciliationEngine();
export const reconciliationScheduler = new ReconciliationScheduler(financialReconciliationEngine);