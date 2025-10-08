import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for UI validation
 * - Visual regression testing with screenshot comparison
 * - Accessibility testing with axe-core
 * - Cross-browser testing (Chromium, Firefox, WebKit)
 * 
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: "./tests/ui",
  
  // Run tests in files in parallel
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ["html", { outputFolder: ".automation/playwright-report" }],
    ["json", { outputFile: ".automation/playwright-results.json" }],
    ["list"]
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.UI_ORIGIN ?? "http://localhost:3000",
    
    // Collect trace when retrying the failed test
    trace: "on-first-retry",
    
    // Screenshot on failure
    screenshot: "only-on-failure",
    
    // Video on failure
    video: "retain-on-failure",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    
    // Uncomment for cross-browser testing
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000/healthz",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // Visual regression settings
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 5000,
    
    toHaveScreenshot: {
      // Maximum number of pixels that are allowed to be different
      maxDiffPixels: 100,
      // Threshold for comparison (0 = identical, 1 = completely different)
      threshold: 0.2,
    },
  },
});

