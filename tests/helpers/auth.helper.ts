import { expect, type Page } from '@playwright/test';

/**
 * SOVEREIGN AUTH HELPER
 * Reusable auth flows for E2E test suites.
 * Uses REAL UI login flow — not API shortcuts.
 * httpOnly cookie-based auth (no localStorage token tampering).
 */

const DISTRICT_HEADERS = {
    'X-District-Slug': 'shahdol',
    'x-e2e-test': 'true',
    'x-test-runner': 'playwright',
};

/**
 * Login as admin using the REAL UI flow at /admin/login.
 * Credentials match seeded super admin from create-user.ts:
 *   username: lav_soni
 *   password: Admin@Shahdol2026
 */
export async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByPlaceholder('Username')).toBeVisible({ timeout: 20000 });
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();

    await page.getByPlaceholder('Username').fill('lav_soni');
    await page.getByPlaceholder('••••••••').fill('Admin@Shahdol2026');

    await page.getByRole('button', { name: /Enter Command Center/i }).click();

    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify authenticated state via API
    const verifyRes = await page.request.get('/api/auth/verify', {
        headers: DISTRICT_HEADERS,
    });
    const verifyBody = await verifyRes.json();
    const userPayload = verifyBody?.data?.user || verifyBody?.user || null;
    expect(userPayload).toBeTruthy();
    expect(userPayload?.role?.toUpperCase()).toBe('SUPER_ADMIN');

    console.log('✅ [AUTH] Admin logged in successfully as lav_soni');
}

/**
 * Login as a regular user by hitting the REAL API endpoint.
 * Uses the httpOnly cookie flow - browser stores cookies automatically.
 */
export async function loginAsUser(
    page: Page,
    username: string,
    password: string
): Promise<void> {
    const response = await page.request.post('/api/auth/login', {
        headers: {
            'X-District-Slug': 'shahdol',
            'x-e2e-test': 'true',
            'x-test-runner': 'playwright',
        },
        data: { username, password },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body?.data?.user?.username).toBe(username);

    // Store user data in localStorage so client-side code can access it
    await page.evaluate(
        (userData) => {
            localStorage.setItem('user', JSON.stringify(userData));
        },
        body?.data?.user
    );

    console.log(`✅ [AUTH] User logged in as ${username}`);
}

/**
 * Logout using the REAL logout API.
 */
export async function logout(page: Page): Promise<void> {
    // Try UI logout first
    const logoutBtn = page.getByRole('button', { name: /Log ?[Oo]ut/i });
    if (await logoutBtn.isVisible().catch(() => false)) {
        await logoutBtn.click();
        await page.waitForLoadState('networkidle');
    } else {
        // Fallback: API logout
        await page.request.post('/api/auth/logout', {
            headers: DISTRICT_HEADERS,
        });
    }

    // Clear client-side auth state
    await page.evaluate(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
    });

    // Verify guest state via API
    const verifyRes = await page.request.get('/api/auth/verify', {
        headers: DISTRICT_HEADERS,
    });
    const verifyBody = await verifyRes.json();
    const userPayload = verifyBody?.data?.user || verifyBody?.user || null;
    expect(userPayload).toBeFalsy();

    console.log('✅ [AUTH] Logged out — session cleared');
}

/**
 * Wait for sovereign hydration to complete.
 * Verifies page has fully hydrated with district context.
 */
export async function waitForSovereignHydration(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    // Wait for loading states to resolve (non-blocking, best-effort)
    await page
        .waitForFunction(() => {
            const text = document.body.innerText;
            return !text.includes('Loading...');
        }, { timeout: 10000 })
        .catch(() => {
            console.log('⚠️ [HYDRATION] Loading state check timed out — continuing');
        });

    // Verify district is available
    const districtRes = await page.request.get('/api/districts/slug/shahdol', {
        headers: DISTRICT_HEADERS,
    });
    expect(districtRes.ok()).toBeTruthy();

    console.log('✅ [HYDRATION] Sovereign hydration verified');
}
