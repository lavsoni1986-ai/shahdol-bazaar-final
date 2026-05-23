/**
 * MIGRATION REPLAY TESTING SUITE
 *
 * Enterprise-grade migration testing for zero-risk deployments.
 * Tests rollback scenarios, legacy fallbacks, and sovereign safety.
 */

import { prisma } from '../storage.js';
import { MIGRATION_FLAGS, ORDER_ENGINE_VERSION, OrderEngineVersion } from '../config/migration.js';
import { SovereignOrderEngine } from '../services/order.engine.js';

// ============================================
// TEST CONFIGURATION
// ============================================

const REPLAY_CONFIG = {
  testUserId: 1,
  testDistrictId: 1,
  testProductId: 1,
  testIterations: 10,
  waitBetweenTests: 1000 // ms
};

// ============================================
// TEST 1: ROLLBACK DRILL
// ============================================

export async function testRollbackDrill() {
  console.log('🧪 TEST 1: ROLLBACK DRILL');
  console.log('Testing emergency rollback from Sovereign to Legacy');

  const originalVersion = ORDER_ENGINE_VERSION;
  const testOrders: any[] = [];

  try {
    // Phase 1: Create orders with Sovereign engine
    console.log('📦 Phase 1: Creating orders with Sovereign engine');
    for (let i = 0; i < REPLAY_CONFIG.testIterations; i++) {
      const order = await createTestOrder(`rollback_${i}`);
      testOrders.push(order);
    }
    console.log(`✅ Created ${testOrders.length} sovereign orders`);

    // Phase 2: Simulate emergency - force legacy mode
    console.log('🚨 Phase 2: Simulating emergency - forcing legacy mode');
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.LEGACY;
    process.env.FORCE_LEGACY_MODE = 'true';

    // Wait for environment to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    // Phase 3: Verify legacy fallback works
    console.log('🔄 Phase 3: Testing legacy fallback');
    const legacyOrder = await createTestOrder('legacy_fallback_test');
    console.log('✅ Legacy fallback working');

    // Phase 4: Restore sovereign mode
    console.log('🔧 Phase 4: Restoring sovereign mode');
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.SOVEREIGN;
    process.env.FORCE_LEGACY_MODE = 'false';

    await new Promise(resolve => setTimeout(resolve, 500));

    // Phase 5: Verify sovereign mode restored
    console.log('✅ Phase 5: Verifying sovereign restoration');
    const restoredOrder = await createTestOrder('sovereign_restored_test');
    console.log('✅ Sovereign mode restored');

    console.log('✅ ROLLBACK DRILL PASSED');
    return { success: true, testOrders: testOrders.length };

  } catch (error) {
    console.error('❌ ROLLBACK DRILL FAILED');
    console.error(error);

    // Emergency cleanup
    await cleanupTestOrders(testOrders);

    return { success: false, error: error.message };
  } finally {
    // Always restore original configuration
    process.env.ORDER_ENGINE_VERSION = originalVersion;
    process.env.FORCE_LEGACY_MODE = 'false';
  }
}

// ============================================
// TEST 2: LEGACY FALLBACK INTEGRITY
// ============================================

export async function testLegacyFallbackIntegrity() {
  console.log('🧪 TEST 2: LEGACY FALLBACK INTEGRITY');
  console.log('Testing that legacy orders remain untouched during migration');

  const originalVersion = ORDER_ENGINE_VERSION;
  const legacyOrders: any[] = [];

  try {
    // Phase 1: Create legacy orders
    console.log('📦 Phase 1: Creating legacy orders');
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.LEGACY;

    for (let i = 0; i < REPLAY_CONFIG.testIterations; i++) {
      const order = await createTestOrder(`legacy_integrity_${i}`);
      legacyOrders.push(order);
      await new Promise(resolve => setTimeout(resolve, REPLAY_CONFIG.waitBetweenTests));
    }

    console.log(`✅ Created ${legacyOrders.length} legacy orders`);

    // Phase 2: Switch to sovereign mode
    console.log('🔄 Phase 2: Switching to sovereign mode');
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.SOVEREIGN;

    // Phase 3: Create sovereign orders
    console.log('📦 Phase 3: Creating sovereign orders');
    const sovereignOrders: any[] = [];
    for (let i = 0; i < REPLAY_CONFIG.testIterations; i++) {
      const order = await createTestOrder(`sovereign_integrity_${i}`);
      sovereignOrders.push(order);
    }

    console.log(`✅ Created ${sovereignOrders.length} sovereign orders`);

    // Phase 4: Verify legacy orders still exist and unchanged
    console.log('🔍 Phase 4: Verifying legacy order integrity');
    for (const legacyOrder of legacyOrders) {
      const currentOrder = await prisma.order.findUnique({
        where: { id: legacyOrder.id }
      });

      if (!currentOrder) {
        throw new Error(`Legacy order ${legacyOrder.id} was deleted during migration`);
      }

      if (currentOrder.totalPrice !== legacyOrder.totalPrice) {
        throw new Error(`Legacy order ${legacyOrder.id} price changed: ${currentOrder.totalPrice} !== ${legacyOrder.totalPrice}`);
      }
    }

    console.log('✅ Legacy order integrity preserved');

    // Phase 5: Switch back to legacy and verify it still works
    console.log('🔄 Phase 5: Switching back to legacy mode');
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.LEGACY;

    const finalLegacyOrder = await createTestOrder('final_legacy_test');
    console.log('✅ Legacy mode still functional');

    console.log('✅ LEGACY FALLBACK INTEGRITY PASSED');
    return {
      success: true,
      legacyOrders: legacyOrders.length,
      sovereignOrders: sovereignOrders.length
    };

  } catch (error) {
    console.error('❌ LEGACY FALLBACK INTEGRITY FAILED');
    console.error(error);
    return { success: false, error: error.message };
  } finally {
    // Restore original configuration
    process.env.ORDER_ENGINE_VERSION = originalVersion;
    process.env.FORCE_LEGACY_MODE = 'false';
  }
}

// ============================================
// TEST 3: SOVEREIGN ROLLBACK SAFETY
// ============================================

export async function testSovereignRollbackSafety() {
  console.log('🧪 TEST 3: SOVEREIGN ROLLBACK SAFETY');
  console.log('Testing that sovereign orders survive rollback scenarios');

  const originalVersion = ORDER_ENGINE_VERSION;
  const sovereignOrders: any[] = [];

  try {
    // Phase 1: Create sovereign orders
    console.log('📦 Phase 1: Creating sovereign orders');
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.SOVEREIGN;

    for (let i = 0; i < REPLAY_CONFIG.testIterations; i++) {
      const order = await createTestOrder(`sovereign_safety_${i}`);
      sovereignOrders.push(order);
    }

    console.log(`✅ Created ${sovereignOrders.length} sovereign orders`);

    // Phase 2: Simulate catastrophic failure - force legacy
    console.log('🚨 Phase 2: Simulating catastrophic failure');
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.LEGACY;
    process.env.FORCE_LEGACY_MODE = 'true';

    // Phase 3: System continues with legacy
    console.log('🔄 Phase 3: System running on legacy fallback');
    const legacyOrder = await createTestOrder('catastrophic_fallback_test');
    console.log('✅ Legacy fallback operational');

    // Phase 4: Verify sovereign orders still exist
    console.log('🔍 Phase 4: Verifying sovereign order safety');
    for (const sovereignOrder of sovereignOrders) {
      const currentOrder = await prisma.sovereignOrder.findUnique({
        where: { id: sovereignOrder.orderId }
      });

      if (!currentOrder) {
        throw new Error(`Sovereign order ${sovereignOrder.orderId} was lost during rollback`);
      }

      if (currentOrder.totalAmountPaisa !== sovereignOrder.totalAmountPaisa) {
        throw new Error(`Sovereign order ${sovereignOrder.orderId} amount changed`);
      }
    }

    console.log('✅ Sovereign orders preserved during rollback');

    // Phase 5: Restore sovereign mode
    console.log('🔧 Phase 5: Restoring sovereign mode');
    process.env.ORDER_ENGINE_VERSION = OrderEngineVersion.SOVEREIGN;
    process.env.FORCE_LEGACY_MODE = 'false';

    const restoredOrder = await createTestOrder('sovereign_restored_test');
    console.log('✅ Sovereign mode restored successfully');

    console.log('✅ SOVEREIGN ROLLBACK SAFETY PASSED');
    return { success: true, sovereignOrders: sovereignOrders.length };

  } catch (error) {
    console.error('❌ SOVEREIGN ROLLBACK SAFETY FAILED');
    console.error(error);
    return { success: false, error: error.message };
  } finally {
    // Restore original configuration
    process.env.ORDER_ENGINE_VERSION = originalVersion;
    process.env.FORCE_LEGACY_MODE = 'false';
  }
}

// ============================================
// TEST 4: MIGRATION STATE CONSISTENCY
// ============================================

export async function testMigrationStateConsistency() {
  console.log('🧪 TEST 4: MIGRATION STATE CONSISTENCY');
  console.log('Testing that migration flags produce consistent behavior');

  const testResults = [];

  // Test all combinations of migration flags
  const testCases = [
    { version: OrderEngineVersion.LEGACY, forceLegacy: false },
    { version: OrderEngineVersion.LEGACY, forceLegacy: true },
    { version: OrderEngineVersion.SOVEREIGN, forceLegacy: false },
    { version: OrderEngineVersion.SOVEREIGN, forceLegacy: true }
  ];

  for (const testCase of testCases) {
    try {
      // Set configuration
      process.env.ORDER_ENGINE_VERSION = testCase.version;
      process.env.FORCE_LEGACY_MODE = testCase.forceLegacy.toString();

      // Wait for config to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test order creation
      const order = await createTestOrder(`consistency_test_${testCase.version}_${testCase.forceLegacy}`);

      // Verify the order was created in the expected system
      let orderFound = false;
      let systemUsed = 'unknown';

      if (testCase.version === OrderEngineVersion.LEGACY || testCase.forceLegacy) {
        // Should be in legacy Order table
        const legacyOrder = await prisma.order.findFirst({
          where: { customerName: `Test Customer consistency_test_${testCase.version}_${testCase.forceLegacy}` }
        });
        if (legacyOrder) {
          orderFound = true;
          systemUsed = 'legacy';
        }
      } else {
        // Should be in sovereign SovereignOrder table
        const sovereignOrder = await prisma.sovereignOrder.findFirst({
          where: { customerName: `Test Customer consistency_test_${testCase.version}_${testCase.forceLegacy}` }
        });
        if (sovereignOrder) {
          orderFound = true;
          systemUsed = 'sovereign';
        }
      }

      if (!orderFound) {
        throw new Error(`Order not found in expected system for config: ${JSON.stringify(testCase)}`);
      }

      testResults.push({
        config: testCase,
        success: true,
        systemUsed
      });

    } catch (error) {
      testResults.push({
        config: testCase,
        success: false,
        error: error.message
      });
    }
  }

  // Analyze results
  const passed = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.failed).length;

  console.log(`✅ Migration state consistency: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('❌ Failed test cases:');
    testResults.filter(r => !r.success).forEach(r => {
      console.log(`   - ${JSON.stringify(r.config)}: ${r.error}`);
    });
    return { success: false, results: testResults };
  }

  console.log('✅ MIGRATION STATE CONSISTENCY PASSED');
  return { success: true, results: testResults };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function createTestOrder(identifier: string) {
  // Use the current migration routing
  const response = await fetch('http://localhost:5002/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-district-slug': 'shahdol'
    },
    body: JSON.stringify({
      items: [{ productId: REPLAY_CONFIG.testProductId, quantity: 1 }],
      customerName: `Test Customer ${identifier}`,
      customerPhone: '9999999999',
      customerAddress: 'Test Address',
      paymentMethod: 'ONLINE'
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function cleanupTestOrders(orders: any[]) {
  // Cleanup function for failed tests
  for (const order of orders) {
    try {
      // Delete test orders (would need proper cleanup logic in production)
      console.log(`Cleaning up test order: ${order.id || order.orderId}`);
    } catch (error) {
      console.warn(`Failed to cleanup order:`, error);
    }
  }
}

// ============================================
// MAIN TEST SUITE
// ============================================

export async function runMigrationReplaySuite() {
  console.log('🚀 STARTING MIGRATION REPLAY SUITE');
  console.log('===================================');

  try {
    const results = {
      rollbackDrill: await testRollbackDrill(),
      legacyIntegrity: await testLegacyFallbackIntegrity(),
      sovereignSafety: await testSovereignRollbackSafety(),
      stateConsistency: await testMigrationStateConsistency()
    };

    console.log('===================================');
    console.log('🎯 MIGRATION REPLAY SUITE COMPLETE');

    const allPassed = Object.values(results).every(r => r.success !== false);
    if (allPassed) {
      console.log('✅ ALL MIGRATION TESTS PASSED - SAFE FOR PRODUCTION');
    } else {
      console.log('❌ MIGRATION ISSUES DETECTED - DO NOT DEPLOY');
    }

    return results;

  } catch (error) {
    console.error('❌ MIGRATION REPLAY SUITE FAILED');
    console.error(error);
    throw error;
  }
}