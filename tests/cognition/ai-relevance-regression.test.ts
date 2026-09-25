/**
 * Phase 1 AI Relevance Regression Tests
 * Verifies domain classification, grounding isolation, and the critical relevance gate
 * across anomalous and baseline production queries.
 */

import { cognitiveParseQuery } from '../../server/services/cognitive.query.engine';
import { classifyQueryIntent } from '../../server/lib/cognition/intent.engine';
import { calculateRelevanceScore } from '../../server/lib/cognition/ranking.engine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION_FAILED: ${message}`);
  }
}

async function runRegressionSuite() {
  console.log('--- Starting AI Relevance Regression Suite ---\n');

  // Test 1: "heart specialist"
  console.log('1. Testing query: "heart specialist"');
  const heartParse = cognitiveParseQuery('heart specialist');
  assert(heartParse.domain === 'HEALTHCARE', `Expected HEALTHCARE domain, got: ${heartParse.domain}`);
  assert(heartParse.searchTerms.includes('heart'), 'Search terms must include heart');

  const heartIntent = classifyQueryIntent('heart specialist', heartParse);
  assert(heartIntent.domain === 'HEALTHCARE', `Expected HEALTHCARE intent domain, got: ${heartIntent.domain}`);

  // Test Relevance Gate on an unrelated Automobile vendor for "heart specialist"
  const unrelatedVendor = {
    id: 4,
    title: 'rsenterprises',
    entityType: 'SHOP',
    category: 'AUTOMOBILE',
    dsslScore: 70,
    rankScore: 92,
  };
  const rankedUnrelated = calculateRelevanceScore(unrelatedVendor, heartParse.searchTerms, heartParse, heartIntent as any);
  assert(rankedUnrelated.relevanceScore === 0, `Unrelated vendor must have relevanceScore 0, got: ${rankedUnrelated.relevanceScore}`);
  assert(rankedUnrelated.matchReasons.length === 0, 'Unrelated vendor must have no match reasons');
  console.log('   ✓ Classified as HEALTHCARE');
  console.log('   ✓ Unrelated automobile vendor rejected (relevanceScore = 0)\n');

  // Test 2: "night food"
  console.log('2. Testing query: "night food"');
  const foodParse = cognitiveParseQuery('night food');
  assert(foodParse.domain === 'FOOD', `Expected FOOD domain, got: ${foodParse.domain}`);
  assert(foodParse.searchTerms.includes('food'), 'Search terms must include food');

  // Unrelated vendor should get 0
  const rankedFoodUnrelated = calculateRelevanceScore(unrelatedVendor, foodParse.searchTerms, foodParse);
  assert(rankedFoodUnrelated.relevanceScore === 0, `Unrelated vendor for food query must have relevanceScore 0, got: ${rankedFoodUnrelated.relevanceScore}`);
  console.log('   ✓ Classified as FOOD');
  console.log('   ✓ Unrelated automobile vendor rejected (relevanceScore = 0)\n');

  // Test 3: "school admission"
  console.log('3. Testing query: "school admission"');
  const schoolParse = cognitiveParseQuery('school admission');
  assert(schoolParse.domain === 'EDUCATION', `Expected EDUCATION domain, got: ${schoolParse.domain}`);
  assert(schoolParse.searchTerms.includes('school'), 'Search terms must include school');

  const schoolIntent = classifyQueryIntent('school admission', schoolParse);
  assert(schoolIntent.domain === 'EDUCATION', `Expected EDUCATION intent domain, got: ${schoolIntent.domain}`);

  const rankedSchoolUnrelated = calculateRelevanceScore(unrelatedVendor, schoolParse.searchTerms, schoolParse, schoolIntent as any);
  assert(rankedSchoolUnrelated.relevanceScore === 0, `Unrelated vendor for school query must have relevanceScore 0, got: ${rankedSchoolUnrelated.relevanceScore}`);
  console.log('   ✓ Classified as EDUCATION');
  console.log('   ✓ Unrelated automobile vendor rejected (relevanceScore = 0)\n');

  // Test 4: "doctor" (Baseline)
  console.log('4. Testing baseline query: "doctor"');
  const doctorParse = cognitiveParseQuery('doctor');
  assert(doctorParse.domain === 'HEALTHCARE', `Expected HEALTHCARE domain, got: ${doctorParse.domain}`);
  const hospitalEntity = {
    id: 1,
    title: 'Apollo Hospital Shahdol',
    entityType: 'HOSPITAL',
    category: 'HEALTHCARE',
    dsslScore: 95,
    rankScore: 119
  };
  const rankedDoctor = calculateRelevanceScore(hospitalEntity, doctorParse.searchTerms, doctorParse);
  assert(rankedDoctor.relevanceScore > 50, `Expected relevant doctor score > 50, got: ${rankedDoctor.relevanceScore}`);
  console.log(`   ✓ Apollo Hospital correctly scored: ${rankedDoctor.relevanceScore}\n`);

  // Test 5: "emergency blood" (Baseline)
  console.log('5. Testing baseline query: "emergency blood"');
  const bloodParse = cognitiveParseQuery('emergency blood');
  assert(bloodParse.domain === 'HEALTHCARE', `Expected HEALTHCARE domain, got: ${bloodParse.domain}`);
  const bloodIntent = classifyQueryIntent('emergency blood', bloodParse);
  assert(bloodIntent.primaryIntent === 'EMERGENCY', `Expected EMERGENCY intent, got: ${bloodIntent.primaryIntent}`);
  const rankedBlood = calculateRelevanceScore(hospitalEntity, bloodParse.searchTerms, bloodParse, bloodIntent as any);
  assert(rankedBlood.relevanceScore > 70, `Expected emergency blood score > 70, got: ${rankedBlood.relevanceScore}`);
  console.log(`   ✓ Apollo Hospital correctly boosted for emergency: ${rankedBlood.relevanceScore}\n`);

  // Test 6: "mobile" (Baseline)
  console.log('6. Testing baseline query: "mobile"');
  const mobileParse = cognitiveParseQuery('mobile');
  assert(mobileParse.domain === 'ELECTRONICS', `Expected ELECTRONICS domain, got: ${mobileParse.domain}`);
  const mobileProduct = {
    id: 10,
    title: 'motorola mobile',
    entityType: 'PRODUCT',
    category: 'mobile',
    dsslScore: 60,
    rankScore: 70
  };
  const rankedMobile = calculateRelevanceScore(mobileProduct, mobileParse.searchTerms, mobileParse);
  assert(rankedMobile.relevanceScore > 30, `Expected relevant mobile score > 30, got: ${rankedMobile.relevanceScore}`);
  console.log(`   ✓ Motorola mobile correctly scored: ${rankedMobile.relevanceScore}\n`);

  // Test 7: "bus timing" (Baseline)
  console.log('7. Testing baseline query: "bus timing"');
  const busParse = cognitiveParseQuery('bus timing');
  assert(busParse.domain === 'TRANSPORT', `Expected TRANSPORT domain, got: ${busParse.domain}`);
  const busEntity = {
    id: 20,
    title: 'Shahdol → Rewa',
    entityType: 'BUS',
    category: 'TRANSPORT',
    dsslScore: 60,
    rankScore: 60
  };
  const rankedBus = calculateRelevanceScore(busEntity, busParse.searchTerms, busParse);
  assert(rankedBus.relevanceScore > 30, `Expected bus score > 30, got: ${rankedBus.relevanceScore}`);
  console.log(`   ✓ Bus entity correctly scored: ${rankedBus.relevanceScore}\n`);

  console.log('All 7 AI relevance regression tests PASSED successfully!');
}

runRegressionSuite().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
