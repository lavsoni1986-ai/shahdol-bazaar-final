import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Tests ko parallel chalane ke liye */
  fullyParallel: true,
  /* CI par agar 'test.only' reh gaya toh build fail karega */
  forbidOnly: !!process.env.CI,
  /* Fail hone par 2 baar retry karega (sirf CI par) */
  retries: process.env.CI ? 2 : 0,
  /* Parallel tests ke liye workers */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reports generate karne ke liye settings */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],

  /* Sabhi tests ke liye common settings */
  use: {
    /* Aapka actual Vercel URL yahan set kar diya gaya hai */
    baseURL: 'https://shahdol-bazaar-final-di481o095-lavsoni1986-ais-projects.vercel.app',

    /* Fail hone par trace, screenshot aur video save karega */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Alag-alag browsers aur devices par test karne ke liye */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile view testing (Zaroori hai kyunki ye ek PWA hai) */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});