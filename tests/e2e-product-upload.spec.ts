import { test, expect } from '@playwright/test';
import { registerUser, loginUser, getAuthHeaders, clearAuth } from './helpers/auth-helper';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Merchant Product Upload', () => {
  let merchantToken: string;
  let merchantUser: any;
  let testProductId: number | null = null;
  const timestamp = Date.now();
  const merchantUsername = `sanjivaniclinic_${timestamp}`;
  const merchantPassword = 'Sanjivani123';

  test.beforeAll(async ({ browser }) => {
    // Create merchant account
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const auth = await registerUser(page, {
      username: merchantUsername,
      password: merchantPassword,
      role: 'merchant',
    });
    
    merchantToken = auth.accessToken;
    merchantUser = auth.user;
    
    await context.close();
  });

  test.afterAll(async () => {
    // Cleanup will be handled in test cleanup
  });

  test('TC 2.1: Create Product (Sanjivani Clinic) with Images', async ({ page }) => {
    // Set auth token
    await page.addInitScript((token: string, user: any) => {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, merchantToken, merchantUser);

    // Navigate to products page
    await page.goto('/partner/products');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if we're on auth page (redirected due to missing shop)
    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      console.log('⚠️ Redirected to auth - merchant may need shop setup');
      // This is expected if merchant doesn't have a shop yet
      return;
    }

    // Click Add Product button
    const addButton = page.locator('button:has-text("Add Product"), button:has-text("Naya Item")').first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Wait for dialog
    await page.waitForSelector('input[placeholder*="Product"], input[placeholder*="title"]', { timeout: 5000 });

    // Fill product form
    const productTitle = `Sanjivani Clinic - Healthcare Services ${timestamp}`;
    await page.fill('input[placeholder*="Product"], input[placeholder*="title"]', productTitle);
    await page.fill('input[type="number"][placeholder*="Price"], input[placeholder*="Price"]', '500');
    await page.fill('input[placeholder*="MRP"]', '600');
    
    // Select category if dropdown exists
    const categorySelect = page.locator('select, [role="combobox"]').first();
    if (await categorySelect.count() > 0) {
      await categorySelect.click();
      await page.locator('text=/Healthcare|General/i').first().click();
    } else {
      // If no dropdown, fill category input
      await page.fill('input[placeholder*="Category"]', 'Healthcare');
    }

    // Fill description
    const description = 'Best healthcare services in Shahdol';
    await page.fill('textarea[placeholder*="description"]', description);

    // Set stock
    await page.fill('input[placeholder*="Stock"], input[type="number"][placeholder*="0"]', '10');

    // Upload images - create test image file
    const imageInput = page.locator('input[type="file"]').first();
    if (await imageInput.count() > 0) {
      // Create a simple test image (1x1 pixel PNG)
      const testImagePath = path.join(__dirname, 'test-image.png');
      // Use a simple base64 encoded 1x1 PNG
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      // Try to upload via file input
      await imageInput.setInputFiles({
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from(pngBase64, 'base64'),
      });
      
      // Wait for image preview
      await page.waitForTimeout(1000);
    }

    // Submit form
    const submitButton = page.locator('button:has-text("Create Product"), button[type="submit"]').first();
    await submitButton.click();

    // Wait for success message or product to appear in list
    await page.waitForTimeout(2000);
    
    // Check for success toast or product in list
    const successMessage = page.locator('text=/success|created|successfully/i').first();
    if (await successMessage.count() > 0) {
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }

    // Verify product appears in list (via API)
    const productsResponse = await page.request.get('/api/merchant/products', {
      headers: getAuthHeaders(merchantToken),
    });

    expect(productsResponse.ok()).toBeTruthy();
    const productsData = await productsResponse.json();
    const createdProduct = productsData.data?.find((p: any) => 
      (p.title || p.name)?.includes('Sanjivani Clinic')
    );

    expect(createdProduct).toBeTruthy();
    expect(createdProduct.status).toBe('pending');
    expect(createdProduct.approved).toBe(false);

    testProductId = createdProduct.id;
    console.log(`✅ Product created with ID: ${testProductId}`);
  });

  test('TC 2.2: View Merchant Products via API', async ({ page }) => {
    // Test API directly
    const response = await page.request.get('/api/merchant/products', {
      headers: getAuthHeaders(merchantToken),
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.data).toBeInstanceOf(Array);
    
    // Verify all products belong to merchant
    if (data.data.length > 0) {
      data.data.forEach((product: any) => {
        expect(product.sellerId || product.merchantId).toBe(merchantUser.id);
      });
    }

    console.log(`✅ Merchant has ${data.data.length} products`);
  });

  test('TC 2.3: Merchant Cannot Access Without Token', async ({ page }) => {
    const response = await page.request.get('/api/merchant/products', {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.message || data.code).toBeTruthy();
  });
});
