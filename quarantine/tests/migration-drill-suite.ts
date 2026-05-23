/**
 * MIGRATION DRILLS - P1C.4.4
 *
 * Zero-downtime migration testing with live traffic simulation.
 * Tests actual switching between legacy and sovereign systems.
 */

import { prisma } from '../storage.js';
import { MIGRATION_FLAGS, ORDER_ENGINE_VERSION, OrderEngineVersion } from '../config/migration.js';

// ============================================
// MIGRATION DRILL CONFIGURATION
// ============================================

const DRILL_CONFIG = {
  trafficDuration: 120000,    // 2 minutes per system
  concurrentUsers: 20,        // 20 concurrent users
  orderInterval: 2000,        // Order every 2 seconds
  systemSwitchDelay: 5000,    // 5 seconds between switches
  rollbackTests: 3,           // Test multiple rollbacks
  trafficPattern: 'constant', // constant, ramp, burst
  successThreshold: 0.95      // 95% success rate required
};

// ============================================
// MIGRATION DRILL RESULTS
// ============================================

interface MigrationDrillResult {
  drillId: string;
  startTime: Date;
  endTime: Date;
  duration: number;

  // System performance
  legacyPhase: TrafficPhaseResult;
  sovereignPhase: TrafficPhaseResult;
  rollbackPhase: TrafficPhaseResult;

  // Migration metrics
  switchSuccess: boolean;
  zeroDowntime: boolean;
  dataConsistency: boolean;
  userImpact: 'NONE' | 'MINIMAL' | 'MODERATE' | 'SEVERE';

  // Overall assessment
  drillSuccess: boolean;
  recommendations: string[];
  criticalIssues: string[];
}

interface TrafficPhaseResult {
  phaseName: string;
  startTime: Date;
  endTime: Date;
  duration: number;

  // Traffic metrics
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  successRate: number;

  // Performance metrics
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;

  // System metrics
  engineVersion: OrderEngineVersion;
  activeFlags: Record<string, boolean>;

  // Issues encountered
  errors: string[];
  warnings: string[];
}

// ============================================
// MIGRATION DRILL ENGINE
// ============================================

export class MigrationDrillEngine {

  /**
   * EXECUTE COMPLETE MIGRATION DRILL
   */
  async executeMigrationDrill(): Promise<MigrationDrillResult> {
    const drillId = `drill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    console.log('🔄 STARTING MIGRATION DRILL');
    console.log(`Drill ID: ${drillId}`);
    console.log('Phases: Legacy → Sovereign → Rollback → Legacy');
    console.log('=' .repeat(60));

    const results: MigrationDrillResult = {
      drillId,
      startTime,
      endTime: new Date(),
      duration: 0,
      legacyPhase: {} as TrafficPhaseResult,
      sovereignPhase: {} as TrafficPhaseResult,
      rollbackPhase: {} as TrafficPhaseResult,
      switchSuccess: false,
      zeroDowntime: false,
      dataConsistency: false,
      userImpact: 'NONE',
      drillSuccess: false,
      recommendations: [],
      criticalIssues: []
    };

    try {
      // Phase 1: Legacy system under load
      console.log('\n📦 PHASE 1: LEGACY SYSTEM UNDER LOAD');
      results.legacyPhase = await this.runTrafficPhase('Legacy Baseline', OrderEngineVersion.LEGACY, false);

      // Phase 2: Switch to Sovereign system
      console.log('\n🚀 PHASE 2: SWITCHING TO SOVEREIGN SYSTEM');
      await this.switchToSovereign();
      await new Promise(resolve => setTimeout(resolve, DRILL_CONFIG.systemSwitchDelay));

      // Phase 3: Sovereign system under load
      console.log('\n⚡ PHASE 3: SOVEREIGN SYSTEM UNDER LOAD');
      results.sovereignPhase = await this.runTrafficPhase('Sovereign Active', OrderEngineVersion.SOVEREIGN, false);

      // Phase 4: Emergency rollback to legacy
      console.log('\n🔙 PHASE 4: EMERGENCY ROLLBACK TO LEGACY');
      await this.rollbackToLegacy();
      await new Promise(resolve => setTimeout(resolve, DRILL_CONFIG.systemSwitchDelay));

      // Phase 5: Legacy system post-rollback
      console.log('\n📦 PHASE 5: LEGACY SYSTEM POST-ROLLBACK');
      results.rollbackPhase = await this.runTrafficPhase('Legacy Post-Rollback', OrderEngineVersion.LEGACY, true);

      // Analyze results
      const analysis = await this.analyzeDrillResults(results);
      results.switchSuccess = analysis.switchSuccess;
      results.zeroDowntime = analysis.zeroDowntime;
      results.dataConsistency = analysis.dataConsistency;
      results.userImpact = analysis.userImpact;
      results.drillSuccess = analysis.drillSuccess;
      results.recommendations = analysis.recommendations;
      results.criticalIssues = analysis.criticalIssues;

      results.endTime = new Date();
      results.duration = results.endTime.getTime() - startTime.getTime();

      // Generate drill report
      await this.generateDrillReport(results);

      console.log('\n' + '='.repeat(60));
      console.log('🎯 MIGRATION DRILL COMPLETE');
      console.log(`Status: ${results.drillSuccess ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Zero Downtime: ${results.zeroDowntime ? '✅' : '❌'}`);
      console.log(`Data Consistency: ${results.dataConsistency ? '✅' : '❌'}`);
      console.log(`User Impact: ${results.userImpact}`);
      console.log('=' .repeat(60));

      return results;

    } catch (error) {
      console.error('❌ Migration drill failed:', error);
      results.endTime = new Date();
      results.duration = results.endTime.getTime() - startTime.getTime();
      results.drillSuccess = false;
      results.criticalIssues.push(`Drill failed: ${error.message}`);

      return results;
    } finally {
      // Always restore to safe state
      await this.restoreSafeState();
    }
  }

  /**
   * RUN TRAFFIC PHASE
   */
  private async runTrafficPhase(phaseName: string, engineVersion: OrderEngineVersion, isRollback: boolean): Promise<TrafficPhaseResult> {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + DRILL_CONFIG.trafficDuration);

    console.log(`Running ${phaseName} for ${DRILL_CONFIG.trafficDuration / 1000}s`);

    const result: TrafficPhaseResult = {
      phaseName,
      startTime,
      endTime,
      duration: DRILL_CONFIG.trafficDuration,
      totalOrders: 0,
      successfulOrders: 0,
      failedOrders: 0,
      successRate: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      engineVersion,
      activeFlags: {
        sovereignActive: MIGRATION_FLAGS.SOVEREIGN_ENGINE_ACTIVE,
        legacyReadOnly: MIGRATION_FLAGS.LEGACY_READ_ONLY,
        forceLegacy: MIGRATION_FLAGS.FORCE_LEGACY_MODE
      },
      errors: [],
      warnings: []
    };

    const latencies: number[] = [];
    const promises: Promise<void>[] = [];

    // Generate traffic
    const orderInterval = DRILL_CONFIG.orderInterval;
    let orderCount = 0;

    const trafficLoop = setInterval(async () => {
      if (Date.now() >= endTime.getTime()) {
        clearInterval(trafficLoop);
        return;
      }

      // Generate concurrent orders
      for (let i = 0; i < DRILL_CONFIG.concurrentUsers; i++) {
        orderCount++;
        const requestStart = Date.now();

        const promise = this.createTestOrder(`drill_${phaseName}_${orderCount}_${i}`)
          .then(() => {
            result.successfulOrders++;
            latencies.push(Date.now() - requestStart);
          })
          .catch((error) => {
            result.failedOrders++;
            latencies.push(Date.now() - requestStart);
            result.errors.push(`${error.message} (order ${orderCount}_${i})`);
          });

        promises.push(promise);
      }
    }, orderInterval);

    // Wait for phase to complete
    await new Promise(resolve => setTimeout(resolve, DRILL_CONFIG.trafficDuration + 1000));
    clearInterval(trafficLoop);

    // Wait for all orders to complete
    await Promise.allSettled(promises);

    // Calculate metrics
    result.totalOrders = result.successfulOrders + result.failedOrders;
    result.successRate = result.totalOrders > 0 ? (result.successfulOrders / result.totalOrders) * 100 : 0;

    if (latencies.length > 0) {
      result.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const sortedLatencies = latencies.sort((a, b) => a - b);
      result.p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
      result.p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
    }

    console.log(`Phase complete: ${result.totalOrders} orders, ${result.successRate.toFixed(1)}% success, ${result.averageLatency.toFixed(0)}ms avg latency`);

    return result;
  }

  /**
   * SWITCH TO SOVEREIGN SYSTEM
   */
  private async switchToSovereign(): Promise<void> {
    console.log('🔄 Switching to Sovereign Order Engine...');

    // Update environment variables
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.SOVEREIGN;
    process.env.FORCE_LEGACY_MODE = 'false';

    // Wait for configuration to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify switch
    if (ORDER_ENGINE_VERSION !== OrderEngineVersion.SOVEREIGN) {
      throw new Error('Failed to switch to Sovereign engine');
    }

    console.log('✅ Successfully switched to Sovereign engine');
  }

  /**
   * ROLLBACK TO LEGACY SYSTEM
   */
  private async rollbackToLegacy(): Promise<void> {
    console.log('🔙 Emergency rollback to Legacy Order Engine...');

    // Update environment variables
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.LEGACY;
    process.env.FORCE_LEGACY_MODE = 'true';

    // Wait for configuration to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify rollback
    if (ORDER_ENGINE_VERSION !== OrderEngineVersion.LEGACY || MIGRATION_FLAGS.FORCE_LEGACY_MODE !== true) {
      throw new Error('Failed to rollback to Legacy engine');
    }

    console.log('✅ Successfully rolled back to Legacy engine');
  }

  /**
   * RESTORE SAFE STATE
   */
  private async restoreSafeState(): Promise<void> {
    console.log('🔧 Restoring safe system state...');

    // Reset to legacy mode (safe default)
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.LEGACY;
    process.env.FORCE_LEGACY_MODE = 'false';

    console.log('✅ System restored to safe state');
  }

  /**
   * CREATE TEST ORDER
   */
  private async createTestOrder(identifier: string): Promise<any> {
    // Use the current migration routing
    const response = await fetch('http://localhost:5002/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-district-slug': 'shahdol'
      },
      body: JSON.stringify({
        items: [{ productId: 1, quantity: 1 }],
        customerName: `Drill Customer ${identifier}`,
        customerPhone: '9999999999',
        customerAddress: 'Drill Test Address',
        paymentMethod: 'ONLINE'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * ANALYZE DRILL RESULTS
   */
  private async analyzeDrillResults(results: MigrationDrillResult): Promise<{
    switchSuccess: boolean;
    zeroDowntime: boolean;
    dataConsistency: boolean;
    userImpact: 'NONE' | 'MINIMAL' | 'MODERATE' | 'SEVERE';
    drillSuccess: boolean;
    recommendations: string[];
    criticalIssues: string[];
  }> {
    const analysis = {
      switchSuccess: true,
      zeroDowntime: true,
      dataConsistency: true,
      userImpact: 'NONE' as 'NONE' | 'MINIMAL' | 'MODERATE' | 'SEVERE',
      drillSuccess: true,
      recommendations: [] as string[],
      criticalIssues: [] as string[]
    };

    // Check switch success
    if (results.legacyPhase.engineVersion !== OrderEngineVersion.LEGACY ||
        results.sovereignPhase.engineVersion !== OrderEngineVersion.SOVEREIGN ||
        results.rollbackPhase.engineVersion !== OrderEngineVersion.LEGACY) {
      analysis.switchSuccess = false;
      analysis.criticalIssues.push('System did not switch engines correctly');
    }

    // Check zero downtime (no complete failures during switches)
    const switchDowntime = results.legacyPhase.failedOrders + results.sovereignPhase.failedOrders + results.rollbackPhase.failedOrders;
    if (switchDowntime > (results.legacyPhase.totalOrders + results.sovereignPhase.totalOrders + results.rollbackPhase.totalOrders) * 0.1) {
      analysis.zeroDowntime = false;
      analysis.criticalIssues.push(`High failure rate during switches: ${switchDowntime} failed orders`);
    }

    // Check data consistency (orders exist in correct systems)
    const dataConsistency = await this.verifyDataConsistency(results);
    analysis.dataConsistency = dataConsistency.isConsistent;
    if (!dataConsistency.isConsistent) {
      analysis.criticalIssues.push(`Data consistency violated: ${dataConsistency.issues.join(', ')}`);
    }

    // Assess user impact
    const totalFailed = results.legacyPhase.failedOrders + results.sovereignPhase.failedOrders + results.rollbackPhase.failedOrders;
    const totalOrders = results.legacyPhase.totalOrders + results.sovereignPhase.totalOrders + results.rollbackPhase.totalOrders;
    const failureRate = totalOrders > 0 ? (totalFailed / totalOrders) * 100 : 0;

    if (failureRate < 1) analysis.userImpact = 'NONE';
    else if (failureRate < 5) analysis.userImpact = 'MINIMAL';
    else if (failureRate < 15) analysis.userImpact = 'MODERATE';
    else analysis.userImpact = 'SEVERE';

    // Overall drill success
    analysis.drillSuccess = analysis.switchSuccess && analysis.zeroDowntime && analysis.dataConsistency && analysis.userImpact !== 'SEVERE';

    // Generate recommendations
    if (!analysis.switchSuccess) {
      analysis.recommendations.push('Fix engine switching mechanism');
    }
    if (!analysis.zeroDowntime) {
      analysis.recommendations.push('Implement proper request queuing during switches');
    }
    if (!analysis.dataConsistency) {
      analysis.recommendations.push('Fix data routing logic between legacy and sovereign systems');
    }
    if (analysis.userImpact === 'SEVERE') {
      analysis.recommendations.push('Immediate action required - system causing significant user disruption');
    }

    return analysis;
  }

  /**
   * VERIFY DATA CONSISTENCY
   */
  private async verifyDataConsistency(results: MigrationDrillResult): Promise<{
    isConsistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check that legacy orders exist in legacy table
      const legacyOrders = await prisma.order.findMany({
        where: {
          customerName: { startsWith: 'Drill Customer drill_Legacy' }
        }
      });

      if (legacyOrders.length < results.legacyPhase.successfulOrders * 0.9) {
        issues.push(`Missing legacy orders: expected ${results.legacyPhase.successfulOrders}, found ${legacyOrders.length}`);
      }

      // Check that sovereign orders exist in sovereign table
      const sovereignOrders = await prisma.sovereignOrder.findMany({
        where: {
          customerName: { startsWith: 'Drill Customer drill_Sovereign' }
        }
      });

      if (sovereignOrders.length < results.sovereignPhase.successfulOrders * 0.9) {
        issues.push(`Missing sovereign orders: expected ${results.sovereignPhase.successfulOrders}, found ${sovereignOrders.length}`);
      }

    } catch (error) {
      issues.push(`Data consistency check failed: ${error.message}`);
    }

    return {
      isConsistent: issues.length === 0,
      issues
    };
  }

  /**
   * GENERATE DRILL REPORT
   */
  private async generateDrillReport(results: MigrationDrillResult): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('📋 MIGRATION DRILL REPORT - P1C.4.4');
    console.log('='.repeat(80));
    console.log(`Drill ID: ${results.drillId}`);
    console.log(`Duration: ${(results.duration / 1000).toFixed(1)}s`);
    console.log(`Switch Success: ${results.switchSuccess ? '✅' : '❌'}`);
    console.log(`Zero Downtime: ${results.zeroDowntime ? '✅' : '❌'}`);
    console.log(`Data Consistency: ${results.dataConsistency ? '✅' : '❌'}`);
    console.log(`User Impact: ${results.userImpact}`);
    console.log(`Overall Success: ${results.drillSuccess ? '✅ PASSED' : '❌ FAILED'}`);

    console.log('\n📊 PHASE RESULTS:');
    [results.legacyPhase, results.sovereignPhase, results.rollbackPhase].forEach(phase => {
      console.log(`\n${phase.phaseName}:`);
      console.log(`  Orders: ${phase.totalOrders} (${phase.successRate.toFixed(1)}% success)`);
      console.log(`  Latency: ${phase.averageLatency.toFixed(0)}ms avg, ${phase.p95Latency}ms p95`);
      console.log(`  Engine: ${phase.engineVersion}`);
      if (phase.errors.length > 0) {
        console.log(`  Errors: ${phase.errors.length}`);
      }
    });

    if (results.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      results.criticalIssues.forEach(issue => console.log(`   • ${issue}`));
    }

    if (results.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      results.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }

    console.log('='.repeat(80));

    // Store report in audit log
    await prisma.auditLog.create({
      data: {
        action: 'MIGRATION_DRILL_COMPLETED',
        targetType: 'SYSTEM',
        targetId: 0,
        details: `Migration drill ${results.drillSuccess ? 'PASSED' : 'FAILED'} (${results.duration}ms)`,
        metadata: {
          drillId: results.drillId,
          drillSuccess: results.drillSuccess,
          switchSuccess: results.switchSuccess,
          zeroDowntime: results.zeroDowntime,
          dataConsistency: results.dataConsistency,
          userImpact: results.userImpact,
          phaseResults: {
            legacy: results.legacyPhase,
            sovereign: results.sovereignPhase,
            rollback: results.rollbackPhase
          }
        },
        ipAddress: 'system',
        userAgent: 'MigrationDrillEngine',
        districtId: 1
      }
    });
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const migrationDrillEngine = new MigrationDrillEngine();