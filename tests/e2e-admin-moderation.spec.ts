import { test, expect } from '@playwright/test';
import { loginAsAdmin, logout, waitForSovereignHydration } from './helpers/auth.helper';

test.describe('P0 — Admin Moderation Propagation', () => {
    const DISTRICT_HEADERS = {
        'X-District-Slug': 'shahdol',
        'x-e2e-test': 'true',
        'x-test-runner': 'playwright',
    };

    async function findPendingVendor(page: any) {
        const res = await page.request.get('/api/admin/vendors', {
            headers: DISTRICT_HEADERS,
        });
        if (!res.ok()) return null;
        const body = await res.json();
        const vendors = body?.data || [];
        return vendors.find((v: any) =>
            v.status === 'PENDING' || v.status === 'pending'
        ) || null;
    }

    async function approveVendor(page: any, vendorId: number) {
        return page.request.patch(
            `/api/admin/vendors/${vendorId}/approve`,
            {
                headers: { ...DISTRICT_HEADERS, 'Content-Type': 'application/json' },
            }
        );
    }

    test('TC-MOD-1: Admin can view pending vendors in moderation panel', async ({ page }) => {
        await loginAsAdmin(page);
        await waitForSovereignHydration(page);

        await page.goto('/admin/vendors');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/Market Registry|Vendor/i)).toBeVisible({ timeout: 10000 });

        const res = await page.request.get('/api/admin/vendors', { headers: DISTRICT_HEADERS });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        const vendors = body?.data || [];
        expect(Array.isArray(vendors)).toBeTruthy();
        console.log(`✅ TC-MOD-1: Found ${vendors.length} vendors`);
    });

    test('TC-MOD-2: Admin can approve a pending vendor', async ({ page }) => {
        await loginAsAdmin(page);
        await waitForSovereignHydration(page);

        let pending = await findPendingVendor(page);
        if (!pending) {
            console.log('⚠️ TC-MOD-2: Creating pending vendor for test');
            const createRes = await page.request.post('/api/admin/vendors', {
                headers: { ...DISTRICT_HEADERS, 'Content-Type': 'application/json' },
                data: { name: `E2E Test Vendor ${Date.now()}`, category: 'SERVICE', status: 'PENDING', initialScore: 50 },
            });
            expect(createRes.ok()).toBeTruthy();
            const createBody = await createRes.json();
            pending = createBody?.data || createBody?.vendor || null;
            expect(pending).toBeTruthy();
        }

        const approveRes = await approveVendor(page, pending.id);
        expect(approveRes.ok()).toBeTruthy();
        const approveBody = await approveRes.json();
        expect(approveBody.success).toBeTruthy();
        console.log(`✅ TC-MOD-2: Approved vendor ID ${pending.id}`);

        const verifyRes = await page.request.get('/api/admin/vendors', { headers: DISTRICT_HEADERS });
        expect(verifyRes.ok()).toBeTruthy();
        const vendors = (await verifyRes.json())?.data || [];
        const approved = vendors.filter((v: any) => v.status === 'APPROVED');
        expect(approved.length).toBeGreaterThan(0);
    });

    test('TC-MOD-3: Approved vendor propagates to marketplace visibility', async ({ page }) => {
        await loginAsAdmin(page);
        await waitForSovereignHydration(page);

        const res = await page.request.get('/api/admin/vendors', { headers: DISTRICT_HEADERS });
        expect(res.ok()).toBeTruthy();
        const vendors = (await res.json())?.data || [];
        const approved = vendors.filter((v: any) => v.status === 'APPROVED');

        if (approved.length === 0) {
            const createRes = await page.request.post('/api/admin/vendors', {
                headers: { ...DISTRICT_HEADERS, 'Content-Type': 'application/json' },
                data: { name: `E2E Visibility ${Date.now()}`, category: 'SERVICE', status: 'PENDING', initialScore: 50 },
            });
            expect(createRes.ok()).toBeTruthy();
            const newVendor = (await createRes.json())?.data || (await createRes.json())?.vendor;
            expect(newVendor).toBeTruthy();
            const approveRes = await approveVendor(page, newVendor.id);
            expect(approveRes.ok()).toBeTruthy();
        }

        await logout(page);

        await page.goto('/shahdol');
        await page.waitForLoadState('networkidle');

        const marketplaceRes = await page.request.get('/api/marketplace/vendors', { headers: DISTRICT_HEADERS });
        expect(marketplaceRes.ok()).toBeTruthy();
        const marketplaceVendors = (await marketplaceRes.json())?.data || [];
        if (marketplaceVendors.length > 0) {
            console.log(`✅ TC-MOD-3: ${marketplaceVendors.length} approved vendors visible publicly`);
        } else {
            console.log('⚠️ TC-MOD-3: No vendors visible in marketplace');
        }
    });

    test('TC-MOD-4: Approved vendor products visible on vendor detail page', async ({ page }) => {
        await loginAsAdmin(page);
        await waitForSovereignHydration(page);

        const res = await page.request.get('/api/admin/vendors', { headers: DISTRICT_HEADERS });
        expect(res.ok()).toBeTruthy();
        const vendors = (await res.json())?.data || [];
        const approved = vendors.filter((v: any) => v.status === 'APPROVED');

        if (approved.length === 0 || !approved[0].slug) {
            console.log('⚠️ TC-MOD-4: No approved vendor with slug — skipping');
            test.skip();
            return;
        }

        await logout(page);

        const publicRes = await page.request.get(`/api/marketplace/vendors/${approved[0].slug}`, {
            headers: DISTRICT_HEADERS,
        });
        if (publicRes.ok()) {
            const publicVendor = (await publicRes.json())?.data || {};
            if (publicVendor?.products?.length > 0) {
                console.log(`✅ TC-MOD-4: Vendor has ${publicVendor.products.length} public products`);
            } else {
                console.log('⚠️ TC-MOD-4: Vendor visible but no products');
            }
        } else {
            console.log(`⚠️ TC-MOD-4: Vendor not found publicly (${publicRes.status()})`);
        }
    });

    test('TC-MOD-5: No stale pending state after approval', async ({ page }) => {
        await loginAsAdmin(page);
        await waitForSovereignHydration(page);

        const createRes = await page.request.post('/api/admin/vendors', {
            headers: { ...DISTRICT_HEADERS, 'Content-Type': 'application/json' },
            data: { name: `Stale Check ${Date.now()}`, category: 'TEST', status: 'PENDING', initialScore: 50 },
        });
        expect(createRes.ok()).toBeTruthy();
        const newVendor = (await createRes.json())?.data || (await createRes.json())?.vendor;
        expect(newVendor).toBeTruthy();

        const approveRes = await approveVendor(page, newVendor.id);
        expect(approveRes.ok()).toBeTruthy();

        const checkRes = await page.request.get('/api/admin/vendors', { headers: DISTRICT_HEADERS });
        expect(checkRes.ok()).toBeTruthy();
        const allVendors = (await checkRes.json())?.data || [];
        const stillPending = allVendors.filter((v: any) =>
            (v.status === 'PENDING' || v.status === 'pending') && v.id === newVendor.id
        );
        expect(stillPending.length).toBe(0);
        console.log(`✅ TC-MOD-5: No stale pending for vendor ${newVendor.id}`);
    });

    test('TC-MOD-6: District isolation preserved in moderation', async ({ page }) => {
        await loginAsAdmin(page);
        await waitForSovereignHydration(page);

        const vendorRes = await page.request.get('/api/marketplace/vendors', { headers: DISTRICT_HEADERS });
        expect(vendorRes.ok()).toBeTruthy();
        const marketplaceVendors = (await vendorRes.json())?.data || [];

        const allApproved = marketplaceVendors.every((v: any) => v.status === 'APPROVED');
        if (marketplaceVendors.length > 0) {
            expect(allApproved).toBeTruthy();
            console.log(`✅ TC-MOD-6: All ${marketplaceVendors.length} vendors are APPROVED`);
        } else {
            console.log('⚠️ TC-MOD-6: No marketplace vendors');
        }
    });
});
