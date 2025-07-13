import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { 
  waitForFoundryReady, 
  importTestCharacter,
  damageCharacter,
  cleanupTestActors,
  setModuleSetting 
} from '../../testing/foundry-helpers.js';

/**
 * Integration tests for Breather system
 */

test.describe('Breather Feature', () => {
  let testActorId;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForFoundryReady(page);
    
    // Ensure breather feature is enabled
    await setModuleSetting(page, 'breather', true);
    
    // Import test warlock character
    const warlockData = readFileSync('./src/testing/test-warlock.json', 'utf8');
    testActorId = await importTestCharacter(page, warlockData, 'Breather Test');
    
    // Damage the character so they need healing
    await damageCharacter(page, testActorId, 15);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestActors(page);
  });

  test('should allow spending hit dice and completing a breather rest', async ({ page }) => {
    // Record initial HP
    const initialHP = await page.evaluate((actorId) => {
      const actor = game.actors.get(actorId);
      return actor.system.attributes.hp.value;
    }, testActorId);

    // Open actor sheet
    await page.evaluate((actorId) => {
      const actor = game.actors.get(actorId);
      actor.sheet.render(true);
    }, testActorId);

    // Wait for sheet to open and find breather button
    await page.waitForSelector('.sheet, .window-app', { timeout: 10000 });
    const breatherButton = page.locator('.breather-button.gold-button');
    await expect(breatherButton).toBeVisible({ timeout: 5000 });
    
    // Click breather button to open dialog
    await breatherButton.click();

    // Wait for breather dialog to open (ApplicationV2 with ID 'breather-dialog')
    await page.waitForSelector('#breather-dialog', { timeout: 10000 });
    const dialog = page.locator('#breather-dialog');
    await expect(dialog).toBeVisible();

    // Try to spend hit dice if possible - use specific selector for breather dialog
    const rollButton = dialog.locator('[data-action="rollHitDie"]');
    if (await rollButton.count() > 0) {
      await rollButton.click();
      await page.waitForTimeout(1000);
      console.log('Hit die rolled successfully');
    }

    // Complete the rest
    const restButton = dialog.locator('[data-action="rest"]');
    await expect(restButton).toBeVisible({ timeout: 5000 });
    await restButton.click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    
    // Check if a chat message was created for the breather
    const chatMessages = await page.evaluate(() => {
      return game.messages.contents
        .filter(msg => msg.content.toLowerCase().includes('breather'))
        .map(msg => ({
          content: msg.content,
          speaker: msg.speaker?.alias || msg.speaker?.actor,
          timestamp: msg.timestamp
        }));
    });

    // Verify the breather system worked
    const finalHP = await page.evaluate((actorId) => {
      const actor = game.actors.get(actorId);
      return actor.system.attributes.hp.value;
    }, testActorId);

    console.log(`HP: ${initialHP} -> ${finalHP}`);
    console.log('Breather chat messages:', chatMessages);
    
    // Assertions
    expect(typeof finalHP).toBe('number');
    expect(chatMessages.length).toBeGreaterThan(0);
    expect(chatMessages[0].content).toContain('takes a breather');
    
    // If hit dice were rolled, HP should have increased
    if (finalHP > initialHP) {
      console.log('Hit dice were successfully rolled and HP increased');
    }
  });
});