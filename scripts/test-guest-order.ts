async function testGuestOrder() {
  const API_BASE = 'http://localhost:5001/api';
  console.log('🧪 Testing Guest Checkout Flow...\n');

  try {
    // Step 1: Get product details
    console.log('1️⃣ Fetching Wireless Earbuds product...');
    const productsRes = await fetch(`${API_BASE}/products/all`);
    const allProducts = await productsRes.json();
    const earbudsProduct = allProducts.find((p: any) => p.name?.includes('Earbuds'));
    
    if (!earbudsProduct) {
      throw new Error('Wireless Earbuds product not found');
    }
    console.log(`   ✅ Found: ${earbudsProduct.name} (ID: ${earbudsProduct.id}, Price: ₹${earbudsProduct.price})\n`);

    // Step 2: Create guest order via API
    console.log('2️⃣ Submitting guest order via /api/orders...');
    const orderPayload = {
      productId: earbudsProduct.id,
      shopId: earbudsProduct.shopId || 1,
      customerName: 'Guest Checkout Test',
      customerPhone: '9876543210',
      customerAddress: '123 Test Street, Shahdol, MP',
      quantity: 1,
      totalPrice: earbudsProduct.price.toString(),
      status: 'pending',
      paymentStatus: 'pending',
    };

    console.log('   Order Payload:', JSON.stringify(orderPayload, null, 2));
    
    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // NO Authorization header - testing guest checkout
      },
      body: JSON.stringify(orderPayload),
    });

    console.log(`\n   Response Status: ${orderRes.status}\n`);

    if (!orderRes.ok) {
      const errorData = await orderRes.json();
      throw new Error(`Order submission failed (${orderRes.status}): ${JSON.stringify(errorData)}`);
    }

    const createdOrder = await orderRes.json();
    console.log(`   ✅ Order created! ID: ${createdOrder.id}\n`);
    console.log(`   Order Details:`, JSON.stringify(createdOrder, null, 2));
    console.log('\n✨ SUCCESS! Guest order submitted to backend.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testGuestOrder();
