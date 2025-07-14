import { chromium } from '@playwright/test';
import {cleanupTestActors, cleanupChatMessages, loginUser} from './foundry-helpers';

/**
 * Global teardown that runs once after all tests are complete
 * Cleans up any test actors and chat messages created during the test run
 */
export default async function globalTeardown(cfg) {
    console.log('Running global teardown...');
    
    const browser = await chromium.launch();
    const context = await browser.newContext({
        baseURL: cfg.projects[0].use.baseURL,
    });
    const page = await context.newPage();

    // Login as the Gamemaster to perform cleanup
    await loginUser(page, 'Gamemaster');
    
    // Clean up test actors and chat messages
    await cleanupTestActors(page);
    await cleanupChatMessages(page);
    
    console.log('Global teardown complete');
    
    await browser.close();
}
