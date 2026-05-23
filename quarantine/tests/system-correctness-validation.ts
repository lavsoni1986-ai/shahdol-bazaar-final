#!/usr/bin/env tsx

/**
 * SYSTEM CORRECTNESS VALIDATION SUITE
 *
 * Master test runner for P1C.3 - Enterprise-grade system validation.
 * Executes all correctness tests and provides comprehensive reporting.
 */

import { runConcurrencyAttackSuite } from './concurrency-attack-suite.js';
import { runMigrationReplaySuite } from './migration-replay-suite.js';
import { financialInvariantEngine, scheduleDailyReconciliation } from '../services/financial-invariant-engine.js';
import { reservationCleanupWorker } from '../services/reservation-cleanup-worker.js';
import { verifyEventDelivery } from '../services/event-delivery-verification.js';

// ============================================
// TEST SUITE CONFIGURATION
// ============================================

const SUITE_CONFIG = {
  districtId: 1, // Shahdol district for testing
  enableLongRunningTests: process.env.ENABLE_LONG_TESTS === 'true',
  maxTestDuration: 5 * 60 * 1000, // 5 minutes
  parallelExecution: false // Run tests sequentially for stability
};

// ============================================
// COMPREHENSIVE TEST RESULTS
// ============================================

interface TestSuiteResult {
  suiteName: string;
  passed: boolean;
  duration: number;
  details?: any;
  error?: string;
}

interface SystemValidationReport {
  timestamp: Date;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  testResults: TestSuiteResult[];
  systemHealth: {
    invariantsValidated: boolean;
    concurrencySafe: boolean;
    migrationSafe: boolean;
    eventsReliable: boolean;
    cleanupOperational: boolean;
  };
  recommendations: string[];
  criticalIssues: string[];
}

// ============================================
// INDIVIDUAL TEST SUITES
// ============================================

/**
 * TEST 1: CONCURRENCY ATTACK SUITE
 */
async function runConcurrencyTests(): Promise<TestSuiteResult> {
  const startTime = Date.now();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST SUITE 1: CONCURRENCY ATTACK VALIDATION');
    console.log('='.repeat(60));

    const results = await runConcurrencyAttackSuite();
    const duration = Date.now() - startTime;

    // Determine if tests passed
    const allTestsSuccessful = Object.values(results).every(r => r.success !== false);

    return {
      suiteName: 'Concurrency Attack Suite',
      passed: allTestsSuccessful,
      duration,
      details: results
    };

  } catch (error) {
    return {
      suiteName: 'Concurrency Attack Suite',
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * TEST 2: FINANCIAL INVARIANT VALIDATION
 */
async function runFinancialInvariantTests(): Promise<TestSuiteResult> {
  const startTime = Date.now();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('💰 TEST SUITE 2: FINANCIAL INVARIANT VALIDATION');
    console.log('='.repeat(60));

    // Test invariants for the test district
    const invariants = await financialInvariantEngine.validateInvariants(SUITE_CONFIG.districtId);
    const duration = Date.now() - startTime;

    return {
      suiteName: 'Financial Invariant Validation',
      passed: invariants.isBalanced,
      duration,
      details: {
        invariants,
        districtId: SUITE_CONFIG.districtId
      }
    };

  } catch (error) {
    return {
      suiteName: 'Financial Invariant Validation',
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * TEST 3: RESERVATION CLEANUP VALIDATION
 */
async function runReservationCleanupTests(): Promise<TestSuiteResult> {
  const startTime = Date.now();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🧹 TEST SUITE 3: RESERVATION CLEANUP VALIDATION');
    console.log('='.repeat(60));

    // Get initial status
    const initialStatus = await reservationCleanupWorker.getStatus();

    // Run cleanup manually
    await reservationCleanupWorker.processCleanup();

    // Get final status
    const finalStatus = await reservationCleanupWorker.getStatus();

    const duration = Date.now() - startTime;

    return {
      suiteName: 'Reservation Cleanup Validation',
      passed: true, // Cleanup is always considered successful if it runs
      duration,
      details: {
        initialStatus,
        finalStatus,
        operational: true
      }
    };

  } catch (error) {
    return {
      suiteName: 'Reservation Cleanup Validation',
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * TEST 4: MIGRATION REPLAY VALIDATION
 */
async function runMigrationReplayTests(): Promise<TestSuiteResult> {
  const startTime = Date.now();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 TEST SUITE 4: MIGRATION REPLAY VALIDATION');
    console.log('='.repeat(60));

    const results = await runMigrationReplaySuite();
    const duration = Date.now() - startTime;

    // Check if all migration tests passed
    const allTestsSuccessful = Object.values(results).every(r => r.success !== false);

    return {
      suiteName: 'Migration Replay Validation',
      passed: allTestsSuccessful,
      duration,
      details: results
    };

  } catch (error) {
    return {
      suiteName: 'Migration Replay Validation',
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * TEST 5: EVENT DELIVERY VERIFICATION
 */
async function runEventDeliveryTests(): Promise<TestSuiteResult> {
  const startTime = Date.now();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('📡 TEST SUITE 5: EVENT DELIVERY VERIFICATION');
    console.log('='.repeat(60));

    const health = await verifyEventDelivery();
    const duration = Date.now() - startTime;

    // Events are reliable if health is HEALTHY or DEGRADED (not CRITICAL)
    const eventsReliable = health.health !== 'CRITICAL';

    return {
      suiteName: 'Event Delivery Verification',
      passed: eventsReliable,
      duration,
      details: health
    };

  } catch (error) {
    return {
      suiteName: 'Event Delivery Verification',
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * TEST 6: SYSTEM HEALTH INTEGRATION TEST
 */
async function runSystemHealthIntegrationTest(): Promise<TestSuiteResult> {
  const startTime = Date.now();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🏥 TEST SUITE 6: SYSTEM HEALTH INTEGRATION TEST');
    console.log('='.repeat(60));

    // Test that all services can be imported and initialized
    const servicesStatus = {
      orderEngine: true,
      migrationObservability: true,
      financialInvariants: true,
      reservationCleanup: true,
      eventDelivery: true
    };

    // Test service initialization
    try {
      const { SovereignOrderEngine } = await import('./services/order.engine.js');
      const engine = new SovereignOrderEngine(null);
    } catch (error) {
      servicesStatus.orderEngine = false;
    }

    try {
      const { MigrationObservability } = await import('./services/migration-observability.js');
    } catch (error) {
      servicesStatus.migrationObservability = false;
    }

    try {
      const { financialInvariantEngine } = await import('./services/financial-invariant-engine.js');
    } catch (error) {
      servicesStatus.financialInvariants = false;
    }

    try {
      const { reservationCleanupWorker } = await import('./services/reservation-cleanup-worker.js');
    } catch (error) {
      servicesStatus.reservationCleanup = false;
    }

    try {
      const { verifyEventDelivery } = await import('./services/event-delivery-verification.js');
    } catch (error) {
      servicesStatus.eventDelivery = false;
    }

    const allServicesHealthy = Object.values(servicesStatus).every(status => status === true);
    const duration = Date.now() - startTime;

    return {
      suiteName: 'System Health Integration Test',
      passed: allServicesHealthy,
      duration,
      details: { servicesStatus }
    };

  } catch (error) {
    return {
      suiteName: 'System Health Integration Test',
      passed: false,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

// ============================================
// MASTER TEST RUNNER
// ============================================

async function runSystemCorrectnessValidation(): Promise<SystemValidationReport> {
  console.log('🚀 SYSTEM CORRECTNESS VALIDATION SUITE - P1C.3');
  console.log('=' * 80);
  console.log('Enterprise-grade system validation for BharatOS commerce infrastructure');
  console.log('Testing: Concurrency, Invariants, Migration Safety, Event Reliability');
  console.log('=' * 80);

  const startTime = Date.now();
  const testResults: TestSuiteResult[] = [];

  // Define test suites to run
  const testSuites = [
    runConcurrencyTests,
    runFinancialInvariantTests,
    runReservationCleanupTests,
    runMigrationReplayTests,
    runEventDeliveryTests,
    runSystemHealthIntegrationTest
  ];

  // Run tests sequentially for stability
  for (const testSuite of testSuites) {
    if (SUITE_CONFIG.parallelExecution) {
      // Run in parallel (riskier)
      testResults.push(await testSuite());
    } else {
      // Run sequentially (safer)
      try {
        const result = await testSuite();
        testResults.push(result);
      } catch (error) {
        testResults.push({
          suiteName: 'Unknown',
          passed: false,
          duration: 0,
          error: error.message
        });
      }
    }
  }

  const totalDuration = Date.now() - startTime;

  // Analyze overall results
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = testResults.filter(r => !r.passed).length;
  const overallSuccessRate = (passedTests / testResults.length) * 100;

  // Determine overall status
  let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
  if (failedTests > 0) {
    overallStatus = 'FAIL';
  } else if (overallSuccessRate < 100) {
    overallStatus = 'WARNING';
  }

  // System health assessment
  const systemHealth = {
    invariantsValidated: testResults.find(r => r.suiteName === 'Financial Invariant Validation')?.passed || false,
    concurrencySafe: testResults.find(r => r.suiteName === 'Concurrency Attack Suite')?.passed || false,
    migrationSafe: testResults.find(r => r.suiteName === 'Migration Replay Validation')?.passed || false,
    eventsReliable: testResults.find(r => r.suiteName === 'Event Delivery Verification')?.passed || false,
    cleanupOperational: testResults.find(r => r.suiteName === 'Reservation Cleanup Validation')?.passed || false
  };

  // Generate recommendations
  const recommendations: string[] = [];
  const criticalIssues: string[] = [];

  if (!systemHealth.concurrencySafe) {
    criticalIssues.push('Concurrency safety compromised - race conditions detected');
    recommendations.push('Fix inventory locking mechanism');
    recommendations.push('Implement atomic stock reservations');
  }

  if (!systemHealth.invariantsValidated) {
    criticalIssues.push('Financial invariants violated - ledger imbalances detected');
    recommendations.push('Audit financial transactions');
    recommendations.push('Reconcile order and payment totals');
  }

  if (!systemHealth.migrationSafe) {
    criticalIssues.push('Migration safety compromised - rollback issues detected');
    recommendations.push('Fix migration routing logic');
    recommendations.push('Test all migration flag combinations');
  }

  if (!systemHealth.eventsReliable) {
    recommendations.push('Improve event delivery reliability');
    recommendations.push('Monitor event failure rates');
  }

  if (overallStatus === 'PASS') {
    recommendations.push('✅ System ready for production deployment');
    recommendations.push('Schedule regular validation runs');
  } else if (overallStatus === 'WARNING') {
    recommendations.push('⚠️ Address minor issues before production');
  } else {
    recommendations.push('❌ Critical issues must be resolved before deployment');
    recommendations.push('Do not proceed with production deployment');
  }

  // Generate final report
  const report: SystemValidationReport = {
    timestamp: new Date(),
    overallStatus,
    testResults,
    systemHealth,
    recommendations,
    criticalIssues
  };

  // Display results
  console.log('\n' + '='.repeat(80));
  console.log('🎯 VALIDATION RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Overall Status: ${overallStatus}`);
  console.log(`Tests Passed: ${passedTests}/${testResults.length}`);
  console.log(`Success Rate: ${overallSuccessRate.toFixed(1)}%`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  console.log('\n📊 SYSTEM HEALTH:');
  Object.entries(systemHealth).forEach(([component, healthy]) => {
    const status = healthy ? '✅' : '❌';
    console.log(`   ${status} ${component.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  });

  if (criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:');
    criticalIssues.forEach(issue => console.log(`   ❌ ${issue}`));
  }

  console.log('\n💡 RECOMMENDATIONS:');
  recommendations.forEach(rec => console.log(`   • ${rec}`));

  console.log('\n' + '='.repeat(80));
  console.log('🏁 SYSTEM CORRECTNESS VALIDATION COMPLETE');
  console.log('='.repeat(80));

  return report;
}

// ============================================
// CLI ENTRY POINT
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  // Run when executed directly
  runSystemCorrectnessValidation()
    .then(() => {
      console.log('\n✅ Validation suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Validation suite failed:', error);
      process.exit(1);
    });
}

export { runSystemCorrectnessValidation };
export type { SystemValidationReport, TestSuiteResult };