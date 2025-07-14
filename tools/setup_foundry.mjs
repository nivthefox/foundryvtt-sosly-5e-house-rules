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

    // 6. Set up the world
    console.log('6. Setting up the world...');
    await page.click('h2[data-tab="worlds"]');
    await page.waitForSelector('#worlds button[data-action="worldCreate"]', {timeout: 10000});
    await page.click('#worlds button[data-action="worldCreate"]');
    await page.waitForSelector('#world-config', {timeout: 10000});
    await page.fill('#world-config input[name="title"]', 'Test World');
    await page.selectOption('#world-config select[name="system"]', 'dnd5e');
    await page.click('#world-config button[type="submit"]');
    console.log('   ✓ World creation submitted');

    // Wait for the world to be created
    await page.waitForSelector('li[data-package-id="test-world"]', {timeout: 120000});
    console.log('   ✓ World created successfully');

    // 7. Start the world
    await page.hover('li[data-package-id="test-world"]');
    await page.click('li[data-package-id="test-world"] a.play');
    console.log('7. Starting the world...');

    await page.waitForSelector('#join-game', {timeout: 120000});
    console.log('   ✓ World started successfully');

    // 8. Login as GM
    console.log('8. Logging in as GM...');
    // Select the Gamemaster option from the dropdown
    await page.selectOption('#join-game select[name="userid"]', { label: 'Gamemaster' });
    await page.click('#join-game button[name="join"]');
    console.log('   ✓ Logged in as GM');

    // Close the tour
    const loginTour = await page
        .waitForSelector('aside.tour a[data-action="exit"]', {timeout: 30000})
        .catch(() => false);
    if (loginTour) {
        await page.click('aside.tour a[data-action="exit"]');
        console.log('   ✓ Tour dialog closed');
    }

    // 9. Enable modules
    console.log('9. Enabling modules...');
    await page.waitForSelector('#ui-right nav a[data-tab="settings"]', {timeout: 30000});
    await page.click('#ui-right nav a[data-tab="settings"]');
    console.log('   ✓ Settings tab opened');
    await page.waitForSelector('#settings button[data-action="modules"]', {timeout: 10000});
    await page.click('#settings button[data-action="modules"]');
    console.log('   ✓ Module management opened');
    await page.waitForSelector('#module-management', {timeout: 30000});
    await page.check('#module-management input[name="lib-wrapper"]');
    await page.check('#module-management input[name="quench"]');
    await page.check('#module-management input[name="sosly-5e-house-rules"]');
    await page.click('#module-management button[type="submit"]');
    console.log('   ✓ Modules enabled');
    await page.waitForSelector('#reload-world-confirm', {timeout: 30000});
    await page.click('#reload-world-confirm button[data-action="yes"]');
    console.log('   ✓ World reloading...');

    // Wait for the world to reload
    await page.waitForSelector('#ui-right', {timeout: 30000});
    console.log('   ✓ World reloaded successfully');

    // 10. Finalize setup
    console.log('10. Finalizing setup...');
    await browser.close();
})();
