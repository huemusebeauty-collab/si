import { defineConfig, devices } from "@playwright/test";

// Sprint 2.10 — Frontend Testing: e2e + accessibility + responsive
// checks. Runs against a locally-built app (webServer below); no real
// backend is required since Sprint 2 uses mock data only.
export default defineConfig({
  testDir: "../testing/e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"] } },
    { name: "tablet", use: { ...devices["iPad Mini"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "large-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 900 } } },
  ],
  webServer: {
    command: "pnpm --filter @hmb/frontend start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
