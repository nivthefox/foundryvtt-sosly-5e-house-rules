import {expect, test} from '@playwright/test';

const MODULE_ID = 'sosly-5e-house-rules';

async function loginUser(page, username) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('select[name="userid"]').selectOption({label: username});
    await page.locator('button[name="join"]').click();
    await page.waitForFunction(moduleId => {
        return window.game?.ready && window.game.modules.get(moduleId)?.active;
    }, MODULE_ID, {timeout: 30000});
}

async function exerciseEncumbranceLifecycle(page, actorId, itemId) {
    return page.evaluate(async ({actorId, itemId}) => {
        const actor = game.actors.get(actorId);
        const item = actor.items.get(itemId);
        const originalName = item.name;
        const trace = [];
        let counts = {reset: 0, systemPrepare: 0, actorPrepare: 0};

        const replaceMethod = (target, method, onCall) => {
            const descriptor = Object.getOwnPropertyDescriptor(target, method);
            const original = target[method];
            target[method] = function(...args) {
                onCall.call(this);
                return original.apply(this, args);
            };

            return () => {
                if (descriptor) {
                    target[method] = original;
                    return;
                }
                delete target[method];
            };
        };

        const restoreReset = replaceMethod(actor.constructor.prototype, 'reset', function() {
            if (this.id !== actor.id) {
                return;
            }
            counts.reset++;
            trace.push('parent.reset');
        });
        const restoreSystemPrepare = replaceMethod(
            Object.getPrototypeOf(actor.system),
            'prepareDerivedData',
            function() {
                if (this.parent?.id !== actor.id) {
                    return;
                }
                counts.systemPrepare++;
                trace.push('system.prepareDerivedData');
            }
        );
        const restoreActorPrepare = replaceMethod(
            actor.constructor.prototype,
            'prepareDerivedData',
            function() {
                if (this.id !== actor.id) {
                    return;
                }
                counts.actorPrepare++;
                trace.push('actor.prepareDerivedData');
            }
        );
        const hookId = Hooks.on('updateItem', updatedItem => {
            if (updatedItem.id === item.id) {
                trace.push('updateItem');
            }
        });
        const clearMeasurements = () => {
            counts = {reset: 0, systemPrepare: 0, actorPrepare: 0};
            trace.length = 0;
        };
        const snapshot = sheet => ({
            equipped: item.system.equipped,
            weight: actor.system.attributes.encumbrance.value,
            counts: {...counts},
            trace: [...trace],
            sheetId: sheet.id,
            sheetRendered: sheet.rendered,
            sheetUnchanged: actor.sheet === sheet
        });

        const sheet = actor.sheet;
        let baseline;
        let equip;
        let unequip;
        let unrelatedUpdate;

        try {
            await sheet.render({force: true});
            await new Promise(resolve => {
                setTimeout(resolve, 500);
            });
            baseline = snapshot(sheet);

            clearMeasurements();
            await item.update({'system.equipped': true});
            await new Promise(resolve => {
                setTimeout(resolve, 250);
            });
            equip = snapshot(sheet);

            clearMeasurements();
            await item.update({'system.equipped': false});
            await new Promise(resolve => {
                setTimeout(resolve, 250);
            });
            unequip = snapshot(sheet);

            clearMeasurements();
            await item.update({name: `${originalName} unrelated update`});
            await new Promise(resolve => {
                setTimeout(resolve, 250);
            });
            unrelatedUpdate = snapshot(sheet);
        } finally {
            Hooks.off('updateItem', hookId);
            restoreActorPrepare();
            restoreSystemPrepare();
            restoreReset();
            if (item.name !== originalName) {
                await item.update({name: originalName});
            }
            if (item.system.equipped) {
                await item.update({'system.equipped': false});
            }
            if (sheet.rendered) {
                await sheet.close();
            }
        }

        return {baseline, equip, unequip, unrelatedUpdate};
    }, {actorId, itemId});
}

function expectNormalLifecycle(result) {
    expect(result.counts).toEqual({reset: 1, systemPrepare: 1, actorPrepare: 1});
    expect(result.trace).toEqual([
        'parent.reset',
        'system.prepareDerivedData',
        'actor.prepareDerivedData',
        'updateItem'
    ]);
    expect(result.sheetRendered).toBe(true);
    expect(result.sheetUnchanged).toBe(true);
}

function expectEncumbranceResults(results) {
    expect(results.baseline.equipped).toBe(false);
    expect(results.baseline.weight).toBe(20);

    expect(results.equip.equipped).toBe(true);
    expect(results.equip.weight).toBe(10);
    expectNormalLifecycle(results.equip);

    expect(results.unequip.equipped).toBe(false);
    expect(results.unequip.weight).toBe(20);
    expectNormalLifecycle(results.unequip);

    expect(results.unrelatedUpdate.equipped).toBe(false);
    expect(results.unrelatedUpdate.weight).toBe(20);
    expectNormalLifecycle(results.unrelatedUpdate);

    expect(results.equip.sheetId).toBe(results.baseline.sheetId);
    expect(results.unequip.sheetId).toBe(results.baseline.sheetId);
    expect(results.unrelatedUpdate.sheetId).toBe(results.baseline.sheetId);
}

test.describe('Encumbrance item update lifecycle', () => {
    test('uses normal Actor preparation for Gamemaster and Player2 equipment updates', async ({browser}) => {
        const gmContext = await browser.newContext();
        const gmPage = await gmContext.newPage();
        await loginUser(gmPage, 'Gamemaster');

        const fixture = await gmPage.evaluate(async () => {
            const player = game.users.find(user => user.name === 'Player2');
            const actor = await Actor.create({
                name: 'Playwright F-13 Encumbrance',
                type: 'character',
                ownership: {[player.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER},
                system: {
                    abilities: {str: {value: 10}},
                    currency: {pp: 0, gp: 0, ep: 0, sp: 0, cp: 0}
                }
            });
            const [item] = await actor.createEmbeddedDocuments('Item', [{
                name: 'Playwright F-13 20 lb Equipment',
                type: 'equipment',
                system: {
                    quantity: 1,
                    weight: {value: 20, units: 'lb'},
                    equipped: false,
                    identified: true
                }
            }]);
            return {actorId: actor.id, itemId: item.id};
        });

        let playerContext;
        try {
            expectEncumbranceResults(await exerciseEncumbranceLifecycle(
                gmPage,
                fixture.actorId,
                fixture.itemId
            ));

            playerContext = await browser.newContext();
            const playerPage = await playerContext.newPage();
            await loginUser(playerPage, 'Player2');
            expectEncumbranceResults(await exerciseEncumbranceLifecycle(
                playerPage,
                fixture.actorId,
                fixture.itemId
            ));
        } finally {
            await playerContext?.close();
            await gmPage.evaluate(async actorId => game.actors.get(actorId)?.delete(), fixture.actorId);
            await gmContext.close();
        }
    });
});
