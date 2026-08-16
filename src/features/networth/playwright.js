import {expect, test} from '@playwright/test';
import {createActor, loginUser} from '../../testing/foundry-helpers.js';

const LOCATION_TYPE = 'sosly-5e-house-rules.location';

test.describe('Net Worth display', () => {
    test.beforeEach(async ({page}) => {
        await loginUser(page, 'Gamemaster');
    });

    test('reconciles the current display across supported sheet renders', async ({page}) => {
        const actorIds = [
            await createActor(page, 'Net Worth Character', 'character', {
                system: {currency: {gp: 5}}
            }),
            await createActor(page, 'Net Worth NPC', 'npc', {
                system: {currency: {gp: 5}}
            }),
            await createActor(page, 'Net Worth Location', LOCATION_TYPE, {
                system: {currency: {gp: 5}}
            })
        ];

        try {
            const results = await page.evaluate(async actorIds => {
                const delay = ms => new Promise(resolve => {
                    setTimeout(resolve, ms);
                });
                const hookByType = {
                    character: 'renderCharacterActorSheet',
                    npc: 'renderNPCActorSheet',
                    'sosly-5e-house-rules.location': 'renderLocationSheet'
                };
                const actorResults = [];

                for (const actorId of actorIds) {
                    const actor = game.actors.get(actorId);
                    const app = actor.sheet;
                    const hook = hookByType[actor.type];

                    try {
                        app.render({force: true});
                        await delay(800);

                        const initialContainer = app.element.querySelector('.inventory-element .currency');
                        const initialDisplay = initialContainer.querySelector('.net-worth');

                        for (let index = 0; index < 20; index++) {
                            Hooks.callAll(hook, app, app.element, {}, {});
                        }

                        const afterStressDisplays = initialContainer.querySelectorAll('.net-worth');

                        actor.updateSource({'system.currency.gp': 17});
                        Hooks.callAll(hook, app, app.element, {}, {});

                        const updatedDisplays = initialContainer.querySelectorAll('.net-worth');
                        const updatedDisplay = updatedDisplays[0];

                        app.render({force: true});
                        await delay(800);

                        const replacementContainer = app.element.querySelector('.inventory-element .currency');
                        const replacementDisplays = replacementContainer.querySelectorAll('.net-worth');
                        const replacementDisplay = replacementDisplays[0];

                        actorResults.push({
                            type: actor.type,
                            initialCount: initialContainer.querySelectorAll('.net-worth').length,
                            stressCount: afterStressDisplays.length,
                            updatedCount: updatedDisplays.length,
                            reusedDisplay: updatedDisplay === initialDisplay,
                            updatedValue: updatedDisplay.querySelector('span').textContent,
                            containerReplaced: replacementContainer !== initialContainer,
                            replacementCount: replacementDisplays.length,
                            replacementValue: replacementDisplay.querySelector('span').textContent,
                            iconClasses: Array.from(replacementDisplay.querySelector('i').classList),
                            tooltip: replacementDisplay.querySelector('i').dataset.tooltip,
                            ariaLabel: replacementDisplay.querySelector('i').getAttribute('aria-label')
                        });
                    } finally {
                        await app.close();
                    }
                }

                return actorResults;
            }, actorIds);

            expect(results.map(result => result.type)).toEqual([
                'character',
                'npc',
                LOCATION_TYPE
            ]);

            for (const result of results) {
                expect(result.initialCount).toBe(1);
                expect(result.stressCount).toBe(1);
                expect(result.updatedCount).toBe(1);
                expect(result.reusedDisplay).toBe(true);
                expect(result.updatedValue).toBe('17');
                expect(result.containerReplaced).toBe(true);
                expect(result.replacementCount).toBe(1);
                expect(result.replacementValue).toBe('17');
                expect(result.iconClasses).toEqual(['fas', 'fa-coins']);
                expect(result.tooltip).toBe('sosly.networth');
                expect(result.ariaLabel).toBe('Net Worth');
            }
        } finally {
            for (const actorId of actorIds) {
                await page.evaluate(async actorId => game.actors.get(actorId)?.delete(), actorId);
            }
        }
    });
});
