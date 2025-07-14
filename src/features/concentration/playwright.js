import {expect, test} from '@playwright/test';
import {createActor, createSpell, getModuleSetting, loginUser} from '../../testing/foundry-helpers.js';

test.describe('Concentration Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page, 'Gamemaster');
    });


    test('should prompt for concentration removal during rests', async ({ page }) => {
        // Create test actor with spell slots
        const actorId = await createActor(page, 'Concentration Test Actor', 'character', {
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

        // Short Rest
        {
            // Cast the spell and wait for the dialog to appear
            await castConcentrationSpell(page, actorId);

            // Verify concentration effect is applied
            expect(await hasConcentration(page, actorId)).toBe(true);

            // Trigger breather
            await sheet.locator('button.short-rest').click();

            // Wait for breather dialog to appear
            await page.waitForSelector('dialog.short-rest', {timeout: 5000});
            await page.click('dialog.short-rest button[name="rest"]');
            await page.waitForSelector('dialog.short-rest', {state: 'detached'});

            // End concentration
            await endConcentration(page);

            // Verify concentration effect is removed
            expect(await hasConcentration(page, actorId)).toBe(false);
        }

        // Long Rest
        {
            // Cast the spell and wait for the dialog to appear
            await castConcentrationSpell(page, actorId);

            // Verify concentration effect is applied
            expect(await hasConcentration(page, actorId)).toBe(true);

            // Trigger breather
            await sheet.locator('button.long-rest').click();

            // Wait for breather dialog to appear
            await page.waitForSelector('dialog.long-rest', {timeout: 5000});
            await page.click('dialog.long-rest button[name="rest"]');
            await page.waitForSelector('dialog.long-rest', {state: 'detached'});

            // End concentration
            await endConcentration(page);

            // Verify concentration effect is removed
            expect(await hasConcentration(page, actorId)).toBe(false);
        }

        // Breather
        if (await getModuleSetting(page, 'breather')) {
            // Cast the spell and wait for the dialog to appear
            await castConcentrationSpell(page, actorId);

            // Verify concentration effect is applied
            expect(await hasConcentration(page, actorId)).toBe(true);

            // Trigger breather
            await sheet.locator('button.breather-button').click();

            // Wait for breather dialog to appear
            await page.waitForSelector('div#breather-dialog', {timeout: 5000});
            await page.click('div#breather-dialog button[data-action="rest"]');
            await page.waitForSelector('div#breather-dialog', {state: 'detached'});

            // End concentration
            await endConcentration(page);

            // Verify concentration effect is removed
            expect(await hasConcentration(page, actorId)).toBe(false);
        }
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
    await page.waitForSelector('div.app.dialog:has(.window-title:text("Concentration"))', {timeout: 5000});

    // Verify concentration dialog content
    const concentrationDialog = page.locator('div.app.dialog:has(.window-title:text("Concentration"))');
    await expect(concentrationDialog).toContainText('concentrating on Playwright Concentration Spell');
    await expect(concentrationDialog).toContainText('end concentration');

    // Confirm to end concentration
    await page.click('div.app.dialog:has(.window-title:text("Concentration")) button[data-button="yes"]');
}
