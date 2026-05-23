import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the sovereign homepage
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check if page loads successfully
    await expect(page).toHaveTitle(/Shahdol Bazaar/i);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check if main content is visible
    await expect(page.locator('body')).toBeVisible();

    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/homepage-loaded.png' });
  });

  test('should display sovereign AI interface', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Brand appears as two adjacent spans "SHAHDOL" + "BAZAAR"
    // Accessible text is "SHAHDOLBAZAAR" (no space between the spans)
    await expect(
      page.getByText(/SHAHDOL.*BAZAAR/i)
    ).toBeVisible();

    // "Ask AI" button in the search bar
    await expect(
      page.getByRole('button', { name: /Ask AI/i })
    ).toBeVisible();

    // Bottom nav items — use exact role-based selectors to avoid
    // matching product titles like "Home visit service"
    await expect(
      page.getByRole('link', { name: 'Home', exact: true })
    ).toBeVisible();

    await expect(
      page.getByRole('link', { name: 'Shops', exact: true })
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/sovereign-home-ui.png'
    });
  });

  test('should navigate to bus timetable', async ({ page }) => {
    // Navigate directly to the bus timetable route
    // (homepage bus card is behind a conditional render that depends
    //  on the backend snapshot API — direct route is more reliable)
    await page.goto('/bus-timetable');

    await page.waitForLoadState('networkidle');

    // Verify the page title indicates bus timetable loaded
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // Check for bus-related content on the page
    const busContent = page.locator('text=/Bus|बस|Timetable|समय/i').first();
    await expect(busContent).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'test-results/bus-timetable-page.png'
    });
  });

  test('should display sovereign mobile navigation', async ({ page }) => {
    await page.goto('/');

    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.waitForLoadState('networkidle');

    // Use exact role-based selectors for bottom nav links
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Shops', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cart', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile', exact: true })).toBeVisible();

    await page.screenshot({
      path: 'test-results/mobile-navigation.png'
    });
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if page is still functional on mobile
    await expect(page.locator('body')).toBeVisible();

    // Check bottom navigation is visible on mobile — exact role-based selectors
    await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Shops', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cart', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile', exact: true })).toBeVisible();

    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/mobile-view.png' });
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    // Check for essential meta tags
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);

    // Check if favicon is present
    await expect(page.locator('link[rel="icon"], link[rel="shortcut icon"]')).toHaveCount(1);
  });
});
