/**
 * TEST COGNITION SEARCH - Verify semantic retrieval is working
 */

import { searchUnified } from '../services/searchUnified.service.js';

async function testCognitionSearch() {
  const testQueries = [
    { query: 'doctor', expected: 'healthcare entities' },
    { query: 'electrician', expected: 'Raju Electrician' },
    { query: 'electronics', expected: 'Shree Ram Electronics' },
    { query: 'headphones', expected: 'Boat Rockerz' },
    { query: 'repair', expected: 'service entities' },
    { query: 'medical', expected: 'healthcare entities' }
  ];

  for (const test of testQueries) {
    try {
      console.log(`\n🧪 Testing: "${test.query}"`);
      console.log(`Expected: ${test.expected}`);

      const result = await searchUnified(test.query, 1); // districtId = 1 for Shahdol

      console.log(`Found ${result.results.vendors.length} vendors, ${result.results.products.length} products`);
      console.log(`Search expansion: ${result.meta.searchExpansion?.expandedTerms?.join(', ')}`);
      console.log(`Confidence: ${(result.meta.searchExpansion?.confidence * 100).toFixed(1)}%`);

      if (result.results.vendors.length > 0) {
        console.log(`Top result: ${result.results.vendors[0].name} (${result.results.vendors[0].category})`);
      }

    } catch (error) {
      console.error(`❌ Test failed for "${test.query}":`, (error as any).message);
    }
  }
}

testCognitionSearch().catch(console.error);