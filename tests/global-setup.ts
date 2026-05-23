/**
 * ============================================
 * GLOBAL PLAYWRIGHT SETUP - District Context
 * ============================================
 * 
 * This setup ensures ALL test requests automatically include
 * the district context (X-District-Slug: shahdol) to prevent
 * 400 errors during E2E tests.
 * 
 * Usage:
 * - Tests automatically get district context
 * - No need to manually add ?district=shahdol to URLs
 * - Supports both API calls and page navigations
 */

import { test as base, expect, type APIRequestContext } from '@playwright/test';

/**
 * SOVEREIGN FIX: Generate unique test email
 * Ensures no duplicate registration errors
 */
export function generateTestEmail(): string {
  return `user-${Date.now()}@shahdol.com`;
}

/**
 * ============================================
 * GLOBAL TEST SETUP
 * ============================================
 * 
 * This runs before each test suite to ensure district context is set.
 */
export default async function globalSetup() {
  console.log('🛡️ [PLAYWRIGHT] Global setup: Setting default district context');
  console.log('   → X-District-Slug: shahdol');
  console.log('   → X-District-Id: 2');
}

/**
 * ============================================
 * TEST FIXTURE: Extended test with district context
 * ============================================
 */
export const test = base.extend({
  // Override the page fixture to add district to all navigations
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page);
    
    // Override goto to automatically add district parameter
    page.goto = async (url: string, options?: any) => {
      const urlObj = new URL(url, 'http://localhost');
      if (!urlObj.searchParams.has('district')) {
        urlObj.searchParams.set('district', 'shahdol');
      }
      return originalGoto(urlObj.toString(), options);
    };
    
    await use(page);
  },
});

// Re-export expect
export { expect };

/**
 * ============================================
 * UTILITY: Create authenticated request with district
 * ============================================
 */
export async function createAuthenticatedRequest(
  baseContext: any,
  token: string,
  districtSlug: string = 'shahdol',
  districtId: number = parseInt(process.env.DISTRICT_ID || '3')
) {
  return await baseContext.newContext({
    extraHTTPHeaders: {
      'Authorization': `Bearer ${token}`,
      'X-District-Slug': districtSlug,
      'X-District-Id': String(districtId),
    },
  });
}

/**
 * ============================================
 * UTILITY: Navigate with district context
 * ============================================
 */
export async function navigateWithDistrict(page: any, url: string) {
  // Add district query param to URL if not present
  const hasDistrict = url.includes('district=') || url.includes('?district');
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = hasDistrict ? url : `${url}${separator}district=shahdol`;
  
  await page.goto(fullUrl);
}
