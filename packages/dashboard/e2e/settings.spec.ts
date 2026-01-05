
import { expect, test } from '@playwright/test';

test.describe('Dashboard Settings', () => {

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

    test('should regenerate API key', async ({ page }) => {
        // Open Settings
        // Use a more robust selector for the settings button (looking for the button containing the settings icon)
        // Lucide icons usually have a class like 'lucide-settings' on the SVG
        await page.locator('header button').filter({ has: page.locator('svg.lucide-settings') }).first().click();

        // Wait for modal (Title is "Settings")
        await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

        // Get initial key value
        const apiKeyInput = page.locator('#api-key');
        await expect(apiKeyInput).toBeVisible();
        const initialKey = await apiKeyInput.inputValue();

        // Click Regenerate Key (initial button)
        await page.getByRole('button', { name: 'Regenerate Key' }).click();

        // Handle Confirmation Flow
        // 1. Check for warning text
        await expect(page.getByText('Warning: This will disconnect')).toBeVisible();

        // 2. Type 'agree' in the confirmation input
        const confirmInput = page.getByPlaceholder("Type 'agree'");
        await confirmInput.fill('agree');

        // 3. Click Confirm
        await page.getByRole('button', { name: 'Confirm' }).click();

        // Check if value changed
        await expect(async () => {
            const newKey = await apiKeyInput.inputValue();
            expect(newKey).not.toBe(initialKey);
            expect(newKey.length).toBeGreaterThan(10);
            expect(newKey).toContain('sk-');
        }).toPass({ timeout: 10000 });
    });
});

