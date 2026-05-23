import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  timeout: 30000,

  use: {
    baseURL: 'http://localhost:5174',
    headless: false,
    viewport: {
      width: 390,
      height: 844,
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // 🛡️ TRUSTED E2E: Identifies as Playwright to bypass rate limiting in development
    extraHTTPHeaders: {
      'x-e2e-test': 'true',
      'x-test-runner': 'playwright',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
