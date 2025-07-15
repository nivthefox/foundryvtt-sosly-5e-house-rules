import {expect, test} from '@playwright/test';
import {promises as fs} from 'fs';
import {createActor, importActor, loginUser} from '../../testing/foundry-helpers.js';

/**
 * Integration tests for Breather system
 */

test.describe('Breather', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page, 'Gamemaster');
    });

    test('PCs should be able to take a breather', async ({ page }) => {
        const warlockData = await fs.readFile('./src/testing/test-warlock.json', 'utf8');
        const actorId = await importActor(page, warlockData, 'Breather Test PC');

        // Open actor sheet
        await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            actor.sheet.render(true);
        }, actorId);

        await page.waitForSelector('.sheet.actor', { timeout: 5000 });
        const sheet = await page.locator('.sheet.actor');

        // Verify breather button exists
        const breatherButton = sheet.locator('.breather-button.gold-button');
        await expect(breatherButton).toBeVisible({ timeout: 5000 });
        await expect(breatherButton).toHaveAttribute('data-tooltip', 'sosly.breather.label');
        await expect(breatherButton.locator('i.fas.fa-face-exhaling')).toBeVisible();

        // Set up promises for breather hooks before clicking rest
        const preBreatherPromise = page.evaluate( () => {
            return new Promise(resolve => {
                Hooks.on('sosly.preBreather', (actor, event) => {
                    resolve({ success: true, actor: actor.id });
                });
            });
        });

        // Click breather button
        await breatherButton.click();

        // Wait for preBreather to fire
        const preBreatherResults = await Promise.race([
            preBreatherPromise,
            page.waitForTimeout(5000).then(() => ({ success: false, timeout: true }))
        ]);

        // Verify prebreather hooks
        expect(preBreatherResults.timeout).not.toBe(true);
        expect(preBreatherResults.success).toBe(true);
        expect(preBreatherResults.actor).toBe(actorId);

        // Wait for breather dialog
        await page.waitForSelector('#breather-dialog', { timeout: 10000 });
        const dialog = page.locator('#breather-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('.window-title')).toContainText('Breather Test PC');
        await expect(dialog.locator('select[name="hd"]')).toBeVisible();
        await expect(dialog.locator('[data-action="rollHitDie"]')).toBeVisible();
        await expect(dialog.locator('[data-action="rest"]')).toBeVisible();
        await expect(dialog.locator('[data-action="cancel"]')).toBeVisible();

        // Set up promise to wait for hit die roll before clicking
        const hitDieRolledPromise = page.evaluate(() => {
            return new Promise(resolve => {
                Hooks.on('dnd5e.postRollHitDie', (roll, data) => {
                    resolve({ success: true, actor: data.subject.id });
                });
            });
        });

        // Roll hit die
        await dialog.locator('[data-action="rollHitDie"]').click();

        // Wait for the hook to fire
        const rollResult = await Promise.race([
            hitDieRolledPromise,
            page.waitForTimeout(5000).then(() => ({ success: false, timeout: true }))
        ]);

        expect(rollResult.timeout).not.toBe(true);
        expect(rollResult.success).toBe(true);
        expect(rollResult.actor).toBe(actorId);

        const breatherPromise = page.evaluate(() => {
            return new Promise(resolve => {
                Hooks.on('sosly.breather', (actor, event) => {
                    resolve({ success: true, actor: actor.id });
                });
            });
        });

        // Complete the rest
        await dialog.locator('[data-action="rest"]').click();

        // Wait for breather to fire
        const breatherResults = await Promise.race([
            breatherPromise,
            page.waitForTimeout(5000).then(() => ({ success: false, timeout: true }))
        ]);

        // Verify breather hooks
        expect(breatherResults.timeout).not.toBe(true);
        expect(breatherResults.success).toBe(true);
        expect(breatherResults.actor).toBe(actorId);

        // Verify dialog closed
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });

    test('NPCs should be able to take a breather', async ({ page }) => {
        const actorId = await createActor(page, 'Test NPC', 'npc', {
            type: 'npc',
            name: 'Playwright Test NPC',
            system: {
                attributes: {
                    hp: {
                        value: 5,
                        max: 10,
                        formula: '5d6'
                    },
                    hd: {
                        spent: 0
                    }
                }
            }
        });

        // Record initial HD spent
        const initialSpent = await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            return actor.system.attributes.hd.spent;
        }, actorId);
        expect(initialSpent).toBe(0);

        // Open NPC sheet
        await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            actor.sheet.render(true);
        }, actorId);

        await page.waitForSelector('.sheet.actor', { timeout: 5000 });
        const sheet = await page.locator('.sheet.actor');

        // Verify breather button exists
        const breatherButton = sheet.locator('.breather-button.gold-button');
        await expect(breatherButton).toBeVisible({ timeout: 5000 });

        // Set up hook promises
        const preBreatherPromise = page.evaluate(() => {
            return new Promise(resolve => {
                Hooks.on('sosly.preBreather', (actor, event) => {
                    resolve({ success: true, actor: actor.id });
                });
            });
        });

        // Click breather button
        await breatherButton.click();

        // Verify preBreather hook fired
        const preBreatherResults = await Promise.race([
            preBreatherPromise,
            page.waitForTimeout(5000).then(() => ({ success: false, timeout: true }))
        ]);
        expect(preBreatherResults.success).toBe(true);
        expect(preBreatherResults.actor).toBe(actorId);

        // Wait for breather dialog
        await page.waitForSelector('#breather-dialog', { timeout: 10000 });
        const dialog = page.locator('#breather-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('.window-title')).toContainText('Playwright Test NPC');

        // Verify hit dice select shows d6
        const hdSelect = dialog.locator('select[name="hd"]');
        await expect(hdSelect).toBeVisible();
        const selectedOption = await hdSelect.locator('option:checked');
        await expect(selectedOption).toHaveAttribute('value', 'd6');
        await expect(selectedOption).toContainText('d6');

        // Set up promise for hit die roll
        const hitDieRolledPromise = page.evaluate(() => {
            return new Promise(resolve => {
                Hooks.on('dnd5e.postRollHitDie', (roll, data) => {
                    resolve({ success: true, actor: data.subject.id });
                });
            });
        });

        // Roll hit die
        await dialog.locator('[data-action="rollHitDie"]').click();

        // Wait for the hook to fire
        const rollResult = await Promise.race([
            hitDieRolledPromise,
            page.waitForTimeout(5000).then(() => ({ success: false, timeout: true }))
        ]);
        expect(rollResult.success).toBe(true);
        expect(rollResult.actor).toBe(actorId);

        // Set up breather hook promise
        const breatherPromise = page.evaluate(() => {
            return new Promise(resolve => {
                Hooks.on('sosly.breather', (actor, event) => {
                    resolve({ success: true, actor: actor.id });
                });
            });
        });

        // Complete the rest
        await dialog.locator('[data-action="rest"]').click();

        // Wait for breather hook
        const breatherResults = await Promise.race([
            breatherPromise,
            page.waitForTimeout(5000).then(() => ({ success: false, timeout: true }))
        ]);
        expect(breatherResults.success).toBe(true);
        expect(breatherResults.actor).toBe(actorId);

        // Verify dialog closed
        await expect(dialog).not.toBeVisible({ timeout: 5000 });

        // Verify HD spent increased
        const finalSpent = await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            return actor.system.attributes.hd.spent;
        }, actorId);
        expect(finalSpent).toBe(1);
    });
});
