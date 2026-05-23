import { test, expect } from '@playwright/test';

test('Shahdol homepage loads', async ({ page }) => {
    await page.goto('/shahdol');

    await expect(
        page.getByText('Bus Timetable')
    ).toBeVisible();

    await expect(
        page.locator('body')
    ).toContainText('Shahdol');
});
