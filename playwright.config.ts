import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'ui-tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
});

