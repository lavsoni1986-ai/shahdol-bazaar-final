import { test, expect } from '@playwright/test';
import { loginUser, registerUser, getAuthHeaders } from './helpers/auth-helper';

test.describe('Admin Approval Workflow', () => {
  let adminToken: string;
  let adminUser: any;
  let merchantToken: string;
  let testProductId: number | null = null;

  test.beforeAll(async ({ browser }) => {
    // Login as admin
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      const adminAuth = await loginUser(page, {
        username: 'admin',
        password: 'shahdol123',
      });
      adminToken = adminAuth.accessToken;
      adminUser = adminAuth.user;
      console.log('✅ Admin logged in');
    } catch (e) {
      console.log('⚠️ Admin login failed, may need to create admin user');
    }

    // Create merchant and product for testing
    const timestamp = Date.now();
    const merchantUsername = `testmerchant_${timestamp}`;
    
    const merchantAuth = await registerUser(page, {
      username: merchantUsername,
      password: 'Merchant123',
      role: 'merchant',
    });
    merchantToken = merchantAuth.accessToken;

    // Create a pending product
    const createResponse = await page.request.post('/api/merchant/products', {
      headers: getAuthHeaders(merchantToken),
      multipart: {
        title: `Test Product for Approval ${timestamp}`,
        name: `Test Product for Approval ${timestamp}`,
        price: '299',
        category: 'Electronics',
        description: 'Test product for admin approval workflow',
        stock: '5',
      },
    });

    if (createResponse.ok()) {
      const productData = await createResponse.json();
      testProductId = productData.id;
      console.log(`✅ Test product created: ${testProductId}`);
    }
    
    // Keep context open for tests
  });

  test.afterAll(async () => {
    // Cleanup handled per test
  });

  test('TC 3.1: View Pending Products', async ({ page }) => {
    if (!adminToken) {
      test.skip();
      return;
    }

    const response = await page.request.get('/api/admin/products/pending', {
      headers: getAuthHeaders(adminToken),
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.data).toBeInstanceOf(Array);
    
    // Verify all products are pending
    if (data.data.length > 0) {
      data.data.forEach((product: any) => {
        expect(product.status).toBe('pending');
        expect(product.approved).toBe(false);
      });

      console.log(`✅ Found ${data.data.length} pending products`);
    } else {
      console.log('ℹ️ No pending products found');
    }
  });

  test('TC 3.2: Approve Product', async ({ page }) => {
    if (!adminToken || !testProductId) {
      test.skip();
      return;
    }

    // First verify product is pending
    const checkResponse = await page.request.get(`/api/products/${testProductId}`);
    if (checkResponse.ok()) {
      const product = await checkResponse.json();
      expect(product.status).toBe('pending');
    }

    // Approve the product
    const approveResponse = await page.request.patch(
      `/api/admin/products/${testProductId}/approve`,
      {
        headers: getAuthHeaders(adminToken),
      }
    );

    expect(approveResponse.ok()).toBeTruthy();
    const approvedProduct = await approveResponse.json();
    
    expect(approvedProduct.status).toBe('approved');
    expect(approvedProduct.approved).toBe(true);

    console.log(`✅ Product ${testProductId} approved successfully`);

    // Verify product is no longer in pending list
    const pendingResponse = await page.request.get('/api/admin/products/pending', {
      headers: getAuthHeaders(adminToken),
    });
    
    if (pendingResponse.ok()) {
      const pendingData = await pendingResponse.json();
      const stillPending = pendingData.data?.find((p: any) => p.id === testProductId);
      expect(stillPending).toBeFalsy();
    }
  });

  test('TC 3.3: Reject Product', async ({ page }) => {
    if (!adminToken) {
      test.skip();
      return;
    }

    // Create a new product for rejection test
    const timestamp = Date.now();
    const merchantUsername = `testmerchant_reject_${timestamp}`;
    
    const merchantAuth = await registerUser(page, {
      username: merchantUsername,
      password: 'Merchant123',
      role: 'merchant',
    });

    // Create product
    const createResponse = await page.request.post('/api/merchant/products', {
      headers: getAuthHeaders(merchantAuth.accessToken),
      data: {
        title: `Test Product for Rejection ${timestamp}`,
        name: `Test Product for Rejection ${timestamp}`,
        price: '199',
        category: 'Test',
        stock: '1',
      },
    });

    if (!createResponse.ok()) {
      test.skip();
      return;
    }

    const productData = await createResponse.json();
    const productId = productData.id;

    // Reject the product
    const rejectResponse = await page.request.patch(
      `/api/admin/products/${productId}/reject`,
      {
        headers: getAuthHeaders(adminToken),
        data: {
          reason: 'Test rejection',
        },
      }
    );

    expect(rejectResponse.ok()).toBeTruthy();
    const rejectedProduct = await rejectResponse.json();
    
    expect(rejectedProduct.status).toBe('rejected');
    expect(rejectedProduct.approved).toBe(false);

    console.log(`✅ Product ${productId} rejected successfully`);

    // Cleanup
    try {
      await page.request.delete(`/api/merchant/products/${productId}`, {
        headers: getAuthHeaders(merchantAuth.accessToken),
      });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test('TC 3.4: Non-Admin Cannot Approve Products', async ({ page }) => {
    // Create a regular user (not admin)
    const timestamp = Date.now();
    const customerAuth = await registerUser(page, {
      username: `testcustomer_${timestamp}`,
      password: 'Customer123',
      role: 'customer',
    });

    if (!testProductId) {
      test.skip();
      return;
    }

    // Try to approve as non-admin
    const response = await page.request.patch(
      `/api/admin/products/${testProductId}/approve`,
      {
        headers: getAuthHeaders(customerAuth.accessToken),
      }
    );

    expect(response.status()).toBe(403); // Forbidden
  });
});
