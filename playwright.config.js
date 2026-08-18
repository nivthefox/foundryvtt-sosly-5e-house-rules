import {defineConfig, devices} from '@playwright/test';

const baseURL = process.env.FOUNDRY_TEST_URL ?? 'http://localhost:30000';
const launchOptions = {
    headless: true,
    args: process.env.CI ? [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
    ] : ['--enable-gpu', '--use-gl=egl']
};

if (process.env.PLAYWRIGHT_CHANNEL) {
    launchOptions.channel = process.env.PLAYWRIGHT_CHANNEL;
}

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

  workers: 1,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html']],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Foundry v13 requires at least 1366x768 and blocks the UI below it. */
    viewport: {width: 1440, height: 900},
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Increase action timeout for CI */
    actionTimeout: process.env.CI ? 15000 : 5000,

    launchOptions
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1440, height: 900}
      }
    },
  ],
});
