import {expect, test} from '@playwright/test';
import {loginUser} from './foundry-helpers.js';

test.describe('Quench Unit Tests', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page, 'Gamemaster');
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
        await expect(quenchButton).toBeVisible();
        await quenchButton.click();

        // Wait for Quench frame to open
        await page.waitForSelector('#quench-results', { timeout: 10000 });
        await expect(page.locator('#quench-results')).toBeVisible();

        // Set up listener for quenchReports hook before clicking Run
        const quenchReportsPromise = page.evaluate(() => {
            return new Promise(resolve => {
                Hooks.once('quenchReports', reports => {
                    resolve(reports);
                });
            });
        });

        // Click the Run button in Quench
        await page.click('#quench-results #quench-run');

        // Wait for the reports to be generated
        const reports = await quenchReportsPromise;
        expect(reports).toBeDefined();
        expect(reports.json).toBeDefined();
        const testResults = JSON.parse(reports.json);
        const stats = testResults.stats;

        // Verify test results
        expect(stats).toBeDefined();
        expect(stats.tests).toBeGreaterThan(0);
        expect(stats.failures).toBe(0);
        expect(stats.passes).toBe(stats.tests);
    });
});
