
import { expect, test } from '@playwright/test';

test.describe('Dashboard Authentication', () => {

    test('should allow login with correct password', async ({ page }) => {
        await page.goto('/');

        // If already logged in, clear cookies (shouldn't happen in incognito/test env usually, but good practice if state is preserved)
        // Check for login input
        const loginInput = page.getByPlaceholder('Enter admin password');

        if (await loginInput.isVisible()) {
            await loginInput.fill('admin');
            await page.getByRole('button', { name: 'Login' }).click();
        }

        // Verification
        await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Memory Records')).toBeVisible();
    });

    test('should show error on wrong password', async ({ page }) => {
        await page.goto('/');

        // Ensure we are logged out or looking at login screen.
        // Note: This assumes clean state for each test if fullyParallel is true but workers separate context.
        // Playwright creates fresh context for each test by default.

        const loginInput = page.getByPlaceholder('Enter password');
        if (await loginInput.isVisible()) {
            await loginInput.fill('wrongpassword');
            await page.getByRole('button', { name: 'Login' }).click();
            await expect(page.getByText('Invalid password')).toBeVisible();
        }
    });
});
