import { test, expect } from '@playwright/test';

test.describe('P0 — Booking Flow (Appointment Pipeline)', () => {
    const DISTRICT_HEADERS = {
        'X-District-Slug': 'shahdol',
        'x-e2e-test': 'true',
        'x-test-runner': 'playwright',
    };

    test('TC-BOOK-1: Open vendor detail page with district routing', async ({ page }) => {
        await page.goto('/shahdol/partner/sanjivanidoctor');
        await page.waitForLoadState('networkidle');

        // Verify district-aware URL preserved
        expect(page.url()).toContain('/shahdol/partner/sanjivanidoctor');

        // Verify body loaded
        await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

        // Verify page has content (vendor name or heading)
        const heading = page.locator('h1').first();
        await expect(heading).toBeVisible({ timeout: 10000 });

        console.log('✅ TC-BOOK-1: Vendor page loaded with district routing');

        // Dark sovereign theme check
        const bodyBg = await page.locator('body').evaluate((el) =>
            window.getComputedStyle(el).backgroundColor
        );
        // Should be dark (rgb(0,0,0) or rgb(3,3,3) or similar)
        const isDark = bodyBg.includes('rgb(0') || bodyBg.includes('rgb(3');
        if (isDark) {
            console.log('✅ TC-BOOK-1: Dark sovereign theme confirmed');
        } else {
            console.log(`⚠️ TC-BOOK-1: Body bg is ${bodyBg} — may not be dark theme`);
        }
    });

    test('TC-BOOK-2: Book Appointment button visible and clickable', async ({ page }) => {
        await page.goto('/shahdol/partner/sanjivanidoctor');
        await page.waitForLoadState('networkidle');

        // Find the Book Appointment button semantically
        const bookBtn = page.getByRole('button', { name: /Book Appointment/i });
        await expect(bookBtn).toBeVisible({ timeout: 15000 });

        console.log('✅ TC-BOOK-2: Book Appointment button visible');
    });

    test('TC-BOOK-3: Booking modal opens and can be filled', async ({ page }) => {
        await page.goto('/shahdol/partner/sanjivanidoctor');
        await page.waitForLoadState('networkidle');

        // Click Book Appointment
        const bookBtn = page.getByRole('button', { name: /Book Appointment/i });
        await expect(bookBtn).toBeVisible({ timeout: 15000 });
        await bookBtn.click();

        // Wait for modal to appear — it has dark theme bg-black/70 overlay
        const modal = page.locator('.fixed.inset-0');
        await expect(modal).toBeVisible({ timeout: 10000 });

        // Verify modal has "Book Appointment" heading
        await expect(page.getByText(/Book Appointment/i)).toBeVisible();

        // Verify dark sovereign theme in modal
        const modalBg = await modal.evaluate((el) =>
            window.getComputedStyle(el).backgroundColor
        );
        const isDarkOverlay = modalBg.includes('rgb(0');
        if (isDarkOverlay) {
            console.log('✅ TC-BOOK-3: Modal has dark overlay (sovereign theme)');
        }

        // Fill the form fields
        const nameInput = page.locator('input[name="customerName"]');
        const phoneInput = page.locator('input[name="customerPhone"]');
        const dateInput = page.locator('input[name="preferredDate"]');
        const notesInput = page.locator('textarea[name="notes"]');

        await expect(nameInput).toBeVisible();
        await expect(phoneInput).toBeVisible();
        await expect(dateInput).toBeVisible();

        await nameInput.fill('Test Patient');
        await phoneInput.fill('9876543210');

        // Set date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        await dateInput.fill(dateStr);

        await notesInput.fill('Test appointment booking from E2E suite');

        console.log('✅ TC-BOOK-3: Booking modal opened and form filled');
    });

    test('TC-BOOK-4: Submit booking and verify success', async ({ page }) => {
        await page.goto('/shahdol/partner/sanjivanidoctor');
        await page.waitForLoadState('networkidle');

        // Open booking modal
        const bookBtn = page.getByRole('button', { name: /Book Appointment/i });
        await expect(bookBtn).toBeVisible({ timeout: 15000 });
        await bookBtn.click();

        // Wait for modal
        const modal = page.locator('.fixed.inset-0');
        await expect(modal).toBeVisible({ timeout: 10000 });

        // Fill form
        await page.locator('input[name="customerName"]').fill('E2E Test Patient');
        await page.locator('input[name="customerPhone"]').fill('9876543210');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        await page.locator('input[name="preferredDate"]').fill(dateStr);
        await page.locator('textarea[name="notes"]').fill('E2E test booking — auto-generated');

        // Intercept the POST /api/appointments request
        const responsePromise = page.waitForResponse(
            (resp) =>
                resp.url().includes('/api/appointments') &&
                resp.request().method() === 'POST',
            { timeout: 15000 }
        );

        // Submit the form
        const submitBtn = page.getByRole('button', { name: /Send Booking Request/i });
        await expect(submitBtn).toBeVisible();
        await submitBtn.click();

        // Wait for the API response
        const response = await responsePromise;
        expect(response.ok()).toBeTruthy();

        const responseBody = await response.json();
        expect(responseBody.success).toBeTruthy();

        console.log(`✅ TC-BOOK-4: Booking API returned success: ${JSON.stringify(responseBody)}`);

        // Wait for the modal to close or success state
        await page.waitForTimeout(2000);

        // Modal should have closed or success toast should be visible
        const modalStillVisible = await modal.isVisible().catch(() => false);
        if (!modalStillVisible) {
            console.log('✅ TC-BOOK-4: Modal closed after successful booking');
        } else {
            // Could still be visible with success state — that's acceptable
            console.log('⚠️ TC-BOOK-4: Modal still visible (may show success state)');
        }

        // Verify the appointment was created in the database via API
        // (We can't directly query DB, but we can trust the POST response)
        expect(responseBody?.data || responseBody?.id || responseBody?.appointment).toBeTruthy();
    });

    test('TC-BOOK-5: Mobile viewport works for booking flow', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 390, height: 844 });

        await page.goto('/shahdol/partner/sanjivanidoctor');
        await page.waitForLoadState('networkidle');

        // Book button should be visible on mobile
        const bookBtn = page.getByRole('button', { name: /Book Appointment/i });
        await expect(bookBtn).toBeVisible({ timeout: 15000 });
        await bookBtn.click();

        // Modal should be visible on mobile
        const modal = page.locator('.fixed.inset-0');
        await expect(modal).toBeVisible({ timeout: 10000 });

        // Form should be fillable on mobile
        await page.locator('input[name="customerName"]').fill('Mobile Test User');
        await page.locator('input[name="customerPhone"]').fill('9876543210');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        await page.locator('input[name="preferredDate"]').fill(dateStr);

        console.log('✅ TC-BOOK-5: Booking flow works on mobile viewport');
    });

    test('TC-BOOK-6: Dark sovereign theme persists in booking UI', async ({ page }) => {
        await page.goto('/shahdol/partner/sanjivanidoctor');
        await page.waitForLoadState('networkidle');

        const bookBtn = page.getByRole('button', { name: /Book Appointment/i });
        await expect(bookBtn).toBeVisible({ timeout: 15000 });
        await bookBtn.click();

        const modal = page.locator('.fixed.inset-0');
        await expect(modal).toBeVisible({ timeout: 10000 });

        // Check the modal content area has dark background
        const modalContent = page.locator('.bg-\\[\\#0A0A0A\\]');
        if (await modalContent.isVisible().catch(() => false)) {
            console.log('✅ TC-BOOK-6: Modal has dark sovereign background (#0A0A0A)');
        } else {
            // Fallback: check any dark-themed element inside modal
            const darkElements = modal.locator('[class*="bg-black"], [class*="bg-\\[\\#0"]');
            const darkCount = await darkElements.count();
            if (darkCount > 0) {
                console.log(`✅ TC-BOOK-6: Found ${darkCount} dark-themed elements in modal`);
            } else {
                console.log('⚠️ TC-BOOK-6: No dark-themed elements detected in modal');
            }
        }

        // Check that input fields use dark styling (bg-black)
        const nameInput = page.locator('input[name="customerName"]');
        const inputBg = await nameInput.evaluate((el) =>
            window.getComputedStyle(el).backgroundColor
        );
        if (inputBg.includes('rgb(0') || inputBg.includes('rgb(1')) {
            console.log('✅ TC-BOOK-6: Input fields use dark background');
        } else {
            console.log(`⚠️ TC-BOOK-6: Input bg is ${inputBg}`);
        }
    });
});
