/**
 * Infrastructure Pre-flight Checks
 *
 * Run BEFORE any happy path tests to validate:
 * - Dashboard API responds
 * - db-exporter /api/stats works
 * - Client name normalization works
 *
 * Usage: npm run test:e2e -- infra-check.spec.ts
 */

import { expect, test } from '@playwright/test';

const DASHBOARD_URL = process.env.BASE_URL || 'http://localhost:3000';
const DB_EXPORTER_URL = process.env.DB_EXPORTER_URL || 'http://localhost:8000';
const MCP_URL = process.env.MCP_URL || 'http://localhost:8626';

test.describe('Infrastructure Pre-flight Checks', () => {

    test('1. MCP Health endpoint responds', async ({ request }) => {
        const res = await request.get(`${MCP_URL}/health`);
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(data.ok).toBe(true);
        console.log('✅ MCP Health: OK');
    });

    test('2. db-exporter /api/stats responds', async ({ request }) => {
        const res = await request.get(`${DB_EXPORTER_URL}/api/stats`);
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(typeof data.memoryRecords).toBe('number');
        expect(typeof data.totalClients).toBe('number');
        expect(typeof data.successRate).toBe('number');
        console.log(`✅ db-exporter: ${data.memoryRecords} memories, ${data.totalClients} clients`);
    });

    test('3. db-exporter /api/timeseries responds', async ({ request }) => {
        const res = await request.get(`${DB_EXPORTER_URL}/api/timeseries?period=24h`);
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(Array.isArray(data.creates)).toBeTruthy();
        expect(Array.isArray(data.reads)).toBeTruthy();
        console.log('✅ db-exporter timeseries: OK');
    });

    test('4. Dashboard /api/metrics responds', async ({ request }) => {
        const res = await request.get(`${DASHBOARD_URL}/api/metrics`);
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(data.stats).toBeDefined();
        expect(typeof data.stats.memoryRecords).toBe('number');
        console.log(`✅ Dashboard API: ${data.stats.memoryRecords} memories`);
    });

    test('5. Dashboard /api/audit-logs responds', async ({ request }) => {
        const res = await request.get(`${DASHBOARD_URL}/api/audit-logs`);
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(Array.isArray(data.logs)).toBeTruthy();
        console.log(`✅ Audit Logs API: ${data.logs.length} entries`);
    });

    test('6. Client name normalization works', async ({ request }) => {
        // Check that clients.json is accessible
        const configRes = await request.get(`${DASHBOARD_URL}/clients.json`);
        expect(configRes.ok()).toBeTruthy();
        const config = await configRes.json();

        // Verify Antigravity mapping exists
        const antigravity = config.find((c: any) => c.name === 'Antigravity');
        expect(antigravity).toBeDefined();
        expect(antigravity.match).toContain('antigravity');
        console.log(`✅ Client normalization: Antigravity pattern = "${antigravity.match}"`);
    });

    test('7. Dashboard UI loads', async ({ page }) => {
        await page.goto(DASHBOARD_URL);

        // Handle login if needed
        const passwordInput = page.getByPlaceholder('Enter admin password');
        if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await passwordInput.fill('admin');
            await page.keyboard.press('Enter');
        }

        // Dismiss password warning if present
        const dontShowBtn = page.locator('button:has-text("Don\'t show again")');
        if (await dontShowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await dontShowBtn.click();
        }

        // Verify dashboard loaded
        await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible({ timeout: 15000 });
        console.log('✅ Dashboard UI: Loaded');
    });
});
