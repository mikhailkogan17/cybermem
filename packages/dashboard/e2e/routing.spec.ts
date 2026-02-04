import { expect, test } from "@playwright/test";

// This test is ONLY for localhost environments where dashboard serves at root.
// Tailscale environments use subpaths (/cybermem-staging, /cybermem) by design.
const dashboardUrl = process.env.DASHBOARD_URL || "";
const isLocalhost =
  dashboardUrl.includes("localhost") || dashboardUrl.includes("127.0.0.1");

test.describe("Routing & URL Canonicalization", () => {
  test.skip(!isLocalhost, "Skipped on Tailscale - uses subpath by design");

  test("Root Check: Should stay at / and NOT redirect to legacy subpaths", async ({
    request,
    baseURL,
  }) => {
    // We expect the DASHBOARD_URL (baseURL) to be the root or specific entry point.
    // This test ensures that requesting the root does NOT redirect to /cybermem or /cybermem-staging
    // which was a legacy behavior we removed in v0.13.0.

    // Note: baseURL provided by Playwright config or env var
    console.log(`Checking routing for: ${baseURL}`);

    const response = await request.get("/");

    // 1. Should be 200 OK
    expect(response.status()).toBe(200);

    // 2. Should match the expected URL (no redirects)
    // response.url() returns the final URL after redirects.
    // We check that it doesn't contain legacy subpaths if we started at root
    const finalUrl = response.url();
    expect(finalUrl).not.toContain("/cybermem-staging");
    expect(finalUrl).not.toContain("/cybermem/"); // Trailing slash check

    // 3. Content Check to ensure it's not a generic 404/nginx page
    const body = await response.text();
    expect(body).toContain("<!DOCTYPE html>"); // Expecting Next.js app
  });
});
