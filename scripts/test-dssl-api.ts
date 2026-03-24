/**
 * API Test Script: Verify dsslScore is returned
 */

import http from 'http';

function testAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5001,
      path: '/api/products?approved=true',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const products = JSON.parse(data);
          console.log('✅ API Response Received!\n');
          console.log(`📦 Total products: ${products.length}\n`);
          
          if (products.length > 0) {
            console.log('📋 First Product (Full Details):\n');
            console.log(JSON.stringify(products[0], null, 2));
            
            console.log('\n\n✅ VERIFICATION RESULTS:\n');
            const product = products[0];
            console.log(`   ✓ ID: ${product.id}`);
            console.log(`   ✓ Name: ${product.name}`);
            console.log(`   ✓ Price: ${product.price}`);
            console.log(`   ✓ Category: ${product.category}`);
            
            if (product.dsslScore !== undefined && product.dsslScore !== null) {
              console.log(`   ✓ DSSL Score: ${product.dsslScore} ✅ PRESENT!`);
            } else {
              console.log(`   ✗ DSSL Score: MISSING ❌`);
            }
            
            console.log('\n\n📊 All Products Summary:');
            products.forEach((p, idx) => {
              console.log(`   Product #${p.id}: "${p.name}" → DSSL Score: ${p.dsslScore}`);
            });
          }
          resolve();
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

console.log('🔍 Testing API Endpoint: http://127.0.0.1:5001/api/products\n');
testAPI()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
