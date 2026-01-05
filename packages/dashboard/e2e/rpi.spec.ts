import { expect, test } from '@playwright/test';

// Only run this test if RPi target is specified (via URL or env)
// For now we assume we run with BASE_URL=https://***REMOVED*** npm run test:e2e
test.describe('RPi Dashboard Checks', () => {
    // Basic auth if needed? Dashboard has admin login.
    // We reuse the auth logic

    test.beforeEach(async ({ page }) => {
        const password = "admin"; // Default
        await page.goto('/');

        // Handle Login if redirected
        if (await page.getByPlaceholder('Enter admin password').isVisible()) {
             await page.getByPlaceholder('Enter admin password').fill(password);
             await page.getByRole('button', { name: 'Login' }).click();
        }

        await expect(page.getByRole('heading', { name: 'CyberMem' })).toBeVisible({ timeout: 15000 });
    });

    test('should display correct RPi URL in Settings', async ({ page }) => {
        // Open Settings
        await page.locator('header button').filter({ has: page.locator('svg.lucide-settings') }).first().click();
        await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

        // Check Endpoint Input
        const endpointInput = page.locator('#endpoint');
        await expect(endpointInput).toBeVisible();
        await expect(endpointInput).not.toHaveValue('');

        const inputValue = await endpointInput.inputValue();
        console.log('Settings Endpoint:', inputValue);

        // Expected RPi URL part
        // Note: The dashboard might show the internal URL if configured that way,
        // OR the external one if it's aware of the hostname.
        // `settings-modal` logic:
        // if (srvEndpoint.includes('localhost') && !window.location.hostname.includes('localhost')) {
        //    srvEndpoint = `${window.location.protocol}//${window.location.hostname}:8080` (or 8088?)
        // }
        // The user wants to verify it stands correct URL.
        // If accessed via https://***REMOVED***, expected is likely that domain.



        const url = new URL(page.url());
        if (url.hostname.includes('tailscale.ts.net')) {
            // Tailscale Mode (HTTPS)
            expect(inputValue).toContain('https://');
            expect(inputValue).toContain(url.hostname);
            // In Tailscale Funnel mode for RPi, we might map /cybermem/mcp or just expose ports.
            // If the dashboard logic is strictly "protocol//hostname:8080", then we expect strict behavior.
            // But if it's "https://hostname:8080", 8080 might not be open on Funnel.
            // However, the test is to checks what IS displayed matches the logic the user expects.
            // User said: "with access — url from tailscale"
        } else {
            // Local IP/Domain Mode (HTTP)
            expect(inputValue).toContain('http://');
            expect(inputValue).not.toContain('https://');
            // User requested check for raspberrypi.local or local domain
            if (url.hostname.includes('raspberrypi')) {
                 expect(inputValue).toContain('raspberrypi.local');
            } else {
                 expect(inputValue).toContain(url.hostname);
            }
            expect(inputValue).toMatch(/:8080/);
        }
    });

    test('should display correct RPi URL in MCP Config', async ({ page }) => {
        // Open Connect MCP (plug icon or button text)
        await page.getByText('Connect MCP').click();
        await expect(page.getByRole('heading', { name: 'Integrate MCP Client' })).toBeVisible();

        // Check JSON Config
        // The modal displays a code block. We need to extract text.
        const codeBlock = page.locator('pre'); // modal displays a code block. We need to extract text.
        // Logic in mcp-config uses `window.location` if localhost adjustments are needed.

        const url = new URL(page.url());

        if (url.hostname.includes('tailscale.ts.net')) {
             // Tailscale Mode
             await expect(codeBlock).toContainText('https://');
             await expect(codeBlock).toContainText(url.hostname);
             // Should verify it uses the correct path/port
        } else {
             // Local IP Mode
             await expect(codeBlock).toContainText('http://');
             await expect(codeBlock).toContainText(url.hostname);
             await expect(codeBlock).toContainText(':8080/mcp'); // or 8626 depending on config?
             // Actually RPi envs usually map 8626:8080. But config depends on how mcp-config-modal constructs it.
             // Usually it takes base URL + /mcp.
        }
    });
});
