import fetch from 'node-fetch';

async function testAPI() {
  try {
    const res = await fetch('http://localhost:5002/api/marketplace/home-snapshot');
    const data = await res.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testAPI();