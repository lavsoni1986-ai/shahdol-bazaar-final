/**
 * CONCURRENCY ATTACK TESTING SUITE
 *
 * Enterprise-grade stress testing for BharatOS commerce infrastructure.
 * Tests race conditions, inventory collisions, duplicate payments, retry storms.
 */

import { prisma } from '../storage.js';
import { SovereignOrderEngine } from '../services/order.engine.js';

// ============================================
// TEST CONFIGURATION
// ============================================

const TEST_CONFIG = {
  concurrentOrders: 100,
  testProductId: 1, // Use existing Boat Rockerz product
  testDistrictId: 1,
  testUserId: 1,
  inventoryQuantity: 10, // Limited stock to force collisions
  retryAttempts: 5,
  retryDelay: 100 // ms
};

// ============================================
// TEST 1: SIMULTANEOUS ORDER FLOOD
// ============================================

export async function testConcurrentOrderFlood() {
  console.log('🧪 TEST 1: SIMULTANEOUS ORDER FLOOD');
  console.log(`Launching ${TEST_CONFIG.concurrentOrders} concurrent orders...`);

  // Prepare test data
  await prepareTestInventory();

  const startTime = Date.now();

  // Launch 100 concurrent orders
  const orderPromises = Array.from({ length: TEST_CONFIG.concurrentOrders }, (_, i) =>
    createTestOrder(`user_${i}`, `order_${i}`)
  );

  const results = await Promise.allSettled(orderPromises);
  const endTime = Date.now();

  // Analyze results
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`✅ Results: ${successful} successful, ${failed} failed`);
  console.log(`⏱️  Duration: ${endTime - startTime}ms`);
  console.log(`📊 Throughput: ${(TEST_CONFIG.concurrentOrders / ((endTime - startTime) / 1000)).toFixed(1)} orders/sec`);

  // Check inventory integrity
  await verifyInventoryIntegrity();

  return { successful, failed, duration: endTime - startTime };
}

// ============================================
// TEST 2: INVENTORY COLLISION ATTACK
// ============================================

export async function testInventoryCollision() {
  console.log('🧪 TEST 2: INVENTORY COLLISION ATTACK');

  // Set inventory to exactly 5 items
  await prisma.product.update({
    where: { id: TEST_CONFIG.testProductId },
    data: {
      availableStock: 5,
      reservedStock: 0,
      soldStock: 0
    }
  });

  // Launch 10 concurrent orders for 1 item each (should allow 5, reject 5)
  const orderPromises = Array.from({ length: 10 }, (_, i) =>
    createTestOrder(`collision_user_${i}`, `collision_${i}`, 1)
  );

  const results = await Promise.allSettled(orderPromises);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`✅ Inventory collision results: ${successful} successful, ${failed} failed`);

  // Verify exactly 5 succeeded, 5 failed
  if (successful === 5 && failed === 5) {
    console.log('✅ INVENTORY INTEGRITY PRESERVED');
  } else {
    console.log('❌ INVENTORY INTEGRITY VIOLATED');
    throw new Error('Inventory collision test failed');
  }

  await verifyInventoryIntegrity();
  return { successful, failed };
}

// ============================================
// TEST 3: DUPLICATE PAYMENT ATTACK
// ============================================

export async function testDuplicatePaymentAttack() {
  console.log('🧪 TEST 3: DUPLICATE PAYMENT ATTACK');

  const idempotencyKey = `test_duplicate_${Date.now()}`;

  // Launch 10 identical orders with same idempotency key
  const duplicatePromises = Array.from({ length: 10 }, () =>
    createTestOrderWithIdempotency('duplicate_user', 'duplicate_order', idempotencyKey)
  );

  const results = await Promise.allSettled(duplicatePromises);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`✅ Duplicate payment results: ${successful} successful, ${failed} failed`);

  // Should be exactly 1 successful, 9 failed (idempotency working)
  if (successful === 1 && failed === 9) {
    console.log('✅ IDEMPOTENCY PROTECTION WORKING');
  } else {
    console.log('❌ IDEMPOTENCY PROTECTION FAILED');
    throw new Error('Duplicate payment protection failed');
  }

  return { successful, failed };
}

// ============================================
// TEST 4: RETRY STORM ATTACK
// ============================================

export async function testRetryStorm() {
  console.log('🧪 TEST 4: RETRY STORM ATTACK');

  // First exhaust inventory
  await prisma.product.update({
    where: { id: TEST_CONFIG.testProductId },
    data: {
      availableStock: 1,
      reservedStock: 0,
      soldStock: 0
    }
  });

  // Launch 50 concurrent retries for the same item
  const retryPromises = Array.from({ length: 50 }, () =>
    createTestOrderWithRetry('retry_user', 'retry_order', TEST_CONFIG.retryAttempts)
  );

  const results = await Promise.allSettled(retryPromises);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`✅ Retry storm results: ${successful} successful, ${failed} failed`);

  // Should be exactly 1 successful (first one gets the inventory), rest fail
  if (successful === 1 && failed === 49) {
    console.log('✅ RETRY STORM MITIGATED');
  } else {
    console.log('❌ RETRY STORM VULNERABILITY');
    throw new Error('Retry storm protection failed');
  }

  await verifyInventoryIntegrity();
  return { successful, failed };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function prepareTestInventory() {
  // Reset test product inventory
  await prisma.product.update({
    where: { id: TEST_CONFIG.testProductId },
    data: {
      availableStock: TEST_CONFIG.inventoryQuantity,
      reservedStock: 0,
      soldStock: 0
    }
  });
  console.log(`📦 Test inventory prepared: ${TEST_CONFIG.inventoryQuantity} items`);
}

async function createTestOrder(userId: string, orderId: string, quantity = 1) {
  const orderEngine = new SovereignOrderEngine(null);

  return await orderEngine.createOrder({
    userId: TEST_CONFIG.testUserId,
    districtId: TEST_CONFIG.testDistrictId,
    items: [{ productId: TEST_CONFIG.testProductId, quantity }],
    customerName: `Test Customer ${userId}`,
    customerPhone: '9999999999',
    customerAddress: 'Test Address',
    paymentMethod: 'ONLINE'
  });
}

async function createTestOrderWithIdempotency(userId: string, orderId: string, idempotencyKey: string) {
  const orderEngine = new SovereignOrderEngine(null);

  return await orderEngine.createOrder({
    userId: TEST_CONFIG.testUserId,
    districtId: TEST_CONFIG.testDistrictId,
    items: [{ productId: TEST_CONFIG.testProductId, quantity: 1 }],
    customerName: `Test Customer ${userId}`,
    customerPhone: '9999999999',
    customerAddress: 'Test Address',
    paymentMethod: 'ONLINE',
    idempotencyKey
  });
}

async function createTestOrderWithRetry(userId: string, orderId: string, maxRetries: number) {
  const orderEngine = new SovereignOrderEngine(null);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await orderEngine.createOrder({
        userId: TEST_CONFIG.testUserId,
        districtId: TEST_CONFIG.testDistrictId,
        items: [{ productId: TEST_CONFIG.testProductId, quantity: 1 }],
        customerName: `Test Customer ${userId}`,
        customerPhone: '9999999999',
        customerAddress: 'Test Address',
        paymentMethod: 'ONLINE'
      });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.retryDelay));
    }
  }
}

async function verifyInventoryIntegrity() {
  const product = await prisma.product.findUnique({
    where: { id: TEST_CONFIG.testProductId },
    select: {
      availableStock: true,
      reservedStock: true,
      soldStock: true
    }
  });

  if (!product) {
    throw new Error('Test product not found');
  }

  const totalInventory = product.availableStock + product.reservedStock + product.soldStock;
  const originalInventory = TEST_CONFIG.inventoryQuantity;

  console.log(`📊 Inventory check: ${product.availableStock} available, ${product.reservedStock} reserved, ${product.soldStock} sold`);
  console.log(`📊 Total inventory: ${totalInventory} (should be ${originalInventory})`);

  if (totalInventory !== originalInventory) {
    throw new Error(`Inventory integrity violation: ${totalInventory} !== ${originalInventory}`);
  }

  console.log('✅ INVENTORY INTEGRITY VERIFIED');
}

// ============================================
// MAIN TEST SUITE
// ============================================

export async function runConcurrencyAttackSuite() {
  console.log('🚀 STARTING CONCURRENCY ATTACK SUITE');
  console.log('=====================================');

  try {
    const results = {
      floodTest: await testConcurrentOrderFlood(),
      collisionTest: await testInventoryCollision(),
      duplicateTest: await testDuplicatePaymentAttack(),
      retryTest: await testRetryStorm()
    };

    console.log('=====================================');
    console.log('🎯 CONCURRENCY ATTACK SUITE COMPLETE');
    console.log('✅ ALL TESTS PASSED - SYSTEM CONCURRENCY SAFE');

    return results;

  } catch (error) {
    console.error('❌ CONCURRENCY ATTACK SUITE FAILED');
    console.error(error);
    throw error;
  }
}