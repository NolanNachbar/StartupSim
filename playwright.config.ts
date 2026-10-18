import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: ".verify/playwright",
  reporter: [["list"], ["json", { outputFile: ".verify/e2e.json" }]],
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "tablet", use: { viewport: { width: 800, height: 1000 } } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  ],
});
