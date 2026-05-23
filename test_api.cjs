const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:5002/api/marketplace/stores?limit=4', {
      headers: { 'x-district-slug': 'shahdol' }
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();