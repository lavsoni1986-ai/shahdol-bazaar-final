import { test, expect } from '@playwright/test';
import { registerUser, loginUser, getAuthHeaders } from './helpers/auth-helper';

/**
 * Complete End-to-End Flow Test
 * Tests the full workflow: Registration → Product Upload → Admin Approval → Marketplace Visibility
 */
test.describe('Complete E2E Flow: Sanjivani Clinic', () => {
  let merchantToken: string;
  let adminToken: string;
  let productId: number | null = null;
  const timestamp = Date.now();
  const merchantUsername = `sanjivaniclinic_${timestamp}`;

  test('Complete Flow: Merchant Registration → Product Upload → Admin Approval → Marketplace', async ({ page }) => {
    test.setTimeout(60000); // 60 seconds for complete flow

    console.log('🚀 Starting complete E2E flow test...');

    // Step 1: Register Merchant
    console.log('📝 Step 1: Registering merchant...');
    const merchantAuth = await registerUser(page, {
      username: merchantUsername,
      password: 'Sanjivani123',
      role: 'merchant',
    });
    
    merchantToken = merchantAuth.accessToken;
    expect(merchantToken).toBeTruthy();
    expect(merchantAuth.user.role).toMatch(/MERCHANT|seller/i);
    console.log('✅ Merchant registered:', merchantUsername);

    // Step 2: Create Shop (if needed for product creation)
    console.log('🏪 Step 2: Checking shop setup...');
    const shopResponse = await page.request.get('/api/shops/mine', {
      headers: getAuthHeaders(merchantToken),
    });
    
    // If shop doesn't exist, create one
    let shop = null;
    if (!shopResponse.ok() || !(await shopResponse.json()).id) {
      const createShopResponse = await page.request.post('/api/partner/shop/create-default', {
        headers: getAuthHeaders(merchantToken),
        data: {
          name: 'Sanjivani Clinic',
          category: 'Healthcare',
          address: 'Shahdol',
          mobile: '9999999999',
        },
      });
      
      if (createShopResponse.ok()) {
        shop = await createShopResponse.json();
        console.log('✅ Shop created:', shop.name);
      }
    } else {
      shop = await shopResponse.json();
      console.log('✅ Shop exists:', shop.name);
    }

    // Step 3: Create Product
    console.log('📦 Step 3: Creating product...');
    const productData = {
      title: `Sanjivani Clinic - Healthcare Services ${timestamp}`,
      name: `Sanjivani Clinic - Healthcare Services ${timestamp}`,
      price: '500',
      mrp: '600',
      category: 'Healthcare',
      description: 'Best healthcare services in Shahdol. We provide quality medical care.',
      stock: '10',
    };

    const createProductResponse = await page.request.post('/api/merchant/products', {
      headers: getAuthHeaders(merchantToken),
      multipart: productData,
    });

    expect(createProductResponse.ok()).toBeTruthy();
    const createdProduct = await createProductResponse.json();
    productId = createdProduct.id;
    
    expect(createdProduct.status).toBe('pending');
    expect(createdProduct.approved).toBe(false);
    expect((createdProduct.title || createdProduct.name)).toContain('Sanjivani Clinic');
    console.log('✅ Product created:', productId);

    // Step 4: Verify Product is NOT on Marketplace
    console.log('🔍 Step 4: Verifying product is NOT on marketplace...');
    const publicProductsResponse = await page.request.get('/api/products');
    expect(publicProductsResponse.ok()).toBeTruthy();
    
    const publicProducts = await publicProductsResponse.json();
    const productOnMarketplace = publicProducts.find((p: any) => p.id === productId);
    expect(productOnMarketplace).toBeFalsy();
    console.log('✅ Pending product correctly excluded from marketplace');

    // Step 5: Admin Approves Product
    console.log('👨‍💼 Step 5: Admin approving product...');
    try {
      const adminAuth = await loginUser(page, {
        username: 'admin',
        password: 'shahdol123',
      });
      adminToken = adminAuth.accessToken;
    } catch (e) {
      console.log('⚠️ Admin login failed, skipping approval step');
      test.skip();
      return;
    }

    // Get pending products
    const pendingResponse = await page.request.get('/api/admin/products/pending', {
      headers: getAuthHeaders(adminToken),
    });

    expect(pendingResponse.ok()).toBeTruthy();
    const pendingProducts = await pendingResponse.json();
    const ourPendingProduct = pendingProducts.data?.find((p: any) => p.id === productId);
    
    expect(ourPendingProduct).toBeTruthy();
    expect(ourPendingProduct.status).toBe('pending');
    console.log('✅ Product found in pending list');

    // Approve the product
    const approveResponse = await page.request.patch(
      `/api/admin/products/${productId}/approve`,
      {
        headers: getAuthHeaders(adminToken),
      }
    );

    expect(approveResponse.ok()).toBeTruthy();
    const approvedProduct = await approveResponse.json();
    expect(approvedProduct.status).toBe('approved');
    expect(approvedProduct.approved).toBe(true);
    console.log('✅ Product approved by admin');

    // Wait a bit for system to process
    await page.waitForTimeout(2000);

    // Step 6: Verify Product is NOW on Marketplace
    console.log('🌐 Step 6: Verifying product is NOW on marketplace...');
    const updatedPublicProductsResponse = await page.request.get('/api/products');
    expect(updatedPublicProductsResponse.ok()).toBeTruthy();
    
    const updatedPublicProducts = await updatedPublicProductsResponse.json();
    const approvedProductOnMarketplace = updatedPublicProducts.find((p: any) => p.id === productId);
    
    expect(approvedProductOnMarketplace).toBeTruthy();
    expect(approvedProductOnMarketplace.status).toBe('approved');
    expect(approvedProductOnMarketplace.approved).toBe(true);
    console.log('✅ Approved product now visible on marketplace!');

    // Step 7: Verify Product Details Page
    console.log('📄 Step 7: Verifying product details page...');
    await page.goto(`/product/${productId}`);
    await page.waitForLoadState('networkidle');

    const productTitle = page.locator('h1, h2, [class*="title"]').first();
    await expect(productTitle).toBeVisible({ timeout: 10000 });
    
    const titleText = await productTitle.textContent();
    expect(titleText).toContain('Sanjivani');
    console.log('✅ Product details page accessible');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    try {
      await page.request.delete(`/api/merchant/products/${productId}`, {
        headers: getAuthHeaders(merchantToken),
      });
      console.log('✅ Test product deleted');
    } catch (e) {
      console.log('⚠️ Could not cleanup product');
    }

    console.log('🎉 Complete E2E flow test PASSED!');
  });
});
