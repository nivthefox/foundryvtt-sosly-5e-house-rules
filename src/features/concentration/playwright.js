import {expect, test} from '@playwright/test';
import {createActor, createSpell, getModuleSetting, loginUser} from '../../testing/foundry-helpers.js';

test.describe('Concentration Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page, 'Gamemaster');
    });

    test('should prompt for concentration removal during short rest', async ({ page }) => {
        // Create test actor with spell slots
        const actorId = await createActor(page, 'Concentration Short Rest Test', 'character', {
            system: {
                attributes: {
                    hp: {
                        value: 10,
                        max: 10,
                    }
                }
            },
        });

        // Create concentration spell
        await createSpell(page, actorId, 'Concentration Spell', {
            system: {
                level: 0,
                properties: ['concentration']
            }
        });

        // Open actor sheet
        await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            actor.sheet.render(true);
        }, actorId);

        await page.waitForSelector('.sheet.actor', { timeout: 5000 });
        const sheet = await page.locator('.sheet.actor');

        // Cast the spell and wait for the dialog to appear
        await castConcentrationSpell(page, actorId);

        // Verify concentration effect is applied
        expect(await hasConcentration(page, actorId)).toBe(true);

        // Trigger short rest
        await sheet.locator('button.short-rest').click();

        // Wait for short rest dialog to appear
        await page.waitForSelector('dialog.short-rest', {timeout: 5000});
        await page.click('dialog.short-rest button[name="rest"]');
        await page.waitForSelector('dialog.short-rest', {state: 'detached'});

        // End concentration
        await endConcentration(page);

        // Verify concentration effect is removed
        expect(await hasConcentration(page, actorId)).toBe(false);
    });

    test('should prompt for concentration removal during long rest', async ({ page }) => {
        // Create test actor with spell slots
        const actorId = await createActor(page, 'Concentration Long Rest Test', 'character', {
            system: {
                attributes: {
                    hp: {
                        value: 10,
                        max: 10,
                    }
                }
            },
        });

        // Create concentration spell
        await createSpell(page, actorId, 'Concentration Spell', {
            system: {
                level: 0,
                properties: ['concentration']
            }
        });

        // Open actor sheet
        await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            actor.sheet.render(true);
        }, actorId);

        await page.waitForSelector('.sheet.actor', { timeout: 5000 });
        const sheet = await page.locator('.sheet.actor');

        // Cast the spell and wait for the dialog to appear
        await castConcentrationSpell(page, actorId);

        // Verify concentration effect is applied
        expect(await hasConcentration(page, actorId)).toBe(true);

        // Trigger long rest
        await sheet.locator('button.long-rest').click();

        // Wait for long rest dialog to appear
        await page.waitForSelector('dialog.long-rest', {timeout: 5000});
        await page.click('dialog.long-rest button[name="rest"]');
        await page.waitForSelector('dialog.long-rest', {state: 'detached'});

        // End concentration
        await endConcentration(page);

        // Verify concentration effect is removed
        expect(await hasConcentration(page, actorId)).toBe(false);
    });

    test('should prompt for concentration removal during breather', async ({ page }) => {
        // Skip if breather is disabled
        const breatherEnabled = await getModuleSetting(page, 'breather');
        if (!breatherEnabled) {
            test.skip();
            return;
        }

        // Create test actor with spell slots
        const actorId = await createActor(page, 'Concentration Breather Test', 'character', {
            system: {
                attributes: {
                    hp: {
                        value: 10,
                        max: 10,
                    }
                }
            },
        });

        // Create concentration spell
        await createSpell(page, actorId, 'Concentration Spell', {
            system: {
                level: 0,
                properties: ['concentration']
            }
        });

        // Open actor sheet
        await page.evaluate(actorId => {
            const actor = game.actors.get(actorId);
            actor.sheet.render(true);
        }, actorId);

        await page.waitForSelector('.sheet.actor', { timeout: 5000 });
        const sheet = await page.locator('.sheet.actor');

        // Cast the spell and wait for the dialog to appear
        await castConcentrationSpell(page, actorId);

        // Verify concentration effect is applied
        expect(await hasConcentration(page, actorId)).toBe(true);

        // Trigger breather
        await sheet.locator('button.breather-button').click();

        // Wait for breather dialog to appear
        await page.waitForSelector('dialog.breather', {timeout: 5000});
        await page.click('dialog.breather button[name="rest"]');
        await page.waitForSelector('dialog.breather', {state: 'detached'});

        // End concentration
        await endConcentration(page);

        // Verify concentration effect is removed
        expect(await hasConcentration(page, actorId)).toBe(false);
    });
});

async function hasConcentration(page, actorId) {
    return await page.evaluate(async actorId => {
        const actor = game.actors.get(actorId);
        return actor.effects.some(effect => effect.statuses.has('concentrating'));
    }, actorId);
}

async function castConcentrationSpell(page, actorId) {
    await page.evaluate(async actorId => {
        const actor = game.actors.get(actorId);
        const spell = actor.items.find(item => item.name.includes('Concentration Spell'));
        spell.use();
    }, actorId);

    await page.waitForSelector('dialog.activity-usage', { timeout: 5000 });
    await page.click('dialog.activity-usage button[data-action="use"]');

    // Wait for spell dialog to close
    await page.waitForSelector('dialog.activity-usage', { state: 'detached' });
}

async function endConcentration(page) {
    await page.waitForSelector('dialog.rest-concentration', {timeout: 5000});

    // Verify concentration dialog content
    const concentrationDialog = page.locator('dialog.rest-concentration');
    await expect(concentrationDialog).toContainText('concentrating on Playwright Concentration Spell');
    await expect(concentrationDialog).toContainText('end concentration');

    // Confirm to end concentration
    await page.click('dialog.rest-concentration button[data-action="yes"]');
}
