
import { expect, test } from '@playwright/test';

test.describe('Dashboard Metrics & Viz', () => {

    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/');
        const loginInput = page.getByPlaceholder('Enter admin password');
        if (await loginInput.isVisible()) {
            await loginInput.fill('admin');
            await page.getByRole('button', { name: 'Login' }).click();
            await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible();
        }
    });

    test('should display core metrics', async ({ page }) => {
        await expect(page.getByText('Memory Records')).toBeVisible();
        await expect(page.getByText('Success Rate')).toBeVisible();
    });

    test('should check responsiveness', async ({ page }) => {
        // Test already runs in desktop and mobile projects config
        // Just verify critical components are visible
        const nav = page.locator('header');
        await expect(nav).toBeVisible();
    });
});
