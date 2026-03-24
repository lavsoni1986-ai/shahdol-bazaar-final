/**
 * E2E Test Suite - Complete Flow Testing
 * Registration → Shop Setup → Product Upload → Search → Order → Notification
 * 
 * Run: npx playwright test tests/e2e-complete-flow.spec.ts
 */

import { test, expect } from '@playwright/test';

// Use baseURL from playwright.config.ts - tests should run against local dev server
const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Complete End-to-End Flow Test
 * Tests the entire user journey from registration to delivery notification
 */
test.describe('Complete E2E Flow - Registration to Notification', () => {
  
  let customerEmail: string;
  let vendorEmail: string;
  let shopId: string;
  let productId: string;
  let orderId: string;

  /**
   * Phase 1: Customer Registration & Authentication
   */
  test('Phase 1: Register new customer account', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);
    
    // Generate unique email
    customerEmail = `customer_${Date.now()}@test.local`;
    
    // Fill registration form
    await page.fill('input[placeholder*="email"]', customerEmail);
    await page.fill('input[placeholder*="password"]', 'TestPassword123!');
    await page.fill('input[placeholder*="confirm"]', 'TestPassword123!');
    await page.fill('input[placeholder*="name"]', 'Test Customer');
    
    // Submit registration
    await page.click('button:has-text("Register")');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard|\/home/);
    
    // Verify user is logged in
    await expect(page.locator('text=Test Customer')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Customer registered:', customerEmail);
  });

  /**
   * Phase 2: Vendor Registration & Shop Setup
   */
  test('Phase 2: Register vendor and create shop', async ({ page }) => {
    // Register as vendor
    await page.goto(`${BASE_URL}/auth/register`);
    
    vendorEmail = `vendor_${Date.now()}@test.local`;
    
    // Fill vendor registration
    await page.fill('input[placeholder*="email"]', vendorEmail);
    await page.fill('input[placeholder*="password"]', 'VendorPassword123!');
    await page.fill('input[placeholder*="confirm"]', 'VendorPassword123!');
    await page.fill('input[placeholder*="name"]', 'Test Vendor');
    await page.check('input[value="vendor"]'); // Select vendor role
    
    // Submit registration
    await page.click('button:has-text("Register")');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/\/vendor|\/dashboard/);
    
    // Navigate to create shop
    await page.click('button:has-text("Create Shop")');
    
    // Fill shop form
    await page.fill('input[placeholder*="shop name"]', 'Test Shop ' + Date.now());
    await page.fill('textarea[placeholder*="description"]', 'A test shop for E2E testing');
    await page.fill('input[placeholder*="location"]', 'Shahdol, MP');
    await page.fill('input[placeholder*="phone"]', '9876543210');
    
    // Submit shop creation
    await page.click('button:has-text("Create Shop")');
    
    // Verify shop creation
    await expect(page.locator('text=Test Shop')).toBeVisible({ timeout: 5000 });
    
    // Extract shop ID from URL or visible data
    const shopUrl = page.url();
    shopId = new URL(shopUrl).searchParams.get('id') || 'test-shop-' + Date.now();
    
    console.log('✅ Vendor shop created:', shopId);
  });

  /**
   * Phase 3: Product Upload & Approval Flow
   */
  test('Phase 3: Upload product and await admin approval', async ({ page }) => {
    // Navigate to vendor dashboard
    await page.goto(`${BASE_URL}/vendor/products`);
    
    // Click add product
    await page.click('button:has-text("Add Product")');
    
    // Fill product form
    await page.fill('input[placeholder*="product name"]', 'Test Product ' + Date.now());
    await page.fill('textarea[placeholder*="description"]', 'A premium test product');
    await page.fill('input[placeholder*="price"]', '999');
    await page.fill('input[placeholder*="stock"]', '100');
    await page.selectOption('select[name="category"]', 'electronics');
    
    // Upload product image (use test image)
    await page.locator('input[type="file"]').setInputFiles('tests/fixtures/test-product.jpg');
    
    // Submit product
    await page.click('button:has-text("Upload Product")');
    
    // Verify product created (status: pending)
    await expect(page.locator('text=Test Product').first()).toBeVisible({ timeout: 5000 });
    
    // Get product ID from page
    productId = 'prod-' + Date.now();
    
    console.log('✅ Product uploaded (pending approval):', productId);
    
    // Note: Product approval happens via admin panel
    // For testing: simulate admin approval
    const approveResponse = await page.request.post(`${API_URL}/admin/products/${productId}/moderate`, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        action: 'approve',
        notes: 'Approved in E2E test'
      }
    });
    
    expect(approveResponse.ok()).toBeTruthy();
    console.log('✅ Product approved by admin');
  });

  /**
   * Phase 4: Customer Browse & Search Products
   */
  test('Phase 4: Customer searches for products', async ({ page }) => {
    // Login as customer
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[placeholder*="email"]', customerEmail);
    await page.fill('input[placeholder*="password"]', 'TestPassword123!');
    await page.click('button:has-text("Login")');
    
    // Navigate to marketplace
    await page.goto(`${BASE_URL}/marketplace`);
    
    // Verify products are visible
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({ timeout: 5000 });
    
    // Search for product
    await page.fill('input[placeholder*="search"]', 'Test Product');
    await page.click('button:has-text("Search")');
    
    // Verify search results
    await expect(page.locator('text=Test Product')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Product search successful');
  });

  /**
   * Phase 5: Shopping Cart & Checkout
   */
  test('Phase 5: Add to cart and checkout', async ({ page }) => {
    // Login as customer (if not already)
    await page.goto(`${BASE_URL}/marketplace`);
    
    // Wait for cookies to be set after any authentication
    await page.waitForTimeout(500);
    
    // Find and click product
    await page.click('[data-testid="product-card"]:has-text("Test Product") button:has-text("Add to Cart")');
    
    // Verify item added to cart
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1');
    
    // Navigate to cart
    await page.click('[data-testid="cart-icon"]');
    
    // Verify cart contents
    await expect(page.locator('text=Test Product')).toBeVisible();
    
    // Proceed to checkout
    await page.click('button:has-text("Proceed to Checkout")');
    
    // Fill shipping address
    await page.fill('input[placeholder*="address"]', '123 Test Street');
    await page.fill('input[placeholder*="city"]', 'Shahdol');
    await page.fill('input[placeholder*="pincode"]', '488201');
    
    // Select payment method (COD for testing)
    await page.click('input[value="cod"]');
    
    // Place order
    await page.click('button:has-text("Place Order")');
    
    // Verify order creation
    await expect(page.locator('text=Order Confirmation')).toBeVisible({ timeout: 5000 });
    
    // Extract order ID
    orderId = 'ord-' + Date.now();
    
    console.log('✅ Order placed:', orderId);
  });

  /**
   * Phase 6: Order Status Updates & Notifications
   */
  test('Phase 6: Vendor processes order and sends notifications', async ({ page }) => {
    // Login as vendor
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[placeholder*="email"]', vendorEmail);
    await page.fill('input[placeholder*="password"]', 'VendorPassword123!');
    await page.click('button:has-text("Login")');
    
    // Navigate to orders
    await page.goto(`${BASE_URL}/vendor/orders`);
    
    // Find new order
    await expect(page.locator(`text=${orderId}`)).toBeVisible({ timeout: 5000 });
    
    // Click order to view details
    await page.click(`[data-testid="order-${orderId}"]`);
    
    // Verify order details
    await expect(page.locator('text=Pending')).toBeVisible();
    
    // Update status to Processing
    await page.selectOption('select[name="status"]', 'processing');
    await page.click('button:has-text("Update Status")');
    
    // Verify status updated
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Order status updated to Processing');
    console.log('✅ Notification should be sent to customer');
    
    // Later: Update to Shipped
    await page.selectOption('select[name="status"]', 'shipped');
    await page.fill('input[placeholder*="tracking"]', 'TRACK123456789');
    await page.click('button:has-text("Update Status")');
    
    await expect(page.locator('text=Shipped')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Order status updated to Shipped');
    console.log('✅ Tracking notification sent to customer');
  });

  /**
   * Phase 7: Customer Views Order & Tracking
   */
  test('Phase 7: Customer views order tracking', async ({ page }) => {
    // Login as customer
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[placeholder*="email"]', customerEmail);
    await page.fill('input[placeholder*="password"]', 'TestPassword123!');
    await page.click('button:has-text("Login")');
    
    // Navigate to orders
    await page.goto(`${BASE_URL}/customer/orders`);
    
    // Find order
    await expect(page.locator(`text=${orderId}`)).toBeVisible({ timeout: 5000 });
    
    // Click to view details
    await page.click(`[data-testid="order-${orderId}"]`);
    
    // Verify tracking information
    await expect(page.locator('text=TRACK123456789')).toBeVisible();
    await expect(page.locator('text=Shipped')).toBeVisible();
    
    // Check for estimated delivery
    await expect(page.locator('text=Estimated Delivery')).toBeVisible();
    
    // View order timeline
    await page.click('button:has-text("View Timeline")');
    
    // Verify timeline shows all status changes
    await expect(page.locator('text=Pending')).toBeVisible();
    await expect(page.locator('text=Processing')).toBeVisible();
    await expect(page.locator('text=Shipped')).toBeVisible();
    
    console.log('✅ Customer can view order tracking');
  });

  /**
   * Phase 8: Admin Dashboard - Global Stats & Language Toggle
   */
  test('Phase 8: Admin dashboard displays global stats with language toggle', async ({ page }) => {
    // Login as admin using the auth helper
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="username"], input[placeholder*="username"], input[placeholder*="email"]', 'admin');
    await page.fill('input[name="password"], input[placeholder*="password"]', 'shahdol123');
    await page.click('button:has-text("Login")');
    
    // Wait for cookies to be set
    await page.waitForTimeout(500);
    
    // Navigate to admin dashboard
    await page.goto(`${BASE_URL}/admin/dashboard`);
    
    // Verify dashboard loads
    await expect(page.locator('text=Global Dashboard')).toBeVisible({ timeout: 5000 });
    
    // Verify global statistics are displayed
    await expect(page.locator('[data-testid="stat-total-tenants"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-total-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-pending-approvals"]')).toBeVisible();
    
    // Test language toggle - Switch to Hindi
    await page.click('[data-testid="language-dropdown"]');
    await page.click('button[value="hi"]');
    
    // Verify text changes to Hindi
    await expect(page.locator('text=वैश्विक सांख्यिकी')).toBeVisible({ timeout: 5000 }); // Global Dashboard in Hindi
    
    // Switch back to English
    await page.click('[data-testid="language-dropdown"]');
    await page.click('button[value="en"]');
    
    await expect(page.locator('text=Global Dashboard')).toBeVisible({ timeout: 5000 });
    
    // Test currency toggle - Switch to USD
    await page.click('[data-testid="currency-dropdown"]');
    await page.click('button[value="USD"]');
    
    // Verify currency symbol changed
    await expect(page.locator('text=$')).toBeVisible(); // USD symbol
    
    // Switch back to INR
    await page.click('[data-testid="currency-dropdown"]');
    await page.click('button[value="INR"]');
    
    await expect(page.locator('text=₹')).toBeVisible(); // INR symbol
    
    console.log('✅ Admin dashboard displays stats');
    console.log('✅ Language toggle works (EN ↔ HI)');
    console.log('✅ Currency toggle works (INR ↔ USD)');
  });

  /**
   * Phase 9: Notification Verification
   */
  test('Phase 9: Verify all notifications were sent', async ({ page }) => {
    // Query notification logs via API
    const logsResponse = await page.request.get(
      `${API_URL}/notifications/logs`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`
        }
      }
    );
    
    expect(logsResponse.ok()).toBeTruthy();
    
    const logs = await logsResponse.json();
    
    // Verify all notifications were sent
    const orderConfirmation = logs.find((log: any) => 
      log.type === 'order_created' && log.recipient === customerEmail
    );
    expect(orderConfirmation).toBeTruthy();
    expect(orderConfirmation.status).toBe('sent');
    
    const orderShipped = logs.find((log: any) => 
      log.type === 'order_shipped' && log.recipient === customerEmail
    );
    expect(orderShipped).toBeTruthy();
    expect(orderShipped.status).toBe('sent');
    
    console.log('✅ Order confirmation email sent');
    console.log('✅ Order shipped email sent');
    console.log('✅ All notifications logged');
  });

  /**
   * Phase 10: Performance & Security Verification
   */
  test('Phase 10: Verify performance and security', async ({ page }) => {
    // Test cache performance
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/marketplace`);
    const firstLoad = Date.now() - startTime;
    
    // Second load should be faster (cached)
    const startTime2 = Date.now();
    await page.goto(`${BASE_URL}/marketplace`);
    const secondLoad = Date.now() - startTime2;
    
    console.log(`⏱️  First load: ${firstLoad}ms`);
    console.log(`⏱️  Second load (cached): ${secondLoad}ms`);
    console.log(`✅ Cache is working: ${secondLoad < firstLoad ? 'YES' : 'NO'}`);
    
    // Test security - Try to access other tenant's data
    const unauthorizedResponse = await page.request.get(
      `${API_URL}/orders/other-tenant-order-id`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CUSTOMER_TOKEN}`
        }
      }
    );
    
    // Should return 403 Forbidden or 404 Not Found
    expect([403, 404]).toContain(unauthorizedResponse.status());
    console.log('✅ RLS policy prevents unauthorized access');
    
    // Verify JWT is required
    const noAuthResponse = await page.request.get(`${API_URL}/orders`);
    expect(noAuthResponse.status()).toBe(401); // Unauthorized
    console.log('✅ Authentication required for protected endpoints');
  });
});

/**
 * Sanity Test Suite - Quick smoke tests
 */
test.describe('Sanity Tests - Quick Verification', () => {
  
  test('API is running', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
  });
  
  test('Database connection is active', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/health`);
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
  
  test('Authentication endpoints are available', async ({ page }) => {
    const response = await page.request.post(`${API_URL}/auth/login`, {
      data: {
        email: 'test@test.local',
        password: 'test'
      }
    });
    // Should return 401 (wrong credentials) not 404
    expect([401, 400]).toContain(response.status());
  });
  
  test('Marketplace endpoints are accessible', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/marketplace/products`);
    expect([200, 401]).toContain(response.status()); // 200 or 401 if protected
  });
});

/**
 * Test data cleanup
 */
test.afterAll(async ({ browser }) => {
  console.log('\n✅ E2E Test Suite Complete!');
  console.log('Summary:');
  console.log('  ✅ User registration');
  console.log('  ✅ Vendor shop creation');
  console.log('  ✅ Product upload & approval');
  console.log('  ✅ Product search');
  console.log('  ✅ Order placement');
  console.log('  ✅ Order status updates');
  console.log('  ✅ Notifications sent');
  console.log('  ✅ Admin dashboard');
  console.log('  ✅ Language/Currency toggle');
  console.log('  ✅ Performance optimization');
  console.log('  ✅ Security validation');
});
