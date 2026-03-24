/**
 * Shahdol Bazaar SaaS - Load Testing Script
 * Tests: 50 concurrent searches + 20 concurrent form submissions
 * 
 * Run with: npx tsx scripts/load-test.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const CONCURRENT_SEARCHES = 50;
const CONCURRENT_SUBMISSIONS = 20;

interface LoadTestResult {
  type: string;
  success: number;
  failed: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  errors: string[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSearchLoad(query: string): Promise<{ time: number; success: boolean; error?: string }> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
    const time = Date.now() - startTime;
    
    if (response.ok) {
      return { time, success: true };
    } else {
      return { time, success: false, error: `HTTP ${response.status}` };
    }
  } catch (error: any) {
    return { time: Date.now() - startTime, success: false, error: error.message };
  }
}

async function testSubmissionLoad(index: number): Promise<{ time: number; success: boolean; error?: string }> {
  const startTime = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/school-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: `Load Test Student ${index}`,
        parentName: `Load Test Parent ${index}`,
        mobileNumber: `9${String(Math.floor(Math.random() * 9000000000 + 1000000000)).slice(0, 10)}`,
        class: ['Nursery', 'KG', 'Class 1', 'Class 5', 'Class 10'][Math.floor(Math.random() * 5)],
        schoolName: 'Load Test School'
      })
    });
    
    const time = Date.now() - startTime;
    
    if (response.ok) {
      // Clean up the test inquiry
      try {
        const data = await response.json();
        if (data.inquiryId) {
          await (prisma as any).schoolInquiry?.delete?.({ where: { id: data.inquiryId } });
        }
      } catch {}
      return { time, success: true };
    } else {
      return { time, success: false, error: `HTTP ${response.status}` };
    }
  } catch (error: any) {
    return { time: Date.now() - startTime, success: false, error: error.message };
  }
}

async function runConcurrentTests(
  testFn: (index: number) => Promise<{ time: number; success: boolean; error?: string }>,
  count: number,
  type: string
): Promise<LoadTestResult> {
  console.log(`\n🚀 Starting ${count} concurrent ${type} tests...`);
  
  const startTime = Date.now();
  
  // Run all tests concurrently
  const promises = Array.from({ length: count }, (_, i) => testFn(i));
  const results = await Promise.all(promises);
  
  const totalTime = Date.now() - startTime;
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  const result: LoadTestResult = {
    type,
    success: successful.length,
    failed: failed.length,
    avgTime: Math.round(successful.reduce((sum, r) => sum + r.time, 0) / (successful.length || 1)),
    minTime: successful.length > 0 ? Math.min(...successful.map(r => r.time)) : 0,
    maxTime: successful.length > 0 ? Math.max(...successful.map(r => r.time)) : 0,
    errors: [...new Set(failed.map(r => r.error).filter(Boolean) as string[])]
  };
  
  return result;
}

function printResult(result: LoadTestResult) {
  const icon = result.failed === 0 ? '✅' : result.failed < result.success ? '⚠️' : '❌';
  
  console.log(`\n${icon} ${result.type} Load Test Results:`);
  console.log(`   ✅ Successful: ${result.success}/${result.success + result.failed}`);
  console.log(`   ❌ Failed: ${result.failed}`);
  console.log(`   ⏱️  Avg Time: ${result.avgTime}ms`);
  console.log(`   ⚡ Min Time: ${result.minTime}ms`);
  console.log(`   🐢 Max Time: ${result.maxTime}ms`);
  
  if (result.errors.length > 0) {
    console.log(`   📝 Errors: ${result.errors.join(', ')}`);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  try {
    // Delete inquiries with "Load Test" in the name
    const deleted = await (prisma as any).schoolInquiry?.deleteMany?.({
      where: {
        OR: [
          { studentName: { contains: 'Load Test' } },
          { schoolName: 'Load Test School' }
        ]
      }
    });
    console.log(`   Deleted ${deleted?.count || 0} test inquiries`);
  } catch (error) {
    console.log('   Cleanup skipped (table may not exist yet)');
  }
}

async function printFinalReport(results: LoadTestResult[]) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 SHAHDOL BAZAAR SaaS - LOAD TEST REPORT');
  console.log('='.repeat(70));
  
  console.log(`\n🔧 Test Configuration:`);
  console.log(`   Concurrent Searches: ${CONCURRENT_SEARCHES}`);
  console.log(`   Concurrent Submissions: ${CONCURRENT_SUBMISSIONS}`);
  console.log(`   API URL: ${BASE_URL}`);
  
  const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalRequests = totalSuccess + totalFailed;
  const overallAvgTime = Math.round(
    results.reduce((sum, r) => sum + (r.avgTime * r.success), 0) / totalSuccess
  );
  
  console.log(`\n📈 Overall Results:`);
  console.log(`   Total Requests: ${totalRequests}`);
  console.log(`   Successful: ${totalSuccess} (${Math.round(totalSuccess/totalRequests*100)}%)`);
  console.log(`   Failed: ${totalFailed} (${Math.round(totalFailed/totalRequests*100)}%)`);
  console.log(`   Overall Avg Response Time: ${overallAvgTime}ms`);
  
  // Performance Analysis
  console.log(`\n📋 Performance Analysis:`);
  results.forEach(r => {
    const status = r.maxTime > 2000 ? '🐌 SLOW' : r.maxTime > 1000 ? '⚠️ MODERATE' : '✅ FAST';
    console.log(`   ${r.type}: ${status} (max: ${r.maxTime}ms)`);
  });
  
  // Server Health Check
  const crashed = totalFailed > totalRequests * 0.1; // More than 10% failures
  const overloaded = overallAvgTime > 1000; // More than 1 second average
  
  console.log(`\n🔍 Server Health:`);
  if (crashed) {
    console.log(`   ❌ Server appears to have CRASHED or is UNSTABLE (${totalFailed} failures)`);
  } else if (overloaded) {
    console.log(`   ⚠️  Server is OVERLOADED (avg response: ${overallAvgTime}ms)`);
  } else {
    console.log(`   ✅ Server is HEALTHY and PERFORMING well`);
  }
  
  const finalStatus = crashed ? 'SERVER UNSTABLE' : overloaded ? 'PERFORMANCE WARNING' : 'ALL TESTS PASSED';
  const finalIcon = crashed ? '🚨' : overloaded ? '⚠️' : '🎉';
  
  console.log(`\n${finalIcon} Final Status: ${finalStatus}`);
  console.log('='.repeat(70) + '\n');
  
  // Cleanup
  await cleanupTestData();
  
  process.exit(crashed ? 1 : 0);
}

async function main() {
  console.log('🚀 Starting Shahdol Bazaar SaaS Load Tests...\n');
  console.log(`API URL: ${BASE_URL}`);
  console.log(`Concurrent Searches: ${CONCURRENT_SEARCHES}`);
  console.log(`Concurrent Submissions: ${CONCURRENT_SUBMISSIONS}`);
  console.log('\n⚡ Preparing concurrent load...');
  
  // Warm up the server with a single request
  console.log('🔥 Warming up server...');
  try {
    await fetch(`${BASE_URL}/api/health`);
    console.log('   Server is ready!\n');
  } catch (error) {
    console.log('   Warning: Server may not be running. Continuing anyway...\n');
  }
  
  // Run load tests
  const searchResults = await runConcurrentTests(
    async (i: number) => testSearchLoad(i % 2 === 0 ? 'रीवा' : 'डॉक्टर'),
    CONCURRENT_SEARCHES,
    'Search API'
  );
  printResult(searchResults);
  
  const submissionResults = await runConcurrentTests(
    testSubmissionLoad,
    CONCURRENT_SUBMISSIONS,
    'Form Submission API'
  );
  printResult(submissionResults);
  
  // Print final report
  await printFinalReport([searchResults, submissionResults]);
}

main().catch(async (error) => {
  console.error('❌ Load test failed:', error);
  await cleanupTestData();
  process.exit(1);
});
