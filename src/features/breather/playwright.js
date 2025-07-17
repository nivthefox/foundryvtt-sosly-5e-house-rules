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
        await page.waitForSelector('dialog.breather', { timeout: 10000 });
        const dialog = page.locator('dialog.breather');
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('select[name="hd"]')).toBeVisible();
        await expect(dialog.locator('[data-action="rollHitDie"]')).toBeVisible();
        await expect(dialog.locator('button[name="rest"]')).toBeVisible();

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
        await dialog.locator('button[name="rest"]').click();

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
        await page.waitForSelector('dialog.breather', { timeout: 10000 });
        const dialog = page.locator('dialog.breather');
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('.window-title')).toContainText('Breather');

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
        await dialog.locator('button[name="rest"]').click();

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

    test('PC class-specific HD recovery - single and half types', async ({ page }) => {
        // Create a simple character with one class
        const actorId = await createActor(page, 'Class Feature Test PC', 'character', {
            type: 'character',
            name: 'Feature Recovery Test',
            system: {
                attributes: {
                    hp: {
                        value: 20,
                        max: 50
                    }
                },
                details: {
                    level: 5
                }
            }
        });

        // Add multiclass with Bard and Paladin
        await page.evaluate(async actorId => {
            const actor = game.actors.get(actorId);

            // Add Bard (d8)
            await actor.createEmbeddedDocuments('Item', [{
                name: 'Bard',
                type: 'class',
                system: {
                    identifier: 'bard',
                    levels: 3,
                    hd: {
                        denomination: 'd8',
                        value: 3,
                        spent: 0
                    }
                }
            }]);

            // Add Paladin (d10)
            await actor.createEmbeddedDocuments('Item', [{
                name: 'Paladin',
                type: 'class',
                system: {
                    identifier: 'paladin',
                    levels: 2,
                    hd: {
                        denomination: 'd10',
                        value: 2,
                        spent: 0
                    }
                }
            }]);

            // Add test features - one single recovery, one half recovery
            await actor.createEmbeddedDocuments('Item', [
                {
                    name: 'Bardic Inspiration',  // Single recovery
                    type: 'feat',
                    system: {
                        uses: {
                            value: 2,
                            max: 5,
                            spent: 3
                        }
                    }
                },
                {
                    name: 'Lay on Hands',  // Half recovery
                    type: 'feat',
                    system: {
                        uses: {
                            value: 10,
                            max: 50,
                            spent: 40
                        }
                    }
                }
            ]);
        }, actorId);

        // Open actor sheet
        await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            actor.sheet.render(true);
        }, actorId);

        await page.waitForSelector('.sheet.actor', { timeout: 5000 });
        const sheet = await page.locator('.sheet.actor');

        // Test 1: Verify features appear in dialog
        await sheet.locator('.breather-button.gold-button').click();
        await page.waitForSelector('dialog.breather', { timeout: 10000 });
        let dialog = page.locator('dialog.breather');

        // Verify features are shown as checkboxes
        const bardicBox = dialog.locator('dnd5e-checkbox[name="features.bardic-inspiration"]');
        const layBox = dialog.locator('dnd5e-checkbox[name="features.lay-on-hands"]');

        await expect(bardicBox).toBeVisible();
        await expect(layBox).toBeVisible();

        // Verify labels show correct recovery amounts
        // Find the form-group containing the checkbox, then find its label
        const bardicGroup = dialog.locator('.form-group:has(dnd5e-checkbox[name="features.bardic-inspiration"])');
        const layGroup = dialog.locator('.form-group:has(dnd5e-checkbox[name="features.lay-on-hands"])');

        await expect(bardicGroup.locator('label')).toContainText('Regain 1 Bardic Inspiration');
        await expect(layGroup.locator('label')).toContainText('Regain 25 Lay on Hands'); // Half of 50

        // Test 2: Single recovery type
        await dialog.locator('dnd5e-checkbox[name="features.bardic-inspiration"]').click();

        // Complete rest
        await dialog.locator('button[name="rest"]').click();
        await expect(dialog).not.toBeVisible();

        // Wait for the actor to be updated - check that spent value has changed
        await page.waitForFunction(
            actorId => {
                const actor = game.actors.get(actorId);
                const bardic = actor.items.find(i => i.name === 'Bardic Inspiration');
                return bardic.system.uses.spent === 2; // Expected value after recovery
            },
            actorId,
            { timeout: 5000 }
        );

        // Verify feature recovered and HD spent
        const singleResult = await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            const bardic = actor.items.find(i => i.name === 'Bardic Inspiration');
            const bard = actor.items.find(i => i.name === 'Bard' && i.type === 'class');
            return {
                bardicValue: bardic.system.uses.value,
                bardicSpent: bardic.system.uses.spent,
                bardHdSpent: bard.system.hd.spent
            };
        }, actorId);

        expect(singleResult.bardicValue).toBe(3); // Was 2, recovered 1
        expect(singleResult.bardicSpent).toBe(2); // Was 3, recovered 1
        expect(singleResult.bardHdSpent).toBe(1); // Spent 1 HD from Bard (smallest HD)

        // Test 3: Half recovery type
        await sheet.locator('.breather-button.gold-button').click();
        await page.waitForSelector('dialog.breather', { timeout: 10000 });
        dialog = page.locator('dialog.breather');

        // Select half recovery feature
        await dialog.locator('dnd5e-checkbox[name="features.lay-on-hands"]').click();

        // Complete rest
        await dialog.locator('button[name="rest"]').click();
        await expect(dialog).not.toBeVisible();

        // Wait for the actor to be updated - check that spent value has changed
        await page.waitForFunction(
            actorId => {
                const actor = game.actors.get(actorId);
                const layOnHands = actor.items.find(i => i.name === 'Lay on Hands');
                return layOnHands.system.uses.spent === 15; // Expected value after recovery
            },
            actorId,
            { timeout: 5000 }
        );

        // Verify feature recovered and HD spent
        const halfResult = await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            const layOnHands = actor.items.find(i => i.name === 'Lay on Hands');
            const bard = actor.items.find(i => i.name === 'Bard' && i.type === 'class');
            return {
                layValue: layOnHands.system.uses.value,
                laySpent: layOnHands.system.uses.spent,
                bardHdSpent: bard.system.hd.spent
            };
        }, actorId);

        expect(halfResult.layValue).toBe(35); // Was 10, recovered 25 (half of 50)
        expect(halfResult.laySpent).toBe(15); // Was 40, recovered 25
        expect(halfResult.bardHdSpent).toBe(2); // Now 2 HD spent total from Bard

        // Test 4: Insufficient HD validation
        // First spend most HD
        await page.evaluate(async actorId => {
            const actor = game.actors.get(actorId);
            const bard = actor.items.find(i => i.name === 'Bard' && i.type === 'class');
            const paladin = actor.items.find(i => i.name === 'Paladin' && i.type === 'class');

            await actor.updateEmbeddedDocuments('Item', [
                {
                    _id: bard.id,
                    'system.hd.spent': 3  // All Bard HD spent
                },
                {
                    _id: paladin.id,
                    'system.hd.spent': 1  // Only 1 Paladin HD left
                }
            ]);
        }, actorId);

        await sheet.locator('.breather-button.gold-button').click();
        await page.waitForSelector('dialog.breather', { timeout: 10000 });
        dialog = page.locator('dialog.breather');

        // Try to select multiple features (would need 2 HD)
        await dialog.locator('dnd5e-checkbox[name="features.bardic-inspiration"]').click();
        await dialog.locator('dnd5e-checkbox[name="features.lay-on-hands"]').click();

        // Rest button should be disabled and error message visible
        const restButton = dialog.locator('button[name="rest"]');
        await expect(restButton).toBeDisabled();
        
        // Check for validation error message in the dialog
        const errorMessage = dialog.locator('.feature-validation-error');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText('Not enough Hit Dice');

        // Close dialog
        await dialog.locator('button[data-action="close"]').click();
        await expect(dialog).not.toBeVisible();

        // Test 5: Features at max uses not shown
        await page.evaluate(async actorId => {
            const actor = game.actors.get(actorId);

            // Max out Bardic Inspiration
            const bardic = actor.items.find(i => i.name === 'Bardic Inspiration');
            await actor.updateEmbeddedDocuments('Item', [{
                _id: bardic.id,
                'system.uses.value': 5,
                'system.uses.spent': 0
            }]);
        }, actorId);

        await sheet.locator('.breather-button.gold-button').click();
        await page.waitForSelector('dialog.breather', { timeout: 10000 });
        dialog = page.locator('dialog.breather');

        // Bardic Inspiration should not be visible since it's at max
        const bardicNotVisible = dialog.locator('dnd5e-checkbox[name="features.bardic-inspiration"]');
        await expect(bardicNotVisible).not.toBeVisible();

        // But Lay on Hands should still be visible
        const layStillVisible = dialog.locator('dnd5e-checkbox[name="features.lay-on-hands"]');
        await expect(layStillVisible).toBeVisible();
    });
});
