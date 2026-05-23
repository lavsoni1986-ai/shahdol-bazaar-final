import fetch from 'node-fetch';

async function testEntityHydration() {
  const baseUrl = 'http://localhost:5002';

  console.log('Testing Entity Hydration and Title Handling...\n');

  // Test vendor hydration
  const vendorSlug = 'apollo-hospital-shahdol';
  try {
    console.log(`Testing vendor: ${vendorSlug}`);
    const vendorRes = await fetch(`${baseUrl}/api/marketplace/vendors/${vendorSlug}`, {
      headers: { 'x-district-slug': 'shahdol' }
    });
    console.log(`  Status: ${vendorRes.status}`);
    if (vendorRes.ok) {
      const vendorData = await vendorRes.json();
      console.log(`  ✅ Vendor hydrated successfully`);
      console.log(`  Name: ${vendorData.data?.name || 'N/A'}`);
      console.log(`  Status: ${vendorData.data?.status || 'N/A'}`);
      console.log(`  Has products: ${vendorData.data?.products?.length || 0}`);
    } else {
      console.log(`  ❌ Failed: ${await vendorRes.text()}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log('');

  // Test home snapshot for overall data
  try {
    console.log('Testing home snapshot...');
    const homeRes = await fetch(`${baseUrl}/api/marketplace/home-snapshot`, {
      headers: { 'x-district-slug': 'shahdol' }
    });
    console.log(`  Status: ${homeRes.status}`);
    if (homeRes.ok) {
      const homeData = await homeRes.json();
      console.log(`  ✅ Home data retrieved successfully`);
      console.log(`  Has vendors: ${homeData.data?.vendors?.length || 0}`);
      console.log(`  Has products: ${homeData.data?.products?.length || 0}`);
    } else {
      console.log(`  ❌ Failed: ${await homeRes.text()}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

testEntityHydration().catch(console.error);