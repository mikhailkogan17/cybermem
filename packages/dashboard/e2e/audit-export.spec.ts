/**
 * E2E Tests for Audit Log Export
 *
 * These tests verify that the audit log export functionality works correctly.
 * Run with: npx playwright test or npm run test:e2e
 */

import { expect, test } from '@playwright/test';

test.describe('Audit Log Export', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3000');

    // Handle login if redirected or modal visible
    const passwordInput = page.getByPlaceholder('Enter admin password');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('admin');
      await page.keyboard.press('Enter');
    }

    // Handle Password Alert Modal (if it appears on default password)
    const dontShowAgainButton = page.locator('button:has-text("Don\'t show again")');
    if (await dontShowAgainButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dontShowAgainButton.click();
    }

    // Wait for dashboard to fully load
    await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible({ timeout: 15000 });

    // Force scroll to bottom or click tab to ensure Audit Log is active
    const auditHeader = page.locator('h3:has-text("Audit Log")');
    await auditHeader.scrollIntoViewIfNeeded();
  });

  test('should display export button in audit log table', async ({ page }) => {
    // Wait for audit log table headers to ensure content failed
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible({ timeout: 10000 });

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
