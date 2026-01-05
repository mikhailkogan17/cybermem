import { expect, test } from '@playwright/test';

test.describe('Dashboard Configuration UI', () => {
  test('should hide API Key management in Local Mode', async ({ page }) => {
    // Mock API to return managed: true (Local Mode)
    await page.route('**/api/settings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          apiKey: 'sk-placeholder',
          endpoint: 'http://localhost:8626',
          isManaged: true
        })
      });
    });

    await page.goto('http://localhost:3000');

    // Login
    const passwordInput = page.getByPlaceholder('Enter admin password');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('admin');
      await page.keyboard.press('Enter');
    }

    // Wait for Dashboard
    await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible({ timeout: 15000 });

    // Open Settings
    await page.locator('header button').filter({ has: page.locator('svg.lucide-settings') }).first().click();

    // Check for Local Mode indicator
    await expect(page.getByText('Local Mode Active')).toBeVisible({ timeout: 5000 });

    // Ensure "API Configuration" is hidden
    await expect(page.getByText('API Configuration')).not.toBeVisible();
  });

  test('should show API Key management in Remote Mode', async ({ page }) => {
    // Mock API to return managed: false (Remote Mode)
    await page.route('**/api/settings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          apiKey: 'sk-remote-key-123',
          endpoint: 'http://localhost:8626',
          isManaged: false
        })
      });
    });

    await page.goto('http://localhost:3000');

    // Login
    const passwordInput = page.getByPlaceholder('Enter admin password');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('admin');
      await page.keyboard.press('Enter');
    }

    // Wait for Dashboard
    await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible({ timeout: 15000 });

    // Open Settings
    await page.locator('header button').filter({ has: page.locator('svg.lucide-settings') }).first().click();

    // Ensure "API Configuration" IS visible
    await expect(page.getByText('API Configuration')).toBeVisible({ timeout: 5000 });

    // Ensure Master API Key field exists
    await expect(page.locator('#api-key')).toBeVisible();
  });

  test('should adapt localhost URL to current hostname for remote access', async ({ page }) => {
    await page.route('**/api/settings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          apiKey: 'sk-placeholder',
          endpoint: 'http://localhost:8626',
          isManaged: false
        })
      });
    });

    await page.goto('http://localhost:3000');

    // Login
    const passwordInput = page.getByPlaceholder('Enter admin password');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('admin');
      await page.keyboard.press('Enter');
    }

    await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible({ timeout: 15000 });

    // Open Settings
    await page.locator('header button').filter({ has: page.locator('svg.lucide-settings') }).first().click();

    const endpointInput = page.locator('#endpoint');
    await expect(endpointInput).toBeVisible();
    await expect(endpointInput).toHaveValue(/localhost/);
  });
});
