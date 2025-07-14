import { chromium } from '@playwright/test';

(async function setupFoundryComplete() {
    const browser = await chromium.launch({
        args: ['--enable-gpu', '--use-gl=egl'],
        headless: true,
        timeout: 120000,
    });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }, // Set a reasonable viewport size
        baseURL: 'http://localhost:30000', // Base URL for Foundry
    });
    const page = await context.newPage();

    console.log('=== Starting FoundryVTT Setup ===');

    // 1. Navigate to Foundry
    console.log('1. Navigating to Foundry...');
    await page.goto('/');

    // 2. Accept license if needed
    if (page.url().includes('/license')) {
        console.log('2. Accepting license agreement...');
        await page.waitForLoadState('networkidle');

        // Click the checkbox
        const checkbox = page.locator('input[type="checkbox"]');
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }

        // Click agree button
        const agreeButton = page.locator('button:has-text("Agree")');
        await agreeButton.click();

        // Wait for navigation to setup page
        await page.waitForURL('**/setup', {timeout: 30000});
        console.log('   ✓ License accepted');
    }

    // 3. Now we should be on the setup page
    await page.waitForURL('**/setup', {timeout: 10000});
    console.log('3. Reached setup page');

    // Handle usage data sharing dialog if present
    await page.waitForSelector('div.dialog button[data-button="no"]', {timeout: 5000});
    await page.click('div.dialog button[data-button="no"]');
    console.log('   ✓ Usage data sharing declined');

    // Handle the tour dialog if present
    const setupTour = await page
        .waitForSelector('aside.tour a[data-action="exit"]', {timeout: 5000})
        .catch(() => false);
    if (setupTour) {
        await page.click('aside.tour a[data-action="exit"]');
        console.log('   ✓ Tour dialog closed');
    }

    // 4. Install D&D 5e system
    console.log('4. Installing D&D 5e system...');
    await page.waitForSelector('#systems button[data-action="installPackage"]', {timeout: 10000});
    await page.click('#systems button[data-action="installPackage"]');
    await page.waitForSelector('[data-package-id="dnd5e"]', {timeout: 10000});
    await page.click('[data-package-id="dnd5e"] button.install');
    console.log('   ✓ D&D 5e system installation started');
    await page.click('#install-package a.close');
    console.log('   ✓ Closed installation dialog');

    // Wait for the installation to complete
    await page.waitForFunction(() => {
        const activeTab = document.querySelector('nav.tabs h2.active');
        return activeTab && activeTab.getAttribute('data-tab') !== 'systems';
    }, { timeout: 120000, polling: 1000 });
    await page.click('h2[data-tab="systems"]');
    console.log('   ✓ Switched back to Systems tab');
    await page.waitForSelector('li[data-package-id="dnd5e"]', {timeout: 5000});
    console.log('   ✓ D&D 5e system installation completed');

    // 5. Install Dependencies
    console.log('5. Installing dependencies...');
    await page.click('h2[data-tab="modules"]');
    await page.waitForSelector('#modules button[data-action="installPackage"]', {timeout: 10000});
    await page.click('#modules button[data-action="installPackage"]');
    await page.waitForSelector('[data-package-id="lib-wrapper"]', {timeout: 10000});
    await page.click('[data-package-id="lib-wrapper"] button.install');
    console.log('   ✓ libWrapper installation started');
    await page.waitForSelector('[data-package-id="quench"]', {timeout: 10000});
    await page.click('[data-package-id="quench"] button.install');
    console.log('   ✓ Quench installation started');
    await page.click('#install-package a.close');
    console.log('   ✓ Closed installation dialog');

    // Wait for the installation to complete
    await page.waitForSelector('li[data-package-id="lib-wrapper"]', {timeout: 120000});
    await page.waitForSelector('li[data-package-id="quench"]', {timeout: 120000});
    console.log('   ✓ Dependencies installed');

    // 6. Initial setup complete - world will be provided separately
    console.log('6. Initial setup complete. License verified, systems and dependencies installed.');
    await browser.close();
})();
