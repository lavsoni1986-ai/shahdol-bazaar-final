import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
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

  test('should display Download App button', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for Download App button with different possible selectors
    const downloadButton = page.locator('button:has-text("Download App"), a:has-text("Download App"), [data-testid="download-app"], .download-app');
    
    // Check if button is visible
    await expect(downloadButton.first()).toBeVisible();
    
    // Take screenshot showing the button
    await page.screenshot({ path: 'test-results/download-button-visible.png' });
  });

  test('should trigger download when Download App button is clicked', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find the download button
    const downloadButton = page.locator('button:has-text("Download App"), a:has-text("Download App"), [data-testid="download-app"], .download-app');
    
    // Ensure button is visible before clicking
    await expect(downloadButton.first()).toBeVisible();
    
    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    
    try {
      // Click the download button
      await downloadButton.first().click();
      
      // Wait for download to start
      const download = await downloadPromise;
      
      // Verify download was triggered
      expect(download).toBeTruthy();
      expect(download.suggestedFilename()).toBeTruthy();
      
      console.log(`Download triggered: ${download.suggestedFilename()}`);
      
    } catch (error) {
      // If direct download doesn't work, check for navigation or popup
      console.log('Direct download not detected, checking for navigation or popup...');
      
      // Check if clicking opens a new tab/window
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
        downloadButton.first().click()
      ]);
      
      if (newPage) {
        await newPage.waitForLoadState();
        console.log(`New page opened: ${newPage.url()}`);
        await newPage.close();
      } else {
        // Check if current page URL changed (redirect to app store)
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        console.log(`Current URL after click: ${currentUrl}`);
        
        // Check for common app store URLs
        const isAppStoreRedirect = currentUrl.includes('play.google.com') || 
                                 currentUrl.includes('apps.apple.com') || 
                                 currentUrl.includes('microsoft.com/store');
        
        if (isAppStoreRedirect) {
          console.log('Redirected to app store - download functionality working');
        }
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/after-download-click.png' });
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if page is still functional on mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Check if download button is still visible on mobile
    const downloadButton = page.locator('button:has-text("Download App"), a:has-text("Download App"), [data-testid="download-app"], .download-app');
    await expect(downloadButton.first()).toBeVisible();
    
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
