import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for FoundryVTT integration tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src',
  testMatch: '**/playwright.js',

  timeout: 120 * 1000, // 2 minutes timeout for each test
  
  /* Global setup and teardown for test user management */
  globalSetup: './src/testing/setup.js',
  globalTeardown: './src/testing/teardown.js',

  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  workers: process.env.CI ? 1 : 3,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html']],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:30000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    launchOptions: {
        headless: true,
        args: ['--enable-gpu', '--use-gl=egl'],
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
  ],
});
