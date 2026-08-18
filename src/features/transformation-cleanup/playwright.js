import {test, expect} from '@playwright/test';
import {loginUser, setModuleSetting} from '../../testing/foundry-helpers';

const module_id = 'sosly-5e-house-rules';

test.describe('Transformation Cleanup Feature', () => {
    test.beforeEach(async ({page}) => {
        await loginUser(page, 'Gamemaster');
    });

    test('registers its localized world setting', async ({page}) => {
        const setting = await page.evaluate(moduleId => {
            const config = game.settings.settings.get(`${moduleId}.transformation-cleanup`);
            return {
                name: config?.name,
                label: game.i18n.localize(config?.name),
                scope: config?.scope,
                type: config?.type?.name
            };
        }, module_id);

        expect(setting).toEqual({
            name: 'sosly.transformation-cleanup.label',
            label: 'Automatic Transformation Cleanup',
            scope: 'world',
            type: 'Boolean'
        });
    });

    test('allows the Gamemaster to toggle its world setting', async ({page}) => {
        await setModuleSetting(page, 'transformation-cleanup', true);
        expect(await page.evaluate(moduleId => {
            return game.settings.get(moduleId, 'transformation-cleanup');
        }, module_id)).toBe(true);

        await setModuleSetting(page, 'transformation-cleanup', false);
        expect(await page.evaluate(moduleId => {
            return game.settings.get(moduleId, 'transformation-cleanup');
        }, module_id)).toBe(false);
    });

    test('registers the dnd5e transformation hook', async ({page}) => {
        const settingReads = await page.evaluate(moduleId => {
            const originalGet = game.settings.get.bind(game.settings);
            let calls = 0;

            game.settings.get = (namespace, key) => {
                if (namespace === moduleId && key === 'transformation-cleanup') {
                    calls += 1;
                    return false;
                }
                return originalGet(namespace, key);
            };

            try {
                Hooks.callAll('dnd5e.revertOriginalForm', {type: 'character'}, {});
                return calls;
            } finally {
                game.settings.get = originalGet;
            }
        }, module_id);

        expect(settingReads).toBe(1);
    });
});
