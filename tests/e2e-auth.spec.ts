import { test, expect } from '@playwright/test';
import { registerUser, loginUser, clearAuth } from './helpers/auth-helper';

test.describe('User Registration & Login', () => {
  test.afterEach(async ({ page }) => {
    // Clean up auth state
    await clearAuth(page);
  });

  test('TC 1.1: Customer Registration', async ({ page }) => {
    const timestamp = Date.now();
    const username = `testcustomer_${timestamp}`;
    const password = 'Test123456';

    // Register customer
    const { user } = await registerUser(page, {
      username,
      password,
      role: 'customer',
    });

    // Verify registration successful - user data should be returned
    // (token is in httpOnly cookie, not accessible via JavaScript)
    expect(user).toBeTruthy();
    expect(user.username).toBe(username);
    expect(user.role).toBe('CUSTOMER');

    console.log(`✅ Customer registered: ${username}`);
  });

  test('TC 1.2: Merchant Registration', async ({ page }) => {
    const timestamp = Date.now();
    const username = `testmerchant_${timestamp}`;
    const password = 'Merchant123456';

    // Register merchant
    const { user } = await registerUser(page, {
      username,
      password,
      role: 'merchant',
    });

    // Verify registration successful
    expect(user).toBeTruthy();
    expect(user.username).toBe(username);
    expect(['MERCHANT', 'seller']).toContain(user.role);

    console.log(`✅ Merchant registered: ${username}`);
  });

  test('TC 1.3: Login Flow', async ({ page }) => {
    // First create a user
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const password = 'Test123456';

    await registerUser(page, { username, password });
    await clearAuth(page);

    // Now test login
    const { user } = await loginUser(page, { username, password });

    // Verify login successful - user data should be returned
    expect(user).toBeTruthy();
    expect(user.username).toBe(username);

    // Verify user is stored in localStorage
    // (token is in httpOnly cookie, not accessible via JavaScript)
    await page.goto('/');
    const storedUser = await page.evaluate(() => localStorage.getItem('user'));

    expect(storedUser).toBeTruthy();

    const parsedUser = JSON.parse(storedUser!);
    expect(parsedUser.username).toBe(username);

    console.log(`✅ Login successful for: ${username}`);
  });

  test('TC 1.4: Login with Invalid Credentials', async ({ page }) => {
    const response = await page.request.post('/api/auth/login', {
      data: {
        username: 'nonexistent',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.message).toContain('Invalid');
  });
});
