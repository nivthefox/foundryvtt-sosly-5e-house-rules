import {expect, test} from '@playwright/test';

const LOCATION_TYPE = 'sosly-5e-house-rules.location';
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

async function measureContextMenuListeners(page, actorId, itemId, rerenders) {
    return page.evaluate(async ({actorId, itemId, rerenders}) => {
        const actor = game.actors.get(actorId);
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const contextMenuRoots = [];
        const delay = ms => new Promise(resolve => {
            setTimeout(resolve, ms);
        });
        const waitForItem = async () => {
            for (let attempt = 0; attempt < 50; attempt++) {
                if (actor.sheet.element?.querySelector(`[data-item-id="${itemId}"]`)) {
                    return;
                }
                await delay(100);
            }
            throw new Error(`Timed out waiting for ${actor.name} item row as ${game.user.name}`);
        };

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if ((type === 'contextmenu') && this.classList?.contains('location')) {
                contextMenuRoots.push(this);
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        try {
            await actor.sheet.render({force: true});
            await waitForItem();
            const root = actor.sheet.element;
            const registrationsAfterFirstRender = contextMenuRoots.filter(element => element === root).length;

            for (let index = 0; index < rerenders; index++) {
                await actor.sheet.render({force: true});
            }

            const registrationsAfterRerenders = contextMenuRoots.filter(element => element === root).length;
            return {
                registrationsAfterFirstRender,
                registrationsAfterRerenders,
                registrationsAddedByRerenders: registrationsAfterRerenders - registrationsAfterFirstRender,
                rootPersisted: actor.sheet.element === root
            };
        } finally {
            EventTarget.prototype.addEventListener = originalAddEventListener;
        }
    }, {actorId, itemId, rerenders});
}

async function verifyContextMenu(page, itemId) {
    const itemRow = page.locator(`.location.sheet .item[data-item-id="${itemId}"]`);
    await expect(itemRow).toBeVisible();
    await itemRow.click({button: 'right'});
    await expect(page.locator('#context-menu')).toBeVisible();

    const contextMenu = await page.evaluate(() => ({
        itemId: ui.context?.target?.dataset.itemId,
        actions: ui.context?.menuItems.map(item => item.name)
    }));

    expect(contextMenu.itemId).toBe(itemId);
    expect(contextMenu.actions).toContain('DND5E.ItemView');
    expect(contextMenu.actions).toContain('DND5E.DisplayCard');
}

async function verifyRootTeardown(page, actorId) {
    const teardown = await page.evaluate(async actorId => {
        await ui.context?.close({animate: false});
        const sheet = game.actors.get(actorId).sheet;
        const root = sheet.element;
        await sheet.close({animate: false});
        return {
            rootDisconnected: !root.isConnected,
            sheetElementCleared: sheet.element === null,
            renderedPartsCleared: Object.keys(sheet.parts).length === 0,
            contextMenuCleared: !ui.context
        };
    }, actorId);

    expect(teardown.rootDisconnected).toBe(true);
    expect(teardown.sheetElementCleared).toBe(true);
    expect(teardown.renderedPartsCleared).toBe(true);
    expect(teardown.contextMenuCleared).toBe(true);
}

test.describe('Location sheet context menu lifecycle', () => {
    test('does not add context-menu listeners when the persistent root rerenders', async ({browser}) => {
        const gmContext = await browser.newContext({viewport: {width: 1440, height: 900}});
        const gmPage = await gmContext.newPage();
        await loginUser(gmPage, 'Gamemaster');

        const fixture = await gmPage.evaluate(async locationType => {
            const player = game.users.find(user => user.name === 'Player2');
            const actor = await Actor.create({
                name: 'Playwright F-01 Location',
                type: locationType,
                ownership: {[player.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}
            });
            const [item] = await actor.createEmbeddedDocuments('Item', [{
                name: 'Playwright F-01 Item',
                type: 'loot'
            }]);
            return {actorId: actor.id, itemId: item.id};
        }, LOCATION_TYPE);

        try {
            const gmResult = await measureContextMenuListeners(gmPage, fixture.actorId, fixture.itemId, 100);
            expect(gmResult.rootPersisted).toBe(true);
            await verifyContextMenu(gmPage, fixture.itemId);
            await verifyRootTeardown(gmPage, fixture.actorId);

            const playerContext = await browser.newContext({viewport: {width: 1440, height: 900}});
            const playerPage = await playerContext.newPage();
            await loginUser(playerPage, 'Player2');

            const playerResult = await measureContextMenuListeners(playerPage, fixture.actorId, fixture.itemId, 100);
            expect(playerResult.rootPersisted).toBe(true);
            await verifyContextMenu(playerPage, fixture.itemId);
            await verifyRootTeardown(playerPage, fixture.actorId);

            await playerContext.close();

            expect.soft(gmResult.registrationsAddedByRerenders).toBe(0);
            expect.soft(playerResult.registrationsAddedByRerenders).toBe(0);
        } finally {
            await gmPage.evaluate(async actorId => game.actors.get(actorId)?.delete(), fixture.actorId);
            await gmContext.close();
        }
    });
});
