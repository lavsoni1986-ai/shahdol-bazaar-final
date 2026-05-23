import fetch from 'node-fetch';

async function testAPIs() {
  const baseUrl = 'http://localhost:5002';

  console.log('Testing backend APIs directly...\n');

  const endpoints = [
    '/api/districts/shahdol',
    '/api/marketplace/home-snapshot',
    '/api/ai/concierge'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${baseUrl}${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: endpoint.includes('concierge') ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-district-slug': 'shahdol'
        },
        body: endpoint.includes('concierge') ? JSON.stringify({
          query: 'test',
          context: { districtSlug: 'shahdol' }
        }) : undefined
      });

      console.log(`  Status: ${response.status}`);
      if (response.status === 200) {
        const data = await response.json();
        console.log(`  ✅ Success: ${JSON.stringify(data).slice(0, 100)}...`);
      } else {
        const text = await response.text();
        console.log(`  ❌ Response: ${text.slice(0, 100)}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }
}

testAPIs().catch(console.error);