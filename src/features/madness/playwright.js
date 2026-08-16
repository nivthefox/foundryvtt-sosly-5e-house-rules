import {expect, test} from '@playwright/test';
import {createActor, loginUser} from '../../testing/foundry-helpers.js';

const module_id = 'sosly-5e-house-rules';

test.describe('Madness', () => {
    test.beforeEach(async ({page}) => {
        await loginUser(page, 'Gamemaster');
    });

    test('partial and replacement renders keep one current functional meter', async ({page}) => {
        const actorId = await createActor(page, 'Madness Idempotence Character', 'character', {
            flags: {
                sosly: {
                    madness: 3
                }
            }
        });

        const results = await page.evaluate(async ({actorId, moduleId}) => {
            const delay = ms => new Promise(resolve => {
                setTimeout(resolve, ms);
            });
            const actor = game.actors.get(actorId);
            const app = actor.sheet;
            const originalEnabled = game.settings.get(moduleId, 'madness');
            const originalMax = game.settings.get(moduleId, 'madness-max');
            let updateCount = 0;
            const updateHookId = Hooks.on('preUpdateActor', (updatedActor, changes) => {
                if (updatedActor === actor && foundry.utils.hasProperty(changes, 'flags.sosly.madness')) {
                    updateCount++;
                }
            });
            const summarize = () => {
                const sidebar = app.element?.querySelector('.dnd5e2.sheet.actor .sidebar .stats');
                const groups = sidebar?.querySelectorAll('[data-sosly-meter="madness"]') ?? [];
                const meter = groups[0]?.querySelector('.meter.madness');
                return {
                    sidebar,
                    groupCount: groups.length,
                    value: meter?.getAttribute('aria-valuenow'),
                    max: meter?.getAttribute('aria-valuemax'),
                    thresholds: Array.from(meter?.querySelectorAll('.threshold-tick') ?? [], tick => tick.dataset.threshold),
                    configButtonCount: groups[0]?.querySelectorAll('[data-action="config"]').length ?? 0
                };
            };

            try {
                await game.settings.set(moduleId, 'madness-max', 8);
                await game.settings.set(moduleId, 'madness', true);

                app.render({force: true, mode: app.constructor.MODES.EDIT});
                await delay(800);
                const initial = summarize();

                for (let i = 0; i < 20; i++) {
                    app.render({parts: ['details']});
                    await delay(100);
                }
                const partial = summarize();

                const configButton = partial.sidebar.querySelector(
                    '[data-sosly-meter="madness"] [data-action="config"]'
                );
                if (!configButton) {
                    throw new Error(`Madness meter was not editable: ${JSON.stringify({
                        actorIsOwner: actor.isOwner,
                        appEditable: app.options.editable,
                        configButtonCount: partial.configButtonCount
                    })}`);
                }
                configButton.click();
                let increaseButton;
                for (let i = 0; i < 20; i++) {
                    increaseButton = document.querySelector('.meter-config [data-action="increase"]');
                    if (increaseButton) {
                        break;
                    }
                    await delay(100);
                }
                if (!increaseButton) {
                    throw new Error('Madness configuration dialog did not render');
                }
                increaseButton.click();
                await delay(500);
                const afterEdit = summarize();

                await game.settings.set(moduleId, 'madness', false);
                const disabledSidebar = afterEdit.sidebar;
                app.render({parts: ['details']});
                await delay(200);
                const disabled = summarize();

                await game.settings.set(moduleId, 'madness', true);
                app.render({force: true});
                await delay(800);
                const replacement = summarize();

                for (let i = 0; i < 20; i++) {
                    app.render({parts: ['details']});
                }
                await delay(800);
                const overlapping = summarize();

                return {
                    initial: {
                        groupCount: initial.groupCount,
                        value: initial.value,
                        max: initial.max,
                        thresholds: initial.thresholds,
                        configButtonCount: initial.configButtonCount
                    },
                    partial: {
                        sameSidebar: partial.sidebar === initial.sidebar,
                        groupCount: partial.groupCount,
                        value: partial.value,
                        max: partial.max,
                        thresholds: partial.thresholds,
                        configButtonCount: partial.configButtonCount
                    },
                    edit: {
                        updateCount,
                        actorValue: actor.flags.sosly.madness,
                        groupCount: afterEdit.groupCount,
                        value: afterEdit.value
                    },
                    disabled: {
                        sameSidebar: disabled.sidebar === disabledSidebar,
                        groupCount: disabled.groupCount
                    },
                    replacement: {
                        sidebarReplaced: replacement.sidebar !== disabledSidebar,
                        groupCount: replacement.groupCount,
                        value: replacement.value,
                        max: replacement.max
                    },
                    overlapping: {
                        groupCount: overlapping.groupCount,
                        value: overlapping.value,
                        max: overlapping.max
                    }
                };
            } finally {
                Hooks.off('preUpdateActor', updateHookId);
                await app.close();
                await actor.delete();
                await game.settings.set(moduleId, 'madness-max', originalMax);
                await game.settings.set(moduleId, 'madness', originalEnabled);
            }
        }, {actorId, moduleId: module_id});

        expect(results.initial).toEqual({
            groupCount: 1,
            value: '3',
            max: '8',
            thresholds: ['2.5', '4.5', '6.5'],
            configButtonCount: 1
        });
        expect(results.partial).toEqual({
            sameSidebar: true,
            groupCount: 1,
            value: '3',
            max: '8',
            thresholds: ['2.5', '4.5', '6.5'],
            configButtonCount: 1
        });
        expect(results.edit).toEqual({
            updateCount: 1,
            actorValue: 4,
            groupCount: 1,
            value: '4'
        });
        expect(results.disabled).toEqual({
            sameSidebar: true,
            groupCount: 0
        });
        expect(results.replacement).toEqual({
            sidebarReplaced: true,
            groupCount: 1,
            value: '4',
            max: '8'
        });
        expect(results.overlapping).toEqual({
            groupCount: 1,
            value: '4',
            max: '8'
        });
    });
});
