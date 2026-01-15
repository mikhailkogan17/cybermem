import { expect, test } from '@playwright/test';

// Shared mock setup - mocks BEFORE page load
async function setupMocksForLocalMode(page: any) {
  await page.route('**/api/settings', async (route: any) => {
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
  await page.route('**/api/metrics*', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
  await page.route('**/api/audit-logs*', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ logs: [] }) });
  });
}

async function setupMocksForRemoteMode(page: any) {
  await page.route('**/api/settings', async (route: any) => {
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
  await page.route('**/api/metrics*', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
  await page.route('**/api/audit-logs*', async (route: any) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ logs: [] }) });
  });
}

async function login(page: any) {
  const passwordInput = page.getByPlaceholder('Enter admin password');
  await expect(passwordInput).toBeVisible();
  await passwordInput.fill('admin');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible();

  // Dismiss password warning modal if it appears
  const dontShowAgainButton = page.getByRole('button', { name: "Don't show again" });
  if (await dontShowAgainButton.isVisible({ timeout: 1500 }).catch(() => false)) {
    await dontShowAgainButton.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Dashboard Configuration UI', () => {

  test('Local Mode: shows Local Mode Active and hides API Key', async ({ page }) => {
    await setupMocksForLocalMode(page);
    await page.goto('http://localhost:3000');
    await login(page);

    // Open MCP Config Modal
    await page.getByRole('button', { name: 'Connect MCP' }).click();

    // Check for Local Mode indicator
    await expect(page.getByText('Local Mode Active')).toBeVisible();

    // Master API Key should NOT be visible in local mode
    await expect(page.getByText('Master API Key')).not.toBeVisible();

    // Code block should show stdio command with npx @cybermem/mcp
    await page.getByRole('button', { name: 'Gemini CLI' }).click();
    const codeBlock = page.locator('pre');
    await expect(codeBlock).toContainText('gemini mcp add cybermem npx @cybermem/mcp');
  });

  test('Remote Mode: shows API Key management', async ({ page }) => {
    await setupMocksForRemoteMode(page);
    await page.goto('http://localhost:3000');
    await login(page);

    // Open MCP Config Modal
    await page.getByRole('button', { name: 'Connect MCP' }).click();

    // Master API Key should be visible
    await expect(page.getByText('Master API Key')).toBeVisible();

    // Gemini CLI should have --url and --api-key args (universal stdio transport)
    await page.getByRole('button', { name: 'Gemini CLI' }).click();
    const codeBlock = page.locator('pre');
    await expect(codeBlock).toContainText('--url');
    await expect(codeBlock).toContainText('--api-key');
  });
});
