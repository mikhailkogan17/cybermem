/**
 * E2E Tests for Audit Log Export
 *
 * These tests verify that the audit log export functionality works correctly.
 * Run with: npx playwright test or npm run test:e2e
 */

import { expect, test } from '@playwright/test';

test.describe('Audit Log Export', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and login
    await page.goto('http://localhost:3000');

    // Handle login if needed (default password: admin)
    const loginModal = page.locator('[data-testid="login-modal"]');
    if (await loginModal.isVisible()) {
      await page.fill('input[type="password"]', 'admin');
      await page.click('button:has-text("Login")');
    }
  });

  test('should display export button in audit log table', async ({ page }) => {
    // Wait for audit log table to load
    const auditTable = page.locator('text=Audit Log');
    await expect(auditTable).toBeVisible();

    // Check export button exists
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();
  });

  test('should show export dropdown with CSV and JSON options', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('text=Audit Log');

    // Click export button
    const exportButton = page.locator('button:has-text("Export")');
    await exportButton.click();

    // Verify dropdown options
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("Export JSON")')).toBeVisible();
  });

  test('should download CSV file when clicking Export CSV', async ({ page }) => {
    await page.waitForSelector('text=Audit Log');

    // Click export button
    await page.click('button:has-text("Export")');

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export CSV")'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/cybermem-audit-.*\.csv/);
  });

  test('should download JSON file when clicking Export JSON', async ({ page }) => {
    await page.waitForSelector('text=Audit Log');

    // Click export button
    await page.click('button:has-text("Export")');

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export JSON")'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/cybermem-audit-.*\.json/);
  });

  test('CSV export should contain correct headers', async ({ page }) => {
    await page.waitForSelector('text=Audit Log');
    await page.click('button:has-text("Export")');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export CSV")'),
    ]);

    // Read file content
    const content = await download.path();
    const fs = await import('fs');
    const csvContent = fs.readFileSync(content!, 'utf-8');

    // Verify headers
    expect(csvContent).toContain('Timestamp');
    expect(csvContent).toContain('Client');
    expect(csvContent).toContain('Operation');
    expect(csvContent).toContain('Status');
    expect(csvContent).toContain('Description');
  });
});

test.describe('System Health Indicator', () => {
  test('should display system health badge in header', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Handle login
    const loginModal = page.locator('[data-testid="login-modal"]');
    if (await loginModal.isVisible()) {
      await page.fill('input[type="password"]', 'admin');
      await page.click('button:has-text("Login")');
    }

    // Check for health badge (one of the possible states)
    const healthBadge = page.locator('text=All Systems OK, text=Degraded, text=System Error, text=Checking...').first();
    await expect(healthBadge).toBeVisible({ timeout: 10000 });
  });

  test('should show popup on hover with service details', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Handle login
    const loginModal = page.locator('[data-testid="login-modal"]');
    if (await loginModal.isVisible()) {
      await page.fill('input[type="password"]', 'admin');
      await page.click('button:has-text("Login")');
    }

    // Hover over health badge
    const healthBadge = page.locator('.rounded-full:has-text("Systems"), .rounded-full:has-text("Degraded"), .rounded-full:has-text("Error"), .rounded-full:has-text("Checking")').first();
    await healthBadge.hover();

    // Check popup appears with system health details
    await expect(page.locator('text=System Health')).toBeVisible({ timeout: 5000 });
  });
});
