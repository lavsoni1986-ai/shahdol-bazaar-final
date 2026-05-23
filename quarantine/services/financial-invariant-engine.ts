/**
 * FINANCIAL INVARIANT ENGINE
 *
 * Enterprise-grade financial validation system.
 * Ensures order totals = ledger totals = settlement totals.
 * Runs daily reconciliation checks.
 */

import { prisma } from '../storage.js';

// ============================================
// FINANCIAL INVARIANTS
// ============================================

export interface FinancialInvariants {
  ordersTotal: number;        // Sum of all order totals
  ledgerCredits: number;      // Sum of all credit ledger entries
  ledgerDebits: number;       // Sum of all debit ledger entries
  ledgerBalance: number;      // Credits - Debits
  settlementTotal: number;    // Sum of all settled payments
  discrepancies: FinancialDiscrepancy[];
  isBalanced: boolean;
  lastChecked: Date;
  districtId: number;
}

export interface FinancialDiscrepancy {
  type: 'ORDER_LEDGER_MISMATCH' | 'LEDGER_SETTLEMENT_MISMATCH' | 'NEGATIVE_BALANCE';
  description: string;
  amount: number;
  affectedRecords: number;
}

// ============================================
// FINANCIAL INVARIANT ENGINE
// ============================================

export class FinancialInvariantEngine {

  /**
   * VALIDATE FINANCIAL INVARIANTS FOR DISTRICT
   */
  async validateInvariants(districtId: number): Promise<FinancialInvariants> {
    console.log(`💰 VALIDATING FINANCIAL INVARIANTS for district ${districtId}`);

    const [
      ordersTotal,
      ledgerSummary,
      settlementTotal
    ] = await Promise.all([
      this.calculateOrdersTotal(districtId),
      this.calculateLedgerSummary(districtId),
      this.calculateSettlementTotal(districtId)
    ]);

    // Check invariants
    const discrepancies: FinancialDiscrepancy[] = [];

    // Invariant 1: Orders = Ledger Balance
    if (Math.abs(ordersTotal - ledgerSummary.balance) > 1) { // Allow 1 paise tolerance
      discrepancies.push({
        type: 'ORDER_LEDGER_MISMATCH',
        description: `Order total (${ordersTotal}) ≠ Ledger balance (${ledgerSummary.balance})`,
        amount: Math.abs(ordersTotal - ledgerSummary.balance),
        affectedRecords: ledgerSummary.totalEntries
      });
    }

    // Invariant 2: Ledger Balance = Settlements
    if (Math.abs(ledgerSummary.balance - settlementTotal) > 1) {
      discrepancies.push({
        type: 'LEDGER_SETTLEMENT_MISMATCH',
        description: `Ledger balance (${ledgerSummary.balance}) ≠ Settlements (${settlementTotal})`,
        amount: Math.abs(ledgerSummary.balance - settlementTotal),
        affectedRecords: ledgerSummary.totalEntries
      });
    }

    // Invariant 3: No negative balances (business rule)
    if (ledgerSummary.balance < 0) {
      discrepancies.push({
        type: 'NEGATIVE_BALANCE',
        description: `Negative ledger balance: ${ledgerSummary.balance}`,
        amount: Math.abs(ledgerSummary.balance),
        affectedRecords: 1
      });
    }

    const isBalanced = discrepancies.length === 0;

    const result: FinancialInvariants = {
      ordersTotal,
      ledgerCredits: ledgerSummary.credits,
      ledgerDebits: ledgerSummary.debits,
      ledgerBalance: ledgerSummary.balance,
      settlementTotal,
      discrepancies,
      isBalanced,
      lastChecked: new Date(),
      districtId
    };

    // Log results
    this.logInvariantResults(result);

    // Alert on discrepancies
    if (!isBalanced) {
      await this.alertDiscrepancies(result);
    }

    return result;
  }

  /**
   * CALCULATE TOTAL ORDER VALUE
   */
  private async calculateOrdersTotal(districtId: number): Promise<number> {
    // Sum of all sovereign order totals
    const result = await prisma.sovereignOrder.aggregate({
      where: {
        districtId,
        status: { not: 'CANCELLED' } // Exclude cancelled orders
      },
      _sum: {
        totalAmountPaisa: true
      }
    });

    return result._sum.totalAmountPaisa || 0;
  }

  /**
   * CALCULATE LEDGER SUMMARY
   */
  private async calculateLedgerSummary(districtId: number): Promise<{
    credits: number;
    debits: number;
    balance: number;
    totalEntries: number;
  }> {
    // Calculate credits (positive amounts)
    const creditsResult = await prisma.ledgerEntry.aggregate({
      where: {
        districtId,
        amountPaisa: { gt: 0 }
      },
      _sum: {
        amountPaisa: true
      },
      _count: true
    });

    // Calculate debits (negative amounts, stored as positive)
    const debitsResult = await prisma.ledgerEntry.aggregate({
      where: {
        districtId,
        amountPaisa: { lt: 0 }
      },
      _sum: {
        amountPaisa: true
      },
      _count: true
    });

    const credits = creditsResult._sum.amountPaisa || 0;
    const debits = Math.abs(debitsResult._sum.amountPaisa || 0); // Convert back to positive
    const balance = credits - debits;
    const totalEntries = creditsResult._count + debitsResult._count;

    return { credits, debits, balance, totalEntries };
  }

  /**
   * CALCULATE SETTLEMENT TOTAL
   */
  private async calculateSettlementTotal(districtId: number): Promise<number> {
    // For now, this would integrate with payment provider
    // Placeholder: assume all completed payments are settled
    const settledOrders = await prisma.sovereignOrder.aggregate({
      where: {
        districtId,
        paymentStatus: 'COMPLETED',
        status: { not: 'CANCELLED' }
      },
      _sum: {
        totalAmountPaisa: true
      }
    });

    return settledOrders._sum.totalAmountPaisa || 0;
  }

  /**
   * LOG INVARIANT VALIDATION RESULTS
   */
  private logInvariantResults(result: FinancialInvariants): void {
    console.log(`💰 FINANCIAL INVARIANTS - District ${result.districtId}`);
    console.log(`   Orders Total: ₹${(result.ordersTotal / 100).toFixed(2)}`);
    console.log(`   Ledger Balance: ₹${(result.ledgerBalance / 100).toFixed(2)}`);
    console.log(`   Settlements: ₹${(result.settlementTotal / 100).toFixed(2)}`);
    console.log(`   Status: ${result.isBalanced ? '✅ BALANCED' : '❌ IMBALANCED'}`);

    if (result.discrepancies.length > 0) {
      console.log('   Discrepancies:');
      result.discrepancies.forEach(d => {
        console.log(`     - ${d.type}: ${d.description} (₹${(d.amount / 100).toFixed(2)})`);
      });
    }
  }

  /**
   * ALERT ON FINANCIAL DISCREPANCIES
   */
  private async alertDiscrepancies(result: FinancialInvariants): Promise<void> {
    console.error('🚨 FINANCIAL DISCREPANCY ALERT');
    console.error(`District: ${result.districtId}`);
    console.error(`Discrepancies: ${result.discrepancies.length}`);

    // TODO: Send alerts to monitoring system
    // TODO: Escalate to finance team
    // TODO: Create incident ticket

    // For now, log to audit table
    await prisma.auditLog.create({
      data: {
        action: 'FINANCIAL_DISCREPANCY_DETECTED',
        targetType: 'DISTRICT',
        targetId: result.districtId,
        details: `Financial invariants violated: ${result.discrepancies.length} discrepancies`,
        metadata: {
          discrepancies: result.discrepancies,
          ordersTotal: result.ordersTotal,
          ledgerBalance: result.ledgerBalance,
          settlementTotal: result.settlementTotal
        },
        ipAddress: 'system',
        userAgent: 'FinancialInvariantEngine',
        districtId: result.districtId
      }
    });
  }

  /**
   * RUN DAILY FINANCIAL RECONCILIATION
   */
  async runDailyReconciliation(districtId: number): Promise<FinancialInvariants> {
    console.log(`📊 RUNNING DAILY FINANCIAL RECONCILIATION for district ${districtId}`);

    const result = await this.validateInvariants(districtId);

    // Store reconciliation result
    await prisma.auditLog.create({
      data: {
        action: 'DAILY_FINANCIAL_RECONCILIATION',
        targetType: 'DISTRICT',
        targetId: districtId,
        details: `Daily reconciliation ${result.isBalanced ? 'PASSED' : 'FAILED'}`,
        metadata: {
          invariants: result,
          reconciliationDate: new Date().toISOString()
        },
        ipAddress: 'system',
        userAgent: 'FinancialInvariantEngine',
        districtId
      }
    });

    return result;
  }
}

// ============================================
// SCHEDULER FOR DAILY RECONCILIATION
// ============================================

export async function scheduleDailyReconciliation() {
  const engine = new FinancialInvariantEngine();

  // Get all districts
  const districts = await prisma.district.findMany({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  console.log(`📅 Running daily reconciliation for ${districts.length} districts`);

  const results = await Promise.all(
    districts.map(async (district) => {
      try {
        const result = await engine.runDailyReconciliation(district.id);
        return { district: district.name, success: result.isBalanced, discrepancies: result.discrepancies.length };
      } catch (error) {
        console.error(`Failed reconciliation for district ${district.name}:`, error);
        return { district: district.name, success: false, error: error.message };
      }
    })
  );

  // Summary report
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`📊 Daily Reconciliation Summary: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error('❌ FINANCIAL RECONCILIATION ISSUES DETECTED');
    // TODO: Send critical alert
  } else {
    console.log('✅ ALL FINANCIAL RECONCILIATIONS PASSED');
  }

  return results;
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const financialInvariantEngine = new FinancialInvariantEngine();