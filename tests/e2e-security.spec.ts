import { test, expect } from '@playwright/test';
import { registerUser, getAuthHeaders } from './helpers/auth-helper';

test.describe('JWT & Security Tests', () => {
  let merchantAToken: string;
  let merchantAUserId: number;
  let merchantBToken: string;
  let merchantBUserId: number;
  let merchantAProductId: number | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const timestamp = Date.now();

    // Create Merchant A
    const merchantAAuth = await registerUser(page, {
      username: `merchant_a_${timestamp}`,
      password: 'MerchantA123',
      role: 'merchant',
    });
    merchantAToken = merchantAAuth.accessToken;
    merchantAUserId = merchantAAuth.user.id;

    // Create a product for Merchant A
    const createResponse = await page.request.post('/api/merchant/products', {
      headers: getAuthHeaders(merchantAToken),
      data: {
        title: `Merchant A Product ${timestamp}`,
        name: `Merchant A Product ${timestamp}`,
        price: '299',
        category: 'Electronics',
        stock: '10',
      },
    });

    if (createResponse.ok()) {
      merchantAProductId = (await createResponse.json()).id;
      console.log(`✅ Merchant A product created: ${merchantAProductId}`);
    }

    // Create Merchant B
    const merchantBAuth = await registerUser(page, {
      username: `merchant_b_${timestamp}`,
      password: 'MerchantB123',
      role: 'merchant',
    });
    merchantBToken = merchantBAuth.accessToken;
    merchantBUserId = merchantBAuth.user.id;

    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup
    const context = await browser.newContext();
    const page = await context.newPage();

    if (merchantAProductId) {
      try {
        await page.request.delete(`/api/merchant/products/${merchantAProductId}`, {
          headers: getAuthHeaders(merchantAToken),
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    await context.close();
  });

  test('TC 5.1: Merchant Cannot Edit Other Merchant\'s Product', async ({ page }) => {
    if (!merchantAProductId) {
      test.skip();
      return;
    }

    // Merchant B tries to update Merchant A's product
    const updateResponse = await page.request.put(
      `/api/merchant/products/${merchantAProductId}`,
      {
        headers: getAuthHeaders(merchantBToken),
        data: {
          title: 'Hacked Product',
          price: '1',
          category: 'Hacked',
        },
      }
    );

    // Should return 403 Forbidden
    expect(updateResponse.status()).toBe(403);
    
    const errorData = await updateResponse.json();
    expect(errorData.message).toContain('own') || expect(errorData.code).toBe('FORBIDDEN');

    console.log('✅ Security check passed: Merchant B cannot edit Merchant A\'s product');

    // Verify product was not changed (get as Merchant A)
    const verifyResponse = await page.request.get('/api/merchant/products', {
      headers: getAuthHeaders(merchantAToken),
    });

    if (verifyResponse.ok()) {
      const products = await verifyResponse.json();
      const product = products.data?.find((p: any) => p.id === merchantAProductId);
      
      if (product) {
        expect(product.title).not.toBe('Hacked Product');
        expect(product.price).not.toBe('1');
      }
    }
  });

  test('TC 5.2: Unauthorized Access to Merchant API', async ({ page }) => {
    // Try to access merchant products without token
    const response = await page.request.get('/api/merchant/products', {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.message || data.code).toBeTruthy();
    expect(data.code || data.message).toMatch(/auth|unauthorized|token/i);

    console.log('✅ Unauthorized access properly blocked');
  });

  test('TC 5.3: Invalid Token Rejected', async ({ page }) => {
    // Try to access with invalid token
    const response = await page.request.get('/api/merchant/products', {
      headers: {
        'Authorization': 'Bearer invalid_token_12345',
        'Content-Type': 'application/json',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.message || data.code).toBeTruthy();

    console.log('✅ Invalid token properly rejected');
  });

  test('TC 5.4: Merchant Can Only See Own Products', async ({ page }) => {
    // Merchant A gets their products
    const merchantAResponse = await page.request.get('/api/merchant/products', {
      headers: getAuthHeaders(merchantAToken),
    });

    expect(merchantAResponse.ok()).toBeTruthy();
    const merchantAProducts = await merchantAResponse.json();

    // Verify all products belong to Merchant A
    if (merchantAProducts.data?.length > 0) {
      merchantAProducts.data.forEach((product: any) => {
        expect(product.sellerId || product.merchantId).toBe(merchantAUserId);
      });
    }

    // Merchant B gets their products
    const merchantBResponse = await page.request.get('/api/merchant/products', {
      headers: getAuthHeaders(merchantBToken),
    });

    expect(merchantBResponse.ok()).toBeTruthy();
    const merchantBProducts = await merchantBResponse.json();

    // Verify Merchant B's products don't include Merchant A's product
    if (merchantBProducts.data?.length > 0 && merchantAProductId) {
      const merchantBHasProductA = merchantBProducts.data.find(
        (p: any) => p.id === merchantAProductId
      );
      expect(merchantBHasProductA).toBeFalsy();
    }

    console.log('✅ Merchants can only see their own products');
  });

  test('TC 5.5: Customer Cannot Access Merchant APIs', async ({ page }) => {
    // Create a customer user
    const timestamp = Date.now();
    const customerAuth = await registerUser(page, {
      username: `testcustomer_${timestamp}`,
      password: 'Customer123',
      role: 'customer',
    });

    // Try to access merchant products API as customer
    const response = await page.request.get('/api/merchant/products', {
      headers: getAuthHeaders(customerAuth.accessToken),
    });

    // Should return 403 Forbidden (customer doesn't have MERCHANT role)
    expect(response.status()).toBe(403);
    
    const errorData = await response.json();
    expect(errorData.code || errorData.message).toMatch(/forbidden|permission|role/i);

    console.log('✅ Customer properly blocked from merchant APIs');
  });
});
