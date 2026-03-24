import { Page, expect } from '@playwright/test';

export interface UserCredentials {
  username: string;
  password: string;
  role?: string;
}

export interface AuthTokens {
  accessToken: string;
  user: any;
}

/**
 * Wait for authentication cookies to be set in the browser context.
 * This is critical before navigating to protected routes like /checkout.
 * 
 * With httpOnly cookies, the server sets cookies via Set-Cookie headers.
 * We need to wait for them to be persisted before making authenticated requests.
 */
export async function waitForAuthCookies(page: Page): Promise<void> {
  // Wait for at least one cookie to be present
  await page.waitForFunction(() => {
    return document.cookie.length > 0;
  }, { timeout: 5000 }).catch(() => {
    // Fallback: just wait a bit for cookies to settle
    console.log('Cookie wait fallback triggered');
  });
  
  // Additional small wait to ensure cookie persistence
  await page.waitForTimeout(300);
}

/**
 * Verify that the user is authenticated by checking for cookies.
 * Returns true if auth cookies are present.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some(cookie => 
    cookie.name === 'accessToken' || 
    cookie.name === 'connect.sid' ||
    cookie.name === 'sessionId'
  );
}

/**
 * Register a new user
 * 
 * Registration doesn't return a token - need to login separately.
 * Returns user data from the login response.
 * 
 * With httpOnly cookies, the server sends Set-Cookie headers.
 * We wait for cookies to be set before returning.
 */
export async function registerUser(
  page: Page,
  credentials: UserCredentials
): Promise<AuthTokens> {
  // SOVEREIGN FIX: Include district headers to prevent 400 errors
  const response = await page.request.post('/api/auth/register', {
    headers: {
      'X-District-Slug': 'shahdol',
      'X-District-Id': '2',
    },
    data: {
      username: credentials.username,
      password: credentials.password,
      role: credentials.role || 'customer',
    },
  });

  expect(response.ok()).toBeTruthy();
  
  // SOVEREIGN FIX: Wait for URL to ensure session is established
  await page.waitForURL(/\/dashboard|\/home|\/customer-dashboard/, { timeout: 5000 }).catch(() => {
    // Fallback wait if URL doesn't match expected patterns
    return page.waitForLoadState('networkidle');
  });
  
  // Registration successful - now login to get session
  // The user is created but we need to login to establish the session
  return await loginUser(page, credentials);
}

/**
 * Login user and get JWT token
 * 
 * NOTE: With httpOnly cookies, the server returns tokens in cookies, not response body.
 * We use Playwright's cookie API to extract the token.
 * We also wait for cookies to be set before returning to ensure persistence.
 */
export async function loginUser(
  page: Page,
  credentials: UserCredentials
): Promise<AuthTokens> {
  // SOVEREIGN FIX: Include district headers to prevent 401 errors
  const response = await page.request.post('/api/auth/login', {
    headers: {
      'X-District-Slug': 'shahdol',
      'X-District-Id': '2',
    },
    data: {
      username: credentials.username,
      password: credentials.password,
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  // SOVEREIGN FIX: Wait for URL after login to ensure session is established
  await page.waitForURL(/\/dashboard|\/home|\/customer-dashboard|\/partner|\/admin/, { timeout: 5000 }).catch(() => {
    // Fallback wait if URL doesn't match expected patterns
    return page.waitForLoadState('networkidle');
  });
  
  // With httpOnly cookies, we can't read the token from response body.
  // Instead, use the user data from the response.
  // The browser automatically sends cookies with subsequent requests.
  
  // Wait for cookies to be set and persisted in the browser context
  // This is critical for checkout tests that navigate to protected routes
  await page.waitForFunction(() => {
    return document.cookie.includes('accessToken') || 
           document.cookie.includes('connect.sid') ||
           document.cookie.length > 0;
  }, { timeout: 5000 }).catch(() => {
    // If cookie check fails, at least wait a bit for cookies to settle
    return page.waitForTimeout(500);
  });

  // For test compatibility, store user in localStorage
  await page.addInitScript((user: any) => {
    localStorage.setItem('user', JSON.stringify(user));
  }, data.user);

  // Return user data (token is in httpOnly cookie, not accessible via JS)
  return {
    accessToken: '', // Empty - token is in httpOnly cookie
    user: data.user,
  };
}

/**
 * Set authentication data in page context
 * 
 * With httpOnly cookies, the token is stored in cookies, not localStorage.
 * We store the user object for client-side access.
 */
export async function setAuthToken(page: Page, user: any) {
  // Token is in httpOnly cookie - we only store user data in localStorage
  await page.addInitScript((user: any) => {
    localStorage.setItem('user', JSON.stringify(user));
  }, user);
}

/**
 * Clear authentication
 * 
 * With httpOnly cookies, we need to:
 * 1. Call the logout API to clear server-side cookies
 * 2. Clear localStorage items (user data)
 * 3. Clear browser context cookies
 */
export async function clearAuth(page: Page) {
  // First, try to call the logout API to clear server-side httpOnly cookies
  try {
    await page.request.post('/api/auth/logout');
  } catch (e) {
    // Ignore errors - logout API might not be available in all test scenarios
  }
  
  // Clear localStorage (user data stored for client-side access)
  await page.evaluate(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  });
  
  // Clear all cookies in the browser context
  await page.context().clearCookies();
}

/**
 * Get auth headers for API requests
 */
export function getAuthHeaders(token: string, contentType: string = 'application/json'): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  // Only add Content-Type if not multipart/form-data (Playwright handles it automatically)
  if (contentType !== 'multipart/form-data') {
    headers['Content-Type'] = contentType;
  }
  
  return headers;
}

/**
 * Create FormData for product creation
 */
export function createProductFormData(product: {
  title: string;
  name?: string;
  price: string;
  mrp?: string;
  category: string;
  description?: string;
  stock?: number | string;
}): FormData {
  const formData = new FormData();
  
  formData.append('title', product.title);
  formData.append('name', product.name || product.title);
  formData.append('price', product.price);
  if (product.mrp) formData.append('mrp', product.mrp);
  formData.append('category', product.category);
  if (product.description) formData.append('description', product.description);
  formData.append('stock', String(product.stock || 0));
  
  return formData;
}
