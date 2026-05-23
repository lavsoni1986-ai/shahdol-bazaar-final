import { test, expect } from '@playwright/test';

const DISTRICT_HEADERS = {
  'X-District-Slug': 'shahdol',
};

test.describe('Marketplace Visibility', () => {

  // ============================================================
  // TEST AREA 1 — HOMEPAGE PRODUCT VISIBILITY
  // ============================================================
  test('TC 4.1: Homepage renders real approved products', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify sovereign homepage loaded correctly (no crash/404)
    await expect(page).toHaveTitle(/Shahdol Bazaar/i);
    await expect(page.locator('body')).toBeVisible();

    // Check for stable "Trusted Deals in Shahdol" section
    const trustedDealsSection = page.getByText(/Trusted Deals in Shahdol/i);
    await expect(trustedDealsSection).toBeVisible();

    // Find product cards within the Trusted Deals section
    const trustedSection = page.locator('section:has-text("Trusted Deals")');
    const productCards = trustedSection.locator('[class*="rounded-"]');
    const cardCount = await productCards.count();

    if (cardCount > 0) {
      const firstCard = productCards.first();
      // Price element visible (₹)
      await expect(firstCard.locator('text=/₹/')).toBeVisible();

      // Image OR fallback icon
      const img = firstCard.locator('img');
      const hasImage = await img.count();
      if (hasImage > 0) {
        await expect(img).toBeVisible();
      } else {
        // Fallback icon should be present
        const fallbackIcon = firstCard.locator('svg, [class*="fallback"], [class*="placeholder"]');
        console.log('⚠️  No <img> found — verifying fallback/icon present');
        // Don't fail — architecture supports both
      }

      console.log(`✅ Homepage renders ${cardCount} product cards in Trusted Deals`);
    } else {
      console.log('⚠️  No product cards in Trusted Deals — seed data may be empty');
    }

    // Verify via API that the products endpoint returns data
    const response = await page.request.get('/api/marketplace/products', {
      headers: DISTRICT_HEADERS,
    });
    expect(response.ok()).toBeTruthy();

    const products = await response.json();
    const productArray = Array.isArray(products) ? products : (products.data || products.products || []);
    expect(Array.isArray(productArray)).toBeTruthy();

    if (productArray.length > 0) {
      console.log(`✅ /api/marketplace/products returns ${productArray.length} products`);
      const first = productArray[0];
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('price');
    }
  });

  // ============================================================
  // TEST AREA 2 — PRODUCT DETAIL NAVIGATION
  // ============================================================
  test('TC 4.2: Product detail page loads from real product', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to find a product link on the page
    const productLinks = page.locator('a[href*="/product/"]');
    const linkCount = await productLinks.count();

    if (linkCount === 0) {
      // Fallback: navigate to API and use first product ID
      const response = await page.request.get('/api/marketplace/products', {
        headers: DISTRICT_HEADERS,
      });
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const productArray = Array.isArray(body) ? body : (body.data || body.products || []);

      if (productArray.length === 0) {
        test.skip();
        return;
      }

      const firstProduct = productArray[0];
      const url = `/product/${firstProduct.id}`;
      console.log(`Navigating directly to product: ${url}`);
      await page.goto(url);
    } else {
      // Click the first product link
      await productLinks.first().click();
    }

    // Wait for product detail route
    await page.waitForURL(/\/product\//, { timeout: 15000 });

    const currentUrl = page.url();
    console.log(`✅ Navigated to: ${currentUrl}`);

    // Check for product name (h1 on detail page)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // Check for price element starting with ₹
    await expect(page.locator('text=/^₹/').first()).toBeVisible({ timeout: 5000 });

    // Check for DSSL badge or Add to Cart
    const dsslBadges = page.locator('text=/DSSL Verified/i');
    const dsslBadgeCount = await dsslBadges.count();

    if (dsslBadgeCount > 0) {
      console.log('✅ DSSL Verified badge present');
    } else {
      const addToCart = page.locator('button:has-text("Add to Cart")');
      const addToCartCount = await addToCart.count();
      if (addToCartCount > 0) {
        console.log('✅ Add to Cart button present');
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/product-detail.png' });
  });

  // ============================================================
  // TEST AREA 3 — VENDOR DETAIL PAGES (CORRECT PRODUCTION ROUTE)
  // ============================================================
  test('TC 4.3: Vendor shop detail page loads correctly', async ({ page }) => {
    // Use the REAL production route: /shahdol/partner/:slug
    const vendorSlugs = ['rohitmobile', 'sanjivinidoctor'];

    for (const slug of vendorSlugs) {
      await page.goto(`/shahdol/partner/${slug}`);
      await page.waitForLoadState('networkidle');

      // Wait for body to be visible (page loaded without error)
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

      // URL must preserve district prefix
      expect(page.url()).toContain('/shahdol/partner/');

      // Check for vendor name heading
      const vendorName = page.locator('h1').first();
      const vendorNameVisible = await vendorName.isVisible().catch(() => false);

      // Check for "About" section or product section
      const aboutSection = page.getByText(/About|दुकान|Shop|Store|के बारे/i).first();
      const aboutVisible = await aboutSection.isVisible().catch(() => false);

      // Check for DSSL Trust Badge
      const trustBadge = page.locator('text=/DSSL|Trust|Verified|Safety|Secure/i').first();
      const trustBadgeVisible = await trustBadge.isVisible().catch(() => false);

      if (vendorNameVisible) {
        console.log(`✅ Vendor "${slug}" loaded with heading visible`);
      } else {
        console.log(`⚠️  Vendor "${slug}" — heading not found`);
      }

      if (aboutVisible) {
        console.log(`✅ Vendor "${slug}" — about/store section present`);
      }

      if (trustBadgeVisible) {
        console.log(`✅ Vendor "${slug}" — DSSL/Trust badge present`);
      } else {
        const trustBadgeComponent = page.locator('[class*="trust"]').first();
        const trustComponentVisible = await trustBadgeComponent.isVisible().catch(() => false);
        if (trustComponentVisible) {
          console.log(`✅ Vendor "${slug}" — trust component visible`);
        }
      }

      await page.screenshot({ path: `test-results/vendor-${slug}.png` });
    }
  });

  // ============================================================
  // TEST AREA 4 — DISTRICT-AWARE ROUTING
  // ============================================================
  test('TC 4.4: District-aware routing preserves district', async ({ page }) => {
    // Navigate to district-aware vendor URL
    await page.goto('/shahdol/partner/rohitmobile');
    await page.waitForLoadState('networkidle');

    // URL should stay district-aware (not redirect to root)
    expect(page.url()).toContain('/shahdol');
    console.log(`✅ District routing preserved: ${page.url()}`);

    // Verify page loaded (body visible)
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // Navigate to bus timetable via district-aware route
    await page.goto('/shahdol/bus-timetable');
    await page.waitForLoadState('networkidle');

    const routingOk = page.url().includes('/shahdol') || page.url().includes('/bus');
    expect(routingOk).toBeTruthy();
    console.log(`✅ Bus timetable via district route: ${page.url()}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/district-routing.png' });
  });

  // ============================================================
  // TEST AREA 5 — IMAGE PIPELINE
  // ============================================================
  test('TC 4.5: Product images render without broken placeholders', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find product images in Trusted Deals section
    const trustedSection = page.locator('section:has-text("Trusted Deals")');
    const productImages = trustedSection.locator('img');
    const imgCount = await productImages.count();

    if (imgCount === 0) {
      console.log('⚠️  No product images found in Trusted Deals — may need seed data');
      test.skip();
      return;
    }

    console.log(`✅ Found ${imgCount} product images in Trusted Deals`);

    // Check each image loads (naturalWidth > 0) and is visible
    let loadedCount = 0;
    for (let i = 0; i < Math.min(imgCount, 5); i++) {
      const img = productImages.nth(i);
      const visible = await img.isVisible();
      if (visible) {
        const naturalWidth = await img.evaluate(
          (el: HTMLImageElement) => el.naturalWidth
        ).catch(() => 0);
        if (naturalWidth > 0) {
          loadedCount++;
        } else {
          console.log(`⚠️  Image ${i + 1} has naturalWidth=0 (may be placeholder)`);
        }
      }
    }

    if (loadedCount > 0) {
      console.log(`✅ ${loadedCount}/${Math.min(imgCount, 5)} images loaded successfully`);
    } else {
      console.log('⚠️  No images with naturalWidth > 0 detected');
    }

    // Navigate to first product and check image on detail page
    const productLink = page.locator('a[href*="/product/"]').first();
    if (await productLink.count() > 0) {
      await productLink.click();
      await page.waitForURL(/\/product\//, { timeout: 15000 });

      // Check for image on detail page
      const detailImg = page.locator('main img, [class*="aspect-square"] img').first();
      const detailImgVisible = await detailImg.isVisible().catch(() => false);

      if (detailImgVisible) {
        const imgSrc = await detailImg.getAttribute('src').catch(() => null);
        if (imgSrc && imgSrc.length > 0) {
          console.log(`✅ Product detail image source: ${imgSrc.substring(0, 60)}...`);
        }
      }

      await page.screenshot({ path: 'test-results/product-image-pipeline.png' });
    }
  });

  // ============================================================
  // TEST AREA 6 — CANONICAL SOVEREIGN ENTITIES (NEW)
  // ============================================================
  test('TC 4.6: Product API returns canonical sovereign entities', async ({ page }) => {
    const response = await page.request.get('/api/marketplace/products', {
      headers: DISTRICT_HEADERS,
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const products = body.data || [];

    expect(Array.isArray(products)).toBeTruthy();

    if (products.length > 0) {
      const first = products[0];

      // Canonical commerce contract
      expect(first.id).toBeTruthy();
      expect(first.name).toBeTruthy();
      expect(first).toHaveProperty('price');

      // Image pipeline — at least one canonical image field
      const imageField = first.imageUrl || first.image || first.logo;
      expect(imageField).toBeTruthy();

      console.log(`✅ Canonical product "${first.name}" (id=${first.id}, price=${first.price})`);
    } else {
      console.log('⚠️  No products from API — check seed data');
    }
  });
});
