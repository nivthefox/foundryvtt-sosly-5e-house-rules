import { test, expect } from '@playwright/test';
import { 
  waitForFoundryReady, 
  cleanupTestActors,
  setModuleSetting 
} from './foundry-helpers.js';

/**
 * Integration tests for Quench unit testing
 */

test.describe('Quench Unit Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForFoundryReady(page);
    
    // Ensure our module is enabled
    await setModuleSetting(page, 'breather', true);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestActors(page);
  });

  test('should run all Quench unit tests successfully', async ({ page }) => {
    // Check if Quench module is available
    const quenchAvailable = await page.evaluate(() => {
      return game.modules.get('quench')?.active;
    });

    if (!quenchAvailable) {
      test.skip('Quench module is not available or active');
    }

    // Find and click the Quench button in the UI right panel
    const quenchButton = page.locator('#ui-right .quench-button');
    await expect(quenchButton).toBeVisible({ timeout: 10000 });
    await quenchButton.click();

    // Wait for Quench frame to open
    await page.waitForSelector('#quench-results', { timeout: 10000 });
    await expect(page.locator('#quench-results')).toBeVisible();

    // Set up listener for quenchReports hook before clicking Run
    const quenchReportsPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        Hooks.once('quenchReports', (reports) => {
          resolve(reports);
        });
      });
    });

    // Click the Run button in Quench
    const runButton = page.locator('#quench-results #quench-run');
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await runButton.click();

    // Wait for tests to complete via quenchReports hook
    console.log('Waiting for Quench tests to complete...');
    const reports = await quenchReportsPromise;

    console.log('Quench test results:', reports);

    // Parse the JSON results from Quench
    expect(reports).toBeDefined();
    expect(reports.json).toBeDefined();
    
    const testResults = JSON.parse(reports.json);
    const stats = testResults.stats;
    
    // Verify test results
    expect(stats).toBeDefined();
    expect(stats.tests).toBeGreaterThan(0);
    expect(stats.failures).toBe(0);
    expect(stats.passes).toBe(stats.tests);

    // Log success summary
    console.log(`All Quench tests passed: ${stats.passes}/${stats.tests} tests across ${stats.suites} suites in ${stats.duration}ms`);
  });
});