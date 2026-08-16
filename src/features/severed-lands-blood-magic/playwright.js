import {expect, test} from '@playwright/test';
import {createActor, loginUser} from '../../testing/foundry-helpers.js';

const module_id = 'sosly-5e-house-rules';

test.describe('Severed Lands blood pool meter', () => {
    test.beforeEach(async ({page}) => {
        await loginUser(page, 'Gamemaster');
    });

    test('partial renders reconcile one current functional meter', async ({page}) => {
        const actorId = await createActor(page, 'Blood Meter Character');
        const originalActorId = await createActor(page, 'Blood Meter Original Character');

        const results = await page.evaluate(async ({actorId, originalActorId, moduleId}) => {
            const delay = ms => new Promise(resolve => {
                setTimeout(resolve, ms);
            });
            const actor = game.actors.get(actorId);
            const originalActor = game.actors.get(originalActorId);
            const originalEnabled = game.settings.get(moduleId, 'severed-lands-blood-magic');
            const [firstVial, secondVial] = await actor.createEmbeddedDocuments('Item', [
                {
                    name: 'Playwright Blood Vial A',
                    type: 'feat',
                    system: {
                        identifier: 'blood-vial',
                        uses: {max: 30, spent: 6}
                    }
                },
                {
                    name: 'Playwright Blood Vial B',
                    type: 'feat',
                    system: {
                        identifier: 'blood-vial',
                        uses: {max: 18, spent: 6}
                    }
                }
            ]);
            await originalActor.createEmbeddedDocuments('Item', [{
                name: 'Playwright Original Blood Vial',
                type: 'feat',
                system: {
                    identifier: 'blood-vial',
                    uses: {max: 40, spent: 10}
                }
            }]);

            const app = actor.sheet;
            const trackedItemUpdates = [];
            let empoweredBloodUpdates = 0;
            const itemHookId = Hooks.on('preUpdateItem', (item, changes) => {
                if (item.parent === actor && foundry.utils.hasProperty(changes, 'system.uses.spent')) {
                    trackedItemUpdates.push(item.id);
                }
            });
            const actorHookId = Hooks.on('preUpdateActor', (updatedActor, changes) => {
                if (updatedActor === actor
                    && foundry.utils.hasProperty(changes, `flags.${moduleId}.empoweredBlood`)) {
                    empoweredBloodUpdates++;
                }
            });
            const summarize = () => {
                const sidebar = app.element?.querySelector('.dnd5e2.sheet.actor .sidebar .stats');
                const groups = sidebar?.querySelectorAll('[data-sosly-meter="blood-pool"]') ?? [];
                const meter = groups[0]?.querySelector('.meter.blood-pool');
                return {
                    sidebar,
                    groupCount: groups.length,
                    value: meter?.getAttribute('aria-valuenow'),
                    max: meter?.getAttribute('aria-valuemax')
                };
            };
            const renderPartial = async () => {
                app.render({parts: ['inventory']});
                await delay(250);
            };
            const editMeter = async value => {
                const group = app.element.querySelector('[data-sosly-meter="blood-pool"]');
                const label = group?.querySelector('.meter.blood-pool .label');
                const input = group?.querySelector('.meter.blood-pool input');
                if (!label || !input) {
                    throw new Error('Blood pool meter was not inline editable');
                }

                label.click();
                input.value = String(value);
                input.blur();
                await delay(800);
            };

            try {
                await game.settings.set(moduleId, 'severed-lands-blood-magic', true);
                app.render({force: true, mode: app.constructor.MODES.EDIT});
                await delay(1000);
                const initial = summarize();

                for (let index = 0; index < 20; index++) {
                    await renderPartial();
                }
                const repeated = summarize();

                await editMeter(25);
                const edited = summarize();
                const distributedTotal = actor.items
                    .filter(item => item.system.identifier === 'blood-vial')
                    .reduce((total, item) => total + item.system.uses.max - item.system.uses.spent, 0);
                const editUpdatedItems = [...new Set(trackedItemUpdates)].sort();
                const editUpdateCount = trackedItemUpdates.length;

                const [thirdVial] = await actor.createEmbeddedDocuments('Item', [{
                    name: 'Playwright Blood Vial C',
                    type: 'feat',
                    system: {
                        identifier: 'blood-vial',
                        uses: {max: 12, spent: 2}
                    }
                }]);
                await renderPartial();
                const afterAdd = summarize();

                await thirdVial.update({'system.uses.max': 20, 'system.uses.spent': 4});
                await renderPartial();
                const afterChange = summarize();

                await thirdVial.delete();
                await renderPartial();
                const afterRemove = summarize();

                await actor.update({
                    'flags.dnd5e.isPolymorphed': true,
                    'flags.dnd5e.originalActor': originalActorId,
                    [`flags.${moduleId}.empoweredBlood`]: 55
                });
                empoweredBloodUpdates = 0;
                await renderPartial();
                const polymorphed = summarize();

                for (let index = 0; index < 20; index++) {
                    app.render({parts: ['inventory']});
                }
                await delay(1000);
                const overlapping = summarize();

                await editMeter(50);
                const polymorphEdit = summarize();

                await actor.update({'flags.dnd5e.originalActor': 'missing-actor'});
                await renderPartial();
                const missingOriginal = summarize();

                await actor.update({'flags.dnd5e.isPolymorphed': false});
                await renderPartial();
                const reverted = summarize();

                await actor.deleteEmbeddedDocuments('Item', [firstVial.id, secondVial.id]);
                await renderPartial();
                const noVials = summarize();

                await actor.createEmbeddedDocuments('Item', [{
                    name: 'Playwright Replacement Blood Vial',
                    type: 'feat',
                    system: {
                        identifier: 'blood-vial',
                        uses: {max: 15, spent: 3}
                    }
                }]);
                await renderPartial();
                const restored = summarize();

                await game.settings.set(moduleId, 'severed-lands-blood-magic', false);
                const enabledSidebar = restored.sidebar;
                await renderPartial();
                const disabled = summarize();

                return {
                    initial: {
                        groupCount: initial.groupCount,
                        value: initial.value,
                        max: initial.max
                    },
                    repeated: {
                        sameSidebar: repeated.sidebar === initial.sidebar,
                        groupCount: repeated.groupCount,
                        value: repeated.value,
                        max: repeated.max
                    },
                    edit: {
                        groupCount: edited.groupCount,
                        value: edited.value,
                        distributedTotal,
                        updatedItems: editUpdatedItems,
                        updateCount: editUpdateCount
                    },
                    afterAdd: {
                        groupCount: afterAdd.groupCount,
                        value: afterAdd.value,
                        max: afterAdd.max
                    },
                    afterChange: {
                        groupCount: afterChange.groupCount,
                        value: afterChange.value,
                        max: afterChange.max
                    },
                    afterRemove: {
                        groupCount: afterRemove.groupCount,
                        value: afterRemove.value,
                        max: afterRemove.max
                    },
                    polymorphed: {
                        groupCount: polymorphed.groupCount,
                        value: polymorphed.value,
                        max: polymorphed.max
                    },
                    overlapping: {
                        groupCount: overlapping.groupCount,
                        value: overlapping.value,
                        max: overlapping.max
                    },
                    polymorphEdit: {
                        groupCount: polymorphEdit.groupCount,
                        value: polymorphEdit.value,
                        flagValue: actor.getFlag(moduleId, 'empoweredBlood'),
                        updateCount: empoweredBloodUpdates
                    },
                    missingOriginal: {
                        groupCount: missingOriginal.groupCount
                    },
                    reverted: {
                        groupCount: reverted.groupCount,
                        value: reverted.value,
                        max: reverted.max
                    },
                    noVials: {
                        groupCount: noVials.groupCount
                    },
                    restored: {
                        groupCount: restored.groupCount,
                        value: restored.value,
                        max: restored.max
                    },
                    disabled: {
                        sameSidebar: disabled.sidebar === enabledSidebar,
                        groupCount: disabled.groupCount
                    }
                };
            } finally {
                Hooks.off('preUpdateItem', itemHookId);
                Hooks.off('preUpdateActor', actorHookId);
                await app.close();
                await actor.delete();
                await originalActor.delete();
                await game.settings.set(moduleId, 'severed-lands-blood-magic', originalEnabled);
            }
        }, {actorId, originalActorId, moduleId: module_id});

        expect(results.initial).toEqual({groupCount: 1, value: '36', max: '48'});
        expect(results.repeated).toEqual({sameSidebar: true, groupCount: 1, value: '36', max: '48'});
        expect(results.edit.groupCount).toBe(1);
        expect(results.edit.value).toBe('25');
        expect(results.edit.distributedTotal).toBe(25);
        expect(results.edit.updatedItems).toHaveLength(2);
        expect(results.edit.updateCount).toBe(2);
        expect(results.afterAdd).toEqual({groupCount: 1, value: '35', max: '60'});
        expect(results.afterChange).toEqual({groupCount: 1, value: '41', max: '68'});
        expect(results.afterRemove).toEqual({groupCount: 1, value: '25', max: '48'});
        expect(results.polymorphed).toEqual({groupCount: 1, value: '55', max: '80'});
        expect(results.overlapping).toEqual({groupCount: 1, value: '55', max: '80'});
        expect(results.polymorphEdit).toEqual({
            groupCount: 1,
            value: '50',
            flagValue: 50,
            updateCount: 1
        });
        expect(results.missingOriginal).toEqual({groupCount: 0});
        expect(results.reverted).toEqual({groupCount: 1, value: '25', max: '48'});
        expect(results.noVials).toEqual({groupCount: 0});
        expect(results.restored).toEqual({groupCount: 1, value: '12', max: '15'});
        expect(results.disabled).toEqual({sameSidebar: true, groupCount: 0});
    });
});
