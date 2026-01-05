import { expect, test } from '@playwright/test';

test.describe('Dashboard Configuration UI', () => {
  test.beforeEach(async ({ page }) => {
    // Standard setup for all tests
    await page.goto('http://localhost:3000');
  });

  test('should hide API Key management and show npx in Local Mode', async ({ page }) => {
    // Mock API
    await page.route('**/api/settings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          apiKey: 'not-set',
          endpoint: 'http://localhost:8626',
          isManaged: true
        })
      });
    });

    await page.reload();

    // Login logic
    const passwordInput = page.getByPlaceholder('Enter admin password');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill('admin');
    await page.keyboard.press('Enter');

    // Wait for Dashboard
    await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible({ timeout: 15000 });

    // Open Settings first to verify the text there
    await page.getByRole('button').filter({ has: page.locator('svg.lucide-settings') }).first().click();
    await expect(page.getByText('Local Mode Active')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No API key required for connection from your laptop.')).toBeVisible();
    await page.keyboard.press('Escape');

    // Now open MCP Config Modal
    await page.getByRole('button', { name: 'Connect MCP' }).click();

    // Check for Local Mode indicator in MCP Modal
    await expect(page.getByText('Local Mode Active')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No API key required for connection from your laptop.')).toBeVisible();

    // Ensure "Master API Key" label is NOT present
    await expect(page.getByText('Master API Key')).not.toBeVisible();

    // Select Gemini CLI to check for NPX
    await page.getByRole('button', { name: 'Gemini CLI' }).click();

    // Check command
    const codeBlock = page.locator('pre code, pre');
    await expect(codeBlock).toContainText('npx @cybermem-mcp deploy --local');

    // Select Claude Code to check for NPX
    await page.getByRole('button', { name: 'Claude Code' }).click();
    await expect(codeBlock).toContainText('npx @cybermem-mcp deploy --local');

    // Ensure footer warning is HIDDEN in Local Mode
    await expect(page.getByText('Keep it secure and do not share it publicly.')).not.toBeVisible();
  });

  test('should show API Key management and footer warning in Remote Mode', async ({ page }) => {
    // Mock API
    await page.route('**/api/settings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          apiKey: 'sk-remote-key-123',
          endpoint: 'https://remote-rpi.local/mcp',
          isManaged: false
        })
      });
    });

    await page.reload();

    const passwordInput = page.getByPlaceholder('Enter admin password');
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill('admin');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible({ timeout: 15000 });

    // Open MCP Config Modal
    await page.getByRole('button', { name: 'Connect MCP' }).click();

    // Ensure "Master API Key" label IS visible
    await expect(page.getByText('Master API Key')).toBeVisible({ timeout: 5000 });

    // Select Gemini CLI to check for HEADERS (Remote Mode)
    await page.getByRole('button', { name: 'Gemini CLI' }).click();

    // Check command
    const codeBlock = page.locator('pre code, pre');
    await expect(codeBlock).toContainText('gemini mcp add');
    await expect(codeBlock).toContainText('--header "x-api-key:');

    // Ensure footer warning IS visible in Remote Mode
    await expect(page.getByText('Keep it secure and do not share it publicly.')).toBeVisible();
  });
});
