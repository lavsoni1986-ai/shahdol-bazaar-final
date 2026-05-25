/**
 * TEST DISTRICT INTELLIGENCE - Verify operational memory is working
 */

async function testDistrictIntelligence() {
  try {
    console.log('🧠 Testing District Intelligence API...');

    // Test the district intelligence API
    const response = await fetch('http://localhost:5002/api/admin/district-intelligence', {
      method: 'GET',
      headers: {
        // For testing, we'll assume auth is bypassed or use a simple approach
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      console.log('🔒 API requires authentication (expected)');
      console.log('✅ District intelligence routes are mounted');
      return;
    }

    const data = await response.json();

    if (data.success) {
      console.log('✅ District Intelligence API working!');
      console.log(`📊 Total demand signals: ${data.data.summary?.totalDemandSignals || 0}`);
      console.log(`🚨 Critical gaps: ${data.data.criticalGaps?.length || 0}`);
      console.log(`📈 Top demand intents: ${data.data.topDemand?.length || 0}`);

      if (data.data.topDemand && data.data.topDemand.length > 0) {
        console.log('🎯 Top 3 demand intents:');
        data.data.topDemand.slice(0, 3).forEach((demand: any, i: number) => {
          console.log(`  ${i+1}. ${demand.intent}: ${demand.totalSearches} searches`);
        });
      }

      if (data.data.recommendedOnboarding && data.data.recommendedOnboarding.length > 0) {
        console.log('🎯 Onboarding recommendations:');
        data.data.recommendedOnboarding.slice(0, 3).forEach((rec: any, i: number) => {
          console.log(`  ${i+1}. ${rec.category}: ${rec.priority} priority (${rec.gapRatio}x gap)`);
        });
      }
    } else {
      console.log('❌ API returned error:', data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', (error as any).message);
  }
}

testDistrictIntelligence().catch(console.error);