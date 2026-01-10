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
 * Register a new user
 */
export async function registerUser(
  page: Page,
  credentials: UserCredentials
): Promise<AuthTokens> {
  const response = await page.request.post('/api/register', {
    data: {
      username: credentials.username,
      password: credentials.password,
      role: credentials.role || 'customer',
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  // Register returns user but no token - need to login
  return await loginUser(page, credentials);
}

/**
 * Login user and get JWT token
 */
export async function loginUser(
  page: Page,
  credentials: UserCredentials
): Promise<AuthTokens> {
  const response = await page.request.post('/api/login', {
    data: {
      username: credentials.username,
      password: credentials.password,
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  // Store token in localStorage via context
  await page.addInitScript((token: string, user: any) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, data.accessToken, data.user);

  return {
    accessToken: data.accessToken,
    user: data.user,
  };
}

/**
 * Set authentication token in page context
 */
export async function setAuthToken(page: Page, token: string, user: any) {
  await page.addInitScript((token: string, user: any) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, token, user);
}

/**
 * Clear authentication
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  });
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
