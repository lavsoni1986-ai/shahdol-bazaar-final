import { apiRequest } from './lib/api-client.js';

async function testConnectivity() {
  console.log('Testing API connectivity...\n');

  try {
    console.log('1. Testing /api/districts/shahdol...');
    const districtResponse = await apiRequest('GET', '/districts/shahdol');
    console.log('✅ District API working:', districtResponse.data?.name);

    console.log('2. Testing /api/marketplace/home-snapshot...');
    const homeResponse = await apiRequest('GET', '/marketplace/home-snapshot');
    console.log('✅ Home snapshot API working:', homeResponse.data ? 'Has data' : 'Empty data');

    console.log('3. Testing /ai/concierge...');
    const aiResponse = await apiRequest('POST', '/ai/concierge', {
      query: 'test query',
      context: { districtSlug: 'shahdol' }
    });
    console.log('✅ AI concierge API working:', aiResponse.data ? 'Has response' : 'Empty response');

    console.log('\n🎉 ALL APIs CONNECTED SUCCESSFULLY!');
    console.log('Frontend ↔ Backend proxy is working correctly.');

  } catch (error) {
    console.error('❌ API connectivity test failed:', error.message);
    console.error('This indicates the Vite proxy is not forwarding requests to port 5002');
  }
}

// Only run in browser environment
if (typeof window !== 'undefined') {
  testConnectivity();
}