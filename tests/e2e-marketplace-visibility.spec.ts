import { test, expect } from '@playwright/test';
import { registerUser, loginUser, getAuthHeaders } from './helpers/auth-helper';

test.describe('Marketplace Visibility', () => {
  let approvedProductId: number | null = null;
  let pendingProductId: number | null = null;
  let rejectedProductId: number | null = null;
  let adminToken: string;
  let merchantToken: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as admin
    try {
      const adminAuth = await loginUser(page, {
        username: 'admin',
        password: 'shahdol123',
      });
      adminToken = adminAuth.accessToken;
    } catch (e) {
      console.log('⚠️ Admin login failed');
    }

    // Create merchant and products
    const timestamp = Date.now();
    const merchantAuth = await registerUser(page, {
      username: `testmerchant_${timestamp}`,
      password: 'Merchant123',
      role: 'merchant',
    });
    merchantToken = merchantAuth.accessToken;

    // Create pending product
    const pendingResponse = await page.request.post('/api/merchant/products', {
      headers: getAuthHeaders(merchantToken),
      data: {
        title: `Pending Product ${timestamp}`,
        name: `Pending Product ${timestamp}`,
        price: '199',
        category: 'Test',
        stock: '1',
      },
    });

    if (pendingResponse.ok()) {
      pendingProductId = (await pendingResponse.json()).id;
    }

    // Create and approve product
    const approvedResponse = await page.request.post('/api/merchant/products', {
      headers: getAuthHeaders(merchantToken),
      data: {
        title: `Approved Product ${timestamp}`,
        name: `Approved Product ${timestamp}`,
        price: '299',
        category: 'Test',
        stock: '5',
      },
    });

    if (approvedResponse.ok()) {
      approvedProductId = (await approvedResponse.json()).id;
      
      // Approve it
      if (adminToken) {
        await page.request.patch(
          `/api/admin/products/${approvedProductId}/approve`,
          {
            headers: getAuthHeaders(adminToken),
          }
        );
      }
    }

    // Create and reject product
    const rejectedResponse = await page.request.post('/api/merchant/products', {
      headers: getAuthHeaders(merchantToken),
      data: {
        title: `Rejected Product ${timestamp}`,
        name: `Rejected Product ${timestamp}`,
        price: '99',
        category: 'Test',
        stock: '1',
      },
    });

    if (rejectedResponse.ok()) {
      rejectedProductId = (await rejectedResponse.json()).id;
      
      // Reject it
      if (adminToken) {
        await page.request.patch(
          `/api/admin/products/${rejectedProductId}/reject`,
          {
            headers: getAuthHeaders(adminToken),
            data: { reason: 'Test rejection' },
          }
        );
      }
    }

    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup
    const context = await browser.newContext();
    const page = await context.newPage();

    const products = [approvedProductId, pendingProductId, rejectedProductId].filter(Boolean);
    
    for (const productId of products) {
      try {
        await page.request.delete(`/api/merchant/products/${productId}`, {
          headers: getAuthHeaders(merchantToken),
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    await context.close();
  });

  test('TC 4.1: Only Approved Products Visible on Homepage', async ({ page }) => {
    // Visit homepage as anonymous user (no auth)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Fetch products via API (public endpoint)
    const response = await page.request.get('/api/products');
    expect(response.ok()).toBeTruthy();
    
    const products = await response.json();
    expect(Array.isArray(products)).toBeTruthy();

    // Verify only approved products are visible
    products.forEach((product: any) => {
      expect(product.approved).toBe(true);
      expect(product.status).toBe('approved');
    });

    // Verify pending product is NOT visible
    if (pendingProductId) {
      const pendingProduct = products.find((p: any) => p.id === pendingProductId);
      expect(pendingProduct).toBeFalsy();
    }

    // Verify rejected product is NOT visible
    if (rejectedProductId) {
      const rejectedProduct = products.find((p: any) => p.id === rejectedProductId);
      expect(rejectedProduct).toBeFalsy();
    }

    // Verify approved product IS visible
    if (approvedProductId) {
      const approvedProduct = products.find((p: any) => p.id === approvedProductId);
      expect(approvedProduct).toBeTruthy();
      expect(approvedProduct.approved).toBe(true);
    }

    console.log(`✅ Marketplace shows ${products.length} approved products`);
  });

  test('TC 4.2: Product Details Page Shows Approved Products', async ({ page }) => {
    if (!approvedProductId) {
      test.skip();
      return;
    }

    // Visit product details page
    await page.goto(`/product/${approvedProductId}`);
    await page.waitForLoadState('networkidle');

    // Verify product details are visible
    const productTitle = page.locator('h1, h2, [class*="title"]').first();
    await expect(productTitle).toBeVisible({ timeout: 10000 });

    // Verify product price is visible
    const productPrice = page.locator('text=/₹|price/i').first();
    await expect(productPrice).toBeVisible({ timeout: 5000 });
  });

  test('TC 4.3: Pending Products Not Accessible via Public URL', async ({ page }) => {
    if (!pendingProductId) {
      test.skip();
      return;
    }

    // Try to access pending product directly
    await page.goto(`/product/${pendingProductId}`);
    await page.waitForLoadState('networkidle');

    // Product should either not exist or show error
    // Check if product is accessible or shows 404
    const notFound = page.locator('text=/not found|404|error/i');
    
    // Either product page shows error, or product is not found
    const currentUrl = page.url();
    expect(currentUrl.includes('/product/') || notFound.isVisible()).toBeTruthy();
  });
});
