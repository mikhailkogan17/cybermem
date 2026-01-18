import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

// Load clients to pick a random one for realistic testing
// This ensures E2E tests generate traffic that looks like real clients (Claude, VS Code, etc.)
const clientsPath = path.join(__dirname, "public", "clients.json");
let randomClient = { name: "Playwright Desktop", match: "playwright" };

try {
  if (fs.existsSync(clientsPath)) {
    const clients = JSON.parse(fs.readFileSync(clientsPath, "utf-8"));
    const validClients = clients.filter(
      (c: any) => c.match && c.match !== "other",
    );
    if (validClients.length > 0) {
      randomClient =
        validClients[Math.floor(Math.random() * validClients.length)];
      // Handle regex matchers (take first option)
      if (randomClient.match.includes("|")) {
        randomClient.match = randomClient.match.split("|")[0];
      }
    }
  }
} catch (e) {
  console.warn("Failed to load clients.json, using default.");
}

console.log(
  `🤖 E2E Test Identity: ${randomClient.name} (UA: ${randomClient.match})`,
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 3,
  timeout: 10000, // 10s max per test
  expect: {
    timeout: 5000, // 5s for assertions
  },
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
    userAgent: `${randomClient.match}/1.0 (E2E Test)`,
    extraHTTPHeaders: {
      "X-Client-Name": randomClient.name,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Kill any existing process on 3000 before starting dev server
    command:
      "lsof -ti:3000 | xargs kill -9 2>/dev/null || true; npm run dev -- -p 3000 -H 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 60000,
  },
});
