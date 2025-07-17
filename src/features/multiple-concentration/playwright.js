import {expect, test} from '@playwright/test';
import {promises as fs} from 'fs';
import {importActor, createSpell, loginUser} from '../../testing/foundry-helpers.js';

/**
 * Integration tests for Multiple Concentration system
 */

test.describe('Multiple Concentration', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page, 'Gamemaster');
    });

    test('should allow two simultaneous concentration spells with HD cost', async ({ page }) => {
        // Import the warlock with class HD
        const warlockData = await fs.readFile('./src/testing/test-warlock.json', 'utf8');
        const actorId = await importActor(page, warlockData, 'Multiple Concentration Test');

        // Add three concentration spells to the actor
        await createSpell(page, actorId, 'Spell 1', {
            system: {
                level: 1,
                properties: ['concentration']
            }
        });

        await createSpell(page, actorId, 'Spell 2', {
            system: {
                level: 3,
                properties: ['concentration']
            }
        });

        await createSpell(page, actorId, 'Spell 3', {
            system: {
                level: 2,
                properties: ['concentration']
            }
        });

        // Open actor sheet
        await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            actor.sheet.render(true);
        }, actorId);

        await page.waitForSelector('div.sheet', { timeout: 5000 });
        const sheet = page.locator('div.sheet');

        // Record initial state
        const initial = await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            const warlockClass = actor.items.find(i => i.type === 'class' && i.name === 'Warlock');
            return {
                value: warlockClass.system.hd.value,
                spent: warlockClass.system.hd.spent,
                concentration: actor.effects.filter(e => e.statuses.has('concentrating')).length || 0
            };
        }, actorId);
        expect(initial.value).toBe(5);
        expect(initial.spent).toBe(0);
        expect(initial.concentration).toBe(0);

        // Swap to the spells page
        await sheet.locator('a.control[data-tab="spells"]').click();
        await sheet.waitFor('.tab-spells', { state: 'visible', timeout: 5000 });

        // Cast first spell (Hex) - no HD cost
        await page.locator('[data-item-name="Playwright Spell 1"] [data-action="use"]').click();
        await page.waitForSelector('dialog.activity-usage', { timeout: 5000 });

        // Check that concentration select is NOT visible (no existing concentration)
        const concentrationSelect = page.locator('dialog.activity-usage select[name="concentration.end"]');
        await expect(concentrationSelect).not.toBeVisible();

        // Cast the spell
        await page.locator('dialog.activity-usage button[data-action="use"]').click();
        await page.waitForSelector('dialog.activity-usage', { state: 'hidden', timeout: 5000 });

        // Verify first concentration is active
        const firstConcentration = await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            return actor.effects?.filter(e => e.statuses.has('concentrating')).length || 0;
        }, actorId);
        expect(firstConcentration).toBe(1);

        // Verify no HD spent yet
        const hdAfterFirst = await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            const warlockClass = actor.items.find(i => i.type === 'class' && i.name === 'Warlock');
            return warlockClass.system.hd.spent;
        }, actorId);
        expect(hdAfterFirst).toBe(0);

        // Cast second spell (Fly) - should show modified select box
        await page.locator('[data-item-name="Playwright Spell 2"] [data-action="use"]').click();
        await page.waitForSelector('dialog.activity-usage', { timeout: 5000 });

        // Verify concentration select is visible and has our custom option
        await expect(concentrationSelect).toBeVisible();

        // Check that the empty option has our custom text
        const emptyOptionText = await page.locator('dialog.activity-usage select[name="concentration.end"] option[value=""]').textContent();
        expect(emptyOptionText).toContain('None (Spend 1 d8 HD)');

        // Select the multiple concentration option
        await concentrationSelect.selectOption('');

        // Cast the spell
        await page.locator('dialog.activity-usage button[data-action="use"]').click();
        await page.waitForSelector('dialog.activity-usage', { state: 'hidden', timeout: 5000 });

        // Wait for chat message about HD expenditure
        await page.waitForSelector('.chat-message:has-text("expends a d8 Hit Die")', { timeout: 5000 });

        // Verify two concentrations are active
        const secondConcentration = await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            return actor.effects.filter(e => e.statuses.has('concentrating')).length;
        }, actorId);
        expect(secondConcentration).toBe(2);

        // Verify HD was spent
        const hdAfterSecond = await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            const warlockClass = actor.items.find(i => i.type === 'class' && i.name === 'Warlock');
            return warlockClass.system.hd.spent;
        }, actorId);
        expect(hdAfterSecond).toBe(1);

        // Try to cast third spell - should not allow without ending concentration
        await sheet.locator('[data-item-name="Playwright Spell 3"] [data-action="use"]').click();
        await page.waitForSelector('dialog.activity-usage', { timeout: 5000 });

        // Verify we must end a concentration (no empty option available)
        await expect(concentrationSelect).toBeVisible();
        const hasEmptyOption = await concentrationSelect.locator('option[value=""]').count();
        expect(hasEmptyOption).toBe(0);

        // Should have two options for the two active concentrations
        const concentrationOptions = await concentrationSelect.locator('option').count();
        expect(concentrationOptions).toBeGreaterThanOrEqual(2);
    });
});
