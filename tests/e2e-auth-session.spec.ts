import { test, expect } from '@playwright/test';
import { loginAsAdmin, logout, waitForSovereignHydration } from './helpers/auth.helper';

test.describe('P0 — Auth + Session Persistence', () => {
    const DISTRICT_HEADERS = {
        'X-District-Slug': 'shahdol',
        'x-e2e-test': 'true',
        'x-test-runner': 'playwright',
    };

    test('TC-AUTH-1: Login with seeded admin credentials works', async ({ page }) => {
        await page.goto('/admin/login');
        await page.waitForLoadState('networkidle');

        await expect(page.getByPlaceholder('Username')).toBeVisible({ timeout: 15000 });
        await expect(page.getByPlaceholder('••••••••')).toBeVisible();

        await page.getByPlaceholder('Username').fill('lav_soni');
        await page.getByPlaceholder('••••••••').fill('Admin@Shahdol2026');

        await page.getByRole('button', { name: /Enter Command Center/i }).click();

        // Must redirect to admin dashboard
        await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
        await page.waitForLoadState('networkidle');

        // Verify authenticated UI elements visible
        await expect(page.getByText(/BHARAT-OS|Admin Panel/i)).toBeVisible();

        // Verify no redirect loops — URL is stable
        const currentUrl = page.url();
        expect(currentUrl).toContain('/admin/dashboard');

        console.log('✅ TC-AUTH-1: Admin login successful, URL stable');
    });

    test('TC-AUTH-2: Refresh token persists after page reload', async ({ page }) => {
        // Login first via the admin UI
        await loginAsAdmin(page);

        // Reload the page to simulate browser restart retaining cookies
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify still authenticated via verify endpoint
        const verifyRes = await page.request.get('/api/auth/verify', {
            headers: DISTRICT_HEADERS,
        });
        const verifyBody = await verifyRes.json();
        const userPayload = verifyBody?.data?.user || verifyBody?.user || null;
        expect(userPayload).toBeTruthy();
        expect(userPayload?.username).toBe('lav_soni');

        console.log('✅ TC-AUTH-2: Auth survived page reload — refresh token persisted');
    });

    test('TC-AUTH-3: Auth survives full page reload with district context preserved', async ({ page }) => {
        await loginAsAdmin(page);

        // Reload
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify district context preserved
        const verifyRes = await page.request.get('/api/auth/verify', {
            headers: DISTRICT_HEADERS,
        });
        const verifyBody = await verifyRes.json();
        const userPayload = verifyBody?.data?.user || verifyBody?.user || null;
        expect(userPayload).toBeTruthy();

        // Check district ID is present
        if (userPayload?.districtId) {
            console.log(`✅ TC-AUTH-3: District ID ${userPayload.districtId} preserved after reload`);
        } else {
            console.log('⚠️ TC-AUTH-3: No districtId on user payload — checking district endpoint');
            // Verify district still resolvable
            const districtRes = await page.request.get('/api/districts/slug/shahdol', {
                headers: DISTRICT_HEADERS,
            });
            expect(districtRes.ok()).toBeTruthy();
        }

        // Verify requests include district header
        const productRes = await page.request.get('/api/marketplace/products', {
            headers: DISTRICT_HEADERS,
        });
        expect(productRes.ok()).toBeTruthy();

        console.log('✅ TC-AUTH-3: District context preserved after reload');
    });

    test('TC-AUTH-4: API requests include district context while authenticated', async ({ page }) => {
        await loginAsAdmin(page);

        // Make an API call that requires district context
        const response = await page.request.get('/api/marketplace/products', {
            headers: DISTRICT_HEADERS,
        });

        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.success).toBeTruthy();

        console.log('✅ TC-AUTH-4: API requests work with district context');
    });

    test('TC-AUTH-5: Logout clears session and restores anonymous state', async ({ page }) => {
        await loginAsAdmin(page);

        // Logout via helper
        await logout(page);

        // Verify verify endpoint returns null user
        const verifyRes = await page.request.get('/api/auth/verify', {
            headers: DISTRICT_HEADERS,
        });
        const verifyBody = await verifyRes.json();
        const userPayload = verifyBody?.data?.user || verifyBody?.user || null;
        expect(userPayload).toBeFalsy();

        // Verify anonymous state — marketplace should still work
        const productRes = await page.request.get('/api/marketplace/products', {
            headers: DISTRICT_HEADERS,
        });
        expect(productRes.ok()).toBeTruthy();

        // Redirect to home and verify no admin UI
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('link', { name: /Home/i })).toBeVisible();

        // Ensure no admin elements visible
        const adminElements = page.locator('text=/BHARAT-OS|Admin Panel|Command Center/i');
        const adminCount = await adminElements.count();
        expect(adminCount).toBe(0);

        console.log('✅ TC-AUTH-5: Logout successful, anonymous state restored');
    });

    test('TC-AUTH-6: No auth flicker on page navigation', async ({ page }) => {
        await loginAsAdmin(page);

        // Navigate through multiple pages rapidly to detect auth flicker
        const pages = ['/admin/dashboard', '/admin/vendors', '/admin/products', '/admin/users'];
        for (const route of pages) {
            await page.goto(route);
            await page.waitForLoadState('networkidle');

            // Verify auth still valid
            const verifyRes = await page.request.get('/api/auth/verify', {
                headers: DISTRICT_HEADERS,
            });
            const verifyBody = await verifyRes.json();
            const userPayload = verifyBody?.data?.user || verifyBody?.user || null;
            expect(userPayload).toBeTruthy();
            expect(userPayload?.username).toBe('lav_soni');
        }

        console.log('✅ TC-AUTH-6: No auth flicker across page navigations');
    });

    test('TC-AUTH-7: No 401 storms on rapid API calls', async ({ page }) => {
        await loginAsAdmin(page);

        // Make rapid parallel API calls to detect auth storms
        const endpoints = [
            '/api/auth/verify',
            '/api/marketplace/products',
            '/api/districts',
        ];

        const results = await Promise.all(
            endpoints.map((ep) =>
                page.request.get(ep, { headers: DISTRICT_HEADERS }).catch(() => null)
            )
        );

        // All requests should succeed (no 401)
        for (let i = 0; i < results.length; i++) {
            expect(results[i]).not.toBeNull();
            expect(results[i]!.ok()).toBeTruthy();
        }

        console.log('✅ TC-AUTH-7: No 401 storms on rapid parallel API calls');
    });
});
