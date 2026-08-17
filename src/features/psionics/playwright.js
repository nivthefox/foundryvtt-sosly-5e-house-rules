import { expect, test } from '@playwright/test';
import { loginUser } from '../../testing/foundry-helpers.js';

const CARD_SELECTOR = '[data-sosly-card="psionic-manifesting"]';
const DISCIPLINE_SECTION_SELECTOR = '[data-sosly-section="psionic-disciplines"]';
const PSIONIC_COST_SELECTOR = '[data-sosly-psionic-cost]';
const CLASS_ID = 'RZUGlaJPnjd23lWC';
const CLASSES_PACK = 'sosly-5e-house-rules.classes';
const POWER_POINTS_ID = 'yXFJ10Lf7yDyu5OM';
const PSIONIC_POWER_ID = '41QCZrkxbRfk8uVn';
const PSIONICS_PACK = 'sosly-5e-house-rules.psionics';

async function createPsionicActor(page, type, ownerName = null) {
    return page.evaluate(async ({ actorType, classId, packId, actorOwnerName }) => {
        const actorSource = {
            name: `Playwright F-09 ${actorType}`,
            type: actorType,
            system: {
                abilities: {
                    int: { value: 18 }
                },
                attributes: {
                    spellcasting: 'wis'
                }
            }
        };
        if (actorOwnerName) {
            const owner = game.users.getName(actorOwnerName);
            actorSource.ownership = {
                default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
                [owner.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
            };
        }

        const actor = await Actor.create(actorSource);
        const psionicist = await game.packs.get(packId).getDocument(classId);
        const classSource = psionicist.toObject();
        delete classSource._id;
        classSource.system.advancement = classSource.system.advancement.filter(
            advancement => advancement.type === 'ScaleValue'
        );
        const [classItem] = await actor.createEmbeddedDocuments('Item', [classSource]);

        return { actorId: actor.id, classItemId: classItem.id };
    }, {
        actorType: type,
        classId: CLASS_ID,
        packId: CLASSES_PACK,
        actorOwnerName: ownerName
    });
}

async function validatePsionicActor(page, fixture, type) {
    return page.evaluate(async ({ actorId, classItemId, actorType, cardSelector }) => {
        const actor = game.actors.get(actorId);
        const app = actor.sheet;
        const renderHook = `render${actorType === 'character' ? 'Character' : 'NPC'}ActorSheet`;
        const delay = ms => new Promise(resolve => {
            setTimeout(resolve, ms);
        });
        const waitFor = async predicate => {
            for (let attempt = 0; attempt < 50; attempt++) {
                if (predicate()) {
                    return;
                }
                await delay(100);
            }
            throw new Error(`Timed out waiting for ${actorType} sheet state`);
        };
        const getTopSection = () => app.element?.querySelector('[data-application-part="spells"] > .top');
        const getCards = () => Array.from(app.element?.querySelectorAll(cardSelector) ?? []);
        const summarizeCard = () => {
            const card = getCards()[0];
            return {
                cardCount: getCards().length,
                ability: card?.querySelector('.ability .value')?.textContent.trim(),
                attack: card?.querySelector('.attack .value')?.textContent.trim(),
                save: card?.querySelector('.save .value')?.textContent.trim(),
                limit: card?.querySelector('.limit .value')?.textContent.trim(),
                primary: card?.querySelector('button[data-action="spellcasting"]')?.getAttribute('aria-pressed')
            };
        };

        let renderHookCalls = 0;
        let spellcastingUpdates = 0;
        const renderHookId = Hooks.on(renderHook, renderedApp => {
            if (renderedApp === app) {
                renderHookCalls++;
            }
        });
        const updateHookId = Hooks.on('preUpdateActor', (updatedActor, changes) => {
            if (updatedActor === actor && foundry.utils.hasProperty(changes, 'system.attributes.spellcasting')) {
                spellcastingUpdates++;
            }
        });

        try {
            app.render({ force: true, mode: app.constructor.MODES.EDIT });
            await waitFor(() => getCards().length === 1);
            await delay(500);

            const initialTopSection = getTopSection();
            const initialCard = getCards()[0];
            const initial = {
                directTopSections: app.element.querySelectorAll('[data-application-part="spells"] > .top').length,
                obsoleteSelectorMatches: app.element.querySelectorAll('.spells .top').length,
                ...summarizeCard()
            };

            renderHookCalls = 0;
            for (let iteration = 0; iteration < 20; iteration++) {
                app.render({ parts: ['sidebar'] });
            }
            await waitFor(() => renderHookCalls >= 20);
            await waitFor(() => getCards().length === 1);
            const partial = {
                hookCalls: renderHookCalls,
                sameTopSection: getTopSection() === initialTopSection,
                cardReplaced: getCards()[0] !== initialCard,
                ...summarizeCard()
            };

            const topBeforeReplacement = getTopSection();
            app.render({ parts: ['spells'] });
            await waitFor(() => getTopSection() !== topBeforeReplacement && getCards().length === 1);
            const replacement = {
                topSectionReplaced: getTopSection() !== topBeforeReplacement,
                ...summarizeCard()
            };

            await actor.update({ 'system.abilities.int.value': 20 });
            await waitFor(() => summarizeCard().ability === '+5');
            const currentValues = summarizeCard();

            const nativeCard = document.createElement('div');
            nativeCard.className = 'spellcasting card';
            nativeCard.dataset.ability = 'int';
            nativeCard.innerHTML = '<button type="button" data-action="spellcasting">Native</button>';
            getTopSection().prepend(nativeCard);
            const nativeButton = nativeCard.querySelector('button');

            renderHookCalls = 0;
            for (let iteration = 0; iteration < 20; iteration++) {
                app.render({ parts: ['sidebar'] });
            }
            await waitFor(() => renderHookCalls >= 20);
            await waitFor(() => getCards().length === 1);

            nativeButton.click();
            await delay(200);
            const updatesAfterNativeClick = spellcastingUpdates;

            getCards()[0].querySelector('button[data-action="spellcasting"]').click();
            await waitFor(() => actor.system.attributes.spellcasting === 'int');
            await waitFor(() => summarizeCard().primary === 'true');
            const listener = {
                updatesAfterNativeClick,
                updatesAfterModuleClick: spellcastingUpdates,
                actorSpellcasting: actor.system.attributes.spellcasting,
                moduleCardCount: getCards().length,
                primary: summarizeCard().primary
            };

            const topBeforeFullRender = getTopSection();
            app.render({ force: true });
            await waitFor(() => getTopSection() !== topBeforeFullRender && getCards().length === 1);
            const fullRender = {
                topSectionReplaced: getTopSection() !== topBeforeFullRender,
                ...summarizeCard()
            };

            const classItem = actor.items.get(classItemId);
            if (actorType === 'character') {
                await actor.deleteEmbeddedDocuments('Item', [classItemId]);
            } else {
                const advancements = classItem.toObject().system.advancement.filter(
                    advancement => advancement.title !== 'Power Limit'
                );
                await classItem.update({ 'system.advancement': advancements });
            }
            app.render({ parts: ['inventory'] });
            await waitFor(() => getCards().length === 0);

            return {
                initial,
                partial,
                replacement,
                currentValues,
                listener,
                fullRender,
                cardCountAfterEligibilityRemoval: getCards().length
            };
        } finally {
            Hooks.off(renderHook, renderHookId);
            Hooks.off('preUpdateActor', updateHookId);
            await app.close();
            await actor.delete();
        }
    }, {
        actorId: fixture.actorId,
        classItemId: fixture.classItemId,
        actorType: type,
        cardSelector: CARD_SELECTOR
    });
}

async function validateNonPsionicControl(page) {
    return page.evaluate(async cardSelector => {
        const actor = await Actor.create({
            name: 'Playwright F-09 Non-Psionic Control',
            type: 'character'
        });
        const app = actor.sheet;
        const delay = ms => new Promise(resolve => {
            setTimeout(resolve, ms);
        });

        try {
            app.render({ force: true, mode: app.constructor.MODES.EDIT });
            await delay(800);
            return app.element?.querySelectorAll(cardSelector).length ?? 0;
        } finally {
            await app.close();
            await actor.delete();
        }
    }, CARD_SELECTOR);
}

test.describe('Psionicist manifesting card', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page, 'Gamemaster');
    });

    test('reconciles one current card on character and NPC sheets', async ({ page }) => {
        const results = {};
        for (const type of ['character', 'npc']) {
            const fixture = await createPsionicActor(page, type);
            results[type] = await validatePsionicActor(page, fixture, type);
        }

        for (const result of Object.values(results)) {
            expect(result.initial).toEqual({
                directTopSections: 1,
                obsoleteSelectorMatches: 0,
                cardCount: 1,
                ability: '+4',
                attack: '+6',
                save: '14',
                limit: '2',
                primary: 'false'
            });
            expect(result.partial.hookCalls).toBeGreaterThanOrEqual(20);
            expect(result.partial).toEqual({
                hookCalls: expect.any(Number),
                sameTopSection: true,
                cardReplaced: true,
                cardCount: 1,
                ability: '+4',
                attack: '+6',
                save: '14',
                limit: '2',
                primary: 'false'
            });
            expect(result.replacement).toEqual({
                topSectionReplaced: true,
                cardCount: 1,
                ability: '+4',
                attack: '+6',
                save: '14',
                limit: '2',
                primary: 'false'
            });
            expect(result.currentValues).toEqual({
                cardCount: 1,
                ability: '+5',
                attack: '+7',
                save: '15',
                limit: '2',
                primary: 'false'
            });
            expect(result.listener).toEqual({
                updatesAfterNativeClick: 0,
                updatesAfterModuleClick: 1,
                actorSpellcasting: 'int',
                moduleCardCount: 1,
                primary: 'true'
            });
            expect(result.fullRender).toEqual({
                topSectionReplaced: true,
                cardCount: 1,
                ability: '+5',
                attack: '+7',
                save: '15',
                limit: '2',
                primary: 'true'
            });
            expect(result.cardCountAfterEligibilityRemoval).toBe(0);
        }

        expect(await validateNonPsionicControl(page)).toBe(0);
    });

    test('allows a Player2 owner to update primary spellcasting once', async ({ page }) => {
        const fixture = await createPsionicActor(page, 'character', 'Player2');
        let result;

        try {
            await page.goto('/join');
            await loginUser(page, 'Player2');
            result = await page.evaluate(async ({ actorId, cardSelector }) => {
                const actor = game.actors.get(actorId);
                const app = actor.sheet;
                const delay = ms => new Promise(resolve => {
                    setTimeout(resolve, ms);
                });
                const waitFor = async predicate => {
                    for (let attempt = 0; attempt < 50; attempt++) {
                        if (predicate()) {
                            return;
                        }
                        await delay(100);
                    }
                    throw new Error('Timed out waiting for Player2 manifesting card state');
                };
                let spellcastingUpdates = 0;
                const updateHookId = Hooks.on('preUpdateActor', (updatedActor, changes) => {
                    if (updatedActor === actor && foundry.utils.hasProperty(changes, 'system.attributes.spellcasting')) {
                        spellcastingUpdates++;
                    }
                });

                try {
                    app.render({ force: true, mode: app.constructor.MODES.EDIT });
                    await waitFor(() => app.element?.querySelectorAll(cardSelector).length === 1);
                    const card = app.element.querySelector(cardSelector);
                    card.querySelector('button[data-action="spellcasting"]').click();
                    await waitFor(() => actor.system.attributes.spellcasting === 'int');

                    return {
                        actorIsOwner: actor.isOwner,
                        cardCount: app.element.querySelectorAll(cardSelector).length,
                        spellcastingUpdates,
                        actorSpellcasting: actor.system.attributes.spellcasting
                    };
                } finally {
                    Hooks.off('preUpdateActor', updateHookId);
                    await app.close();
                }
            }, { actorId: fixture.actorId, cardSelector: CARD_SELECTOR });
        } finally {
            await page.goto('/join');
            await loginUser(page, 'Gamemaster');
            await page.evaluate(async actorId => {
                await game.actors.get(actorId)?.delete();
            }, fixture.actorId);
        }

        expect(result).toEqual({
            actorIsOwner: true,
            cardCount: 1,
            spellcastingUpdates: 1,
            actorSpellcasting: 'int'
        });
    });
});

async function createDisciplineActor(page, type, ownerName = null) {
    return page.evaluate(async ({actorType, actorOwnerName}) => {
        const source = {
            name: `Playwright F-10 ${actorType}`,
            type: actorType
        };
        if (actorOwnerName) {
            const owner = game.users.getName(actorOwnerName);
            source.ownership = {
                default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
                [owner.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
            };
        }

        const actor = await Actor.create(source);
        const [discipline, unrelated] = await actor.createEmbeddedDocuments('Item', [
            {
                name: 'Playwright F-10 Discipline',
                type: 'feat',
                system: {type: {value: 'discipline', subtype: 'awa'}}
            },
            {
                name: 'Playwright F-10 Unrelated Feature',
                type: 'feat',
                system: {type: {value: 'feat', subtype: ''}}
            }
        ]);

        return {
            actorId: actor.id,
            disciplineId: discipline.id,
            unrelatedId: unrelated.id
        };
    }, {actorType: type, actorOwnerName: ownerName});
}

async function validateDisciplineSection(page, fixture) {
    return page.evaluate(async ({actorId, disciplineId, unrelatedId, sectionSelector}) => {
        const actor = game.actors.get(actorId);
        const app = actor.sheet;
        const renderHook = 'renderCharacterActorSheet';
        const delay = ms => new Promise(resolve => {
            setTimeout(resolve, ms);
        });
        const waitFor = async predicate => {
            for (let attempt = 0; attempt < 50; attempt++) {
                if (predicate()) {
                    return;
                }
                await delay(100);
            }
            throw new Error('Timed out waiting for the Psionic Disciplines section');
        };
        const getFeaturesPart = () => app.element?.querySelector('[data-application-part="features"]');
        const getSections = () => Array.from(app.element?.querySelectorAll(sectionSelector) ?? []);
        const getDisciplineRows = () => Array.from(
            app.element?.querySelectorAll(`[data-item-id="${disciplineId}"]`) ?? []
        );
        const getUnrelatedRows = () => Array.from(
            app.element?.querySelectorAll(`[data-item-id="${unrelatedId}"]`) ?? []
        );
        const summarize = () => {
            const sections = getSections();
            const disciplineRows = getDisciplineRows();
            const unrelatedRows = getUnrelatedRows();
            return {
                sectionCount: sections.length,
                featuresSectionCount: sections.filter(section => section.closest(
                    '[data-application-part="features"]'
                )).length,
                effectsSectionCount: sections.filter(section => section.closest(
                    '[data-application-part="effects"]'
                )).length,
                disciplineRowCount: disciplineRows.length,
                disciplineRowsInFeatures: disciplineRows.filter(row => row.closest(
                    '[data-application-part="features"]'
                )).length,
                disciplineRowsInEffects: disciplineRows.filter(row => row.closest(
                    '[data-application-part="effects"]'
                )).length,
                unrelatedRowCount: unrelatedRows.length,
                unrelatedRowsInOther: unrelatedRows.filter(row => row.closest(
                    '.items-section[data-group-origin="other"]'
                )).length,
                subtitle: disciplineRows[0]?.querySelector('.subtitle')?.textContent.trim()
            };
        };

        try {
            app.render({force: true, mode: app.constructor.MODES.EDIT});
            await waitFor(() => getSections().length === 1);
            await delay(300);

            const initial = summarize();
            const initialFeaturesPart = getFeaturesPart();
            const initialSection = getSections()[0];
            const initialRow = getDisciplineRows()[0];
            const initialControl = initialRow.querySelector('[data-action]');
            const initialOtherSection = getUnrelatedRows()[0].closest('.items-section');

            for (let iteration = 0; iteration < 20; iteration++) {
                Hooks.callAll(renderHook, app, app.element, {actor}, {});
            }
            const repeated = {
                ...summarize(),
                sameFeaturesPart: getFeaturesPart() === initialFeaturesPart,
                sameSection: getSections()[0] === initialSection,
                sameRow: getDisciplineRows()[0] === initialRow,
                sameControl: getDisciplineRows()[0].querySelector('[data-action]') === initialControl,
                sameOtherSection: getUnrelatedRows()[0].closest('.items-section') === initialOtherSection
            };

            app.render({parts: ['sidebar']});
            await delay(300);
            const featuresPartSurvived = getFeaturesPart() === initialFeaturesPart;
            const partial = {
                ...summarize(),
                rowPreservedWhenFeaturesPartSurvived: !featuresPartSurvived
                    || getDisciplineRows()[0] === initialRow
            };

            const featuresBeforeReplacement = getFeaturesPart();
            app.render({parts: ['features']});
            await waitFor(() => getFeaturesPart() !== featuresBeforeReplacement && getSections().length === 1);
            const replacement = {
                ...summarize(),
                featuresPartReplaced: getFeaturesPart() !== featuresBeforeReplacement
            };

            const canonicalSection = getSections()[0];
            const duplicateSection = canonicalSection.cloneNode(true);
            canonicalSection.parentElement.append(duplicateSection);
            const duplicateRow = getDisciplineRows()[0].cloneNode(true);
            getUnrelatedRows()[0].closest('.items-section').querySelector('.item-list').append(duplicateRow);
            Hooks.callAll(renderHook, app, app.element, {actor}, {});
            const consolidated = summarize();

            const discipline = actor.items.get(disciplineId);
            await discipline.update({
                'system.type.value': 'feat',
                'system.type.subtype': ''
            }, {render: false});
            Hooks.callAll(renderHook, app, app.element, {actor}, {});
            const removed = summarize();

            await discipline.update({
                'system.type.value': 'discipline',
                'system.type.subtype': 'awa'
            }, {render: false});
            Hooks.callAll(renderHook, app, app.element, {actor}, {});
            const restored = summarize();

            return {initial, repeated, partial, replacement, consolidated, removed, restored};
        } finally {
            await app.close();
            await actor.delete();
        }
    }, {...fixture, sectionSelector: DISCIPLINE_SECTION_SELECTOR});
}

async function validateDisciplineNpcControl(page, fixture) {
    return page.evaluate(async ({actorId, disciplineId, sectionSelector}) => {
        const actor = game.actors.get(actorId);
        const app = actor.sheet;

        try {
            app.render({force: true, mode: app.constructor.MODES.EDIT});
            await new Promise(resolve => {
                setTimeout(resolve, 500);
            });
            return {
                sectionCount: app.element?.querySelectorAll(sectionSelector).length ?? 0,
                disciplineRowCount: app.element?.querySelectorAll(
                    `[data-item-id="${disciplineId}"]`
                ).length ?? 0
            };
        } finally {
            await app.close();
            await actor.delete();
        }
    }, {...fixture, sectionSelector: DISCIPLINE_SECTION_SELECTOR});
}

test.describe('Psionic discipline section', () => {
    test.beforeEach(async ({page}) => {
        await loginUser(page, 'Gamemaster');
    });

    test.afterEach(async ({page}) => {
        const isGamemaster = await page.evaluate(() => game?.user?.isGM ?? false);
        if (!isGamemaster) {
            await page.goto('/join');
            await loginUser(page, 'Gamemaster');
        }
        await page.evaluate(async () => {
            const actors = game.actors.filter(actor => actor.name.startsWith('Playwright F-10 '));
            for (const actor of actors) {
                await actor.delete();
            }
        });
    });

    test('reconciles one Features section while leaving NPC sheets unchanged', async ({page}) => {
        const character = await validateDisciplineSection(page, await createDisciplineActor(page, 'character'));
        const stable = {
            sectionCount: 1,
            featuresSectionCount: 1,
            effectsSectionCount: 0,
            disciplineRowCount: 1,
            disciplineRowsInFeatures: 1,
            disciplineRowsInEffects: 0,
            unrelatedRowCount: 1,
            unrelatedRowsInOther: 1,
            subtitle: 'Awakened'
        };

        expect(character.initial).toEqual(stable);
        expect(character.repeated).toEqual({
            ...stable,
            sameFeaturesPart: true,
            sameSection: true,
            sameRow: true,
            sameControl: true,
            sameOtherSection: true
        });
        expect(character.partial).toEqual({...stable, rowPreservedWhenFeaturesPartSurvived: true});
        expect(character.replacement).toEqual({...stable, featuresPartReplaced: true});
        expect(character.consolidated).toEqual(stable);
        expect(character.removed).toEqual({
            ...stable,
            sectionCount: 0,
            featuresSectionCount: 0,
            disciplineRowCount: 1,
            subtitle: 'Awakened'
        });
        expect(character.restored).toEqual(stable);

        const npcFixture = await createDisciplineActor(page, 'npc');
        expect(await validateDisciplineNpcControl(page, npcFixture)).toEqual({
            sectionCount: 0,
            disciplineRowCount: 1
        });
    });

    test('shows the section and owner controls to Player2', async ({page}) => {
        const fixture = await createDisciplineActor(page, 'character', 'Player2');
        let result;

        try {
            await page.goto('/join');
            await loginUser(page, 'Player2');
            result = await page.evaluate(async ({actorId, disciplineId, sectionSelector}) => {
                const actor = game.actors.get(actorId);
                const app = actor.sheet;
                const delay = ms => new Promise(resolve => {
                    setTimeout(resolve, ms);
                });
                const waitFor = async predicate => {
                    for (let attempt = 0; attempt < 50; attempt++) {
                        if (predicate()) {
                            return;
                        }
                        await delay(100);
                    }
                    throw new Error('Timed out waiting for Player2 discipline section state');
                };

                try {
                    app.render({force: true, mode: app.constructor.MODES.EDIT});
                    await waitFor(() => app.element?.querySelectorAll(sectionSelector).length === 1);
                    for (let iteration = 0; iteration < 20; iteration++) {
                        Hooks.callAll('renderCharacterActorSheet', app, app.element, {actor}, {});
                    }
                    const row = app.element.querySelector(`[data-item-id="${disciplineId}"]`);
                    return {
                        actorIsOwner: actor.isOwner,
                        sectionCount: app.element.querySelectorAll(sectionSelector).length,
                        disciplineRowCount: app.element.querySelectorAll(
                            `[data-item-id="${disciplineId}"]`
                        ).length,
                        sectionInFeatures: Boolean(app.element.querySelector(
                            `[data-application-part="features"] ${sectionSelector}`
                        )),
                        sectionInEffects: Boolean(app.element.querySelector(
                            `[data-application-part="effects"] ${sectionSelector}`
                        )),
                        enabledControls: Array.from(row.querySelectorAll('[data-action]')).filter(
                            control => !control.disabled
                        ).length
                    };
                } finally {
                    await app.close();
                }
            }, {...fixture, sectionSelector: DISCIPLINE_SECTION_SELECTOR});
        } finally {
            await page.goto('/join');
            await loginUser(page, 'Gamemaster');
            await page.evaluate(async actorId => {
                await game.actors.get(actorId)?.delete();
            }, fixture.actorId);
        }

        expect(result).toEqual({
            actorIsOwner: true,
            sectionCount: 1,
            disciplineRowCount: 1,
            sectionInFeatures: true,
            sectionInEffects: false,
            enabledControls: expect.any(Number)
        });
        expect(result.enabledControls).toBeGreaterThan(0);
    });
});

async function createSubtitleActor(page, type, ownerName = null) {
    return page.evaluate(async ({
        actorType,
        actorOwnerName,
        classId,
        classesPack,
        powerPointsId,
        psionicPowerId,
        psionicsPack
    }) => {
        const actorSource = {
            name: `Playwright F-11 ${actorType}`,
            type: actorType,
            system: {
                abilities: {
                    int: {value: 18}
                }
            }
        };
        if (actorOwnerName) {
            const owner = game.users.getName(actorOwnerName);
            actorSource.ownership = {
                default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
                [owner.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
            };
        }

        const actor = await Actor.create(actorSource);
        const psionicistSource = (await game.packs.get(classesPack).getDocument(classId)).toObject();
        delete psionicistSource._id;
        psionicistSource.system.levels = 5;
        psionicistSource.system.advancement = psionicistSource.system.advancement.filter(
            advancement => advancement.type === 'ScaleValue'
        );
        await actor.createEmbeddedDocuments('Item', [psionicistSource]);

        const powerPointsSource = (await game.packs.get(classesPack).getDocument(powerPointsId)).toObject();
        delete powerPointsSource._id;
        powerPointsSource.name = `Playwright F-11 ${actorType} Power Points`;
        powerPointsSource.system.uses.max = '20';
        const [powerPoints] = await actor.createEmbeddedDocuments('Item', [powerPointsSource]);

        const psionicSource = (await game.packs.get(psionicsPack).getDocument(psionicPowerId)).toObject();
        delete psionicSource._id;
        psionicSource.name = `Playwright F-11 ${actorType} Psionic Power`;
        const firstActivity = Object.values(psionicSource.system.activities)[0];
        firstActivity.name = 'Two Power Points';
        firstActivity.consumption.targets[0].target = powerPoints.id;
        firstActivity.consumption.targets[0].value = '2';
        const secondActivity = foundry.utils.deepClone(firstActivity);
        secondActivity._id = foundry.utils.randomID();
        secondActivity.name = 'Four Power Points';
        secondActivity.consumption.targets[0].value = '4';
        psionicSource.system.activities[secondActivity._id] = secondActivity;
        const [psionicPower] = await actor.createEmbeddedDocuments('Item', [psionicSource]);

        const highCostSource = foundry.utils.deepClone(psionicSource);
        delete highCostSource._id;
        highCostSource.name = `Playwright F-11 ${actorType} Above Limit`;
        for (const activity of Object.values(highCostSource.system.activities)) {
            activity.consumption.targets[0].value = '6';
        }
        const [highCostPower] = await actor.createEmbeddedDocuments('Item', [highCostSource]);

        const ordinarySource = foundry.utils.deepClone(psionicSource);
        delete ordinarySource._id;
        ordinarySource.name = `Playwright F-11 ${actorType} Ordinary Spell`;
        ordinarySource.system.level = 1;
        ordinarySource.system.method = 'spell';
        ordinarySource.system.school = 'abj';
        const [ordinarySpell] = await actor.createEmbeddedDocuments('Item', [ordinarySource]);

        return {
            actorId: actor.id,
            psionicPowerId: psionicPower.id,
            highCostPowerId: highCostPower.id,
            ordinarySpellId: ordinarySpell.id
        };
    }, {
        actorType: type,
        actorOwnerName: ownerName,
        classId: CLASS_ID,
        classesPack: CLASSES_PACK,
        powerPointsId: POWER_POINTS_ID,
        psionicPowerId: PSIONIC_POWER_ID,
        psionicsPack: PSIONICS_PACK
    });
}

async function validateSubtitleActor(page, fixture, type) {
    return page.evaluate(async ({
        actorId,
        psionicPowerId,
        highCostPowerId,
        ordinarySpellId,
        actorType,
        costSelector
    }) => {
        const actor = game.actors.get(actorId);
        const app = actor.sheet;
        const renderHook = `render${actorType === 'character' ? 'Character' : 'NPC'}ActorSheet`;
        const delay = ms => new Promise(resolve => {
            setTimeout(resolve, ms);
        });
        const getRow = itemId => app.element?.querySelector(`[data-item-id="${itemId}"]`);
        const getSubtitle = () => getRow(psionicPowerId)?.querySelector(
            '.item-row > .item-name .name-stacked .subtitle'
        );
        const waitFor = async predicate => {
            for (let attempt = 0; attempt < 50; attempt++) {
                if (predicate()) {
                    return;
                }
                await delay(100);
            }
            throw new Error(`Timed out waiting for ${actorType} subtitle state`);
        };
        const summarize = () => {
            const row = getRow(psionicPowerId);
            const subtitle = getSubtitle();
            const annotations = Array.from(subtitle?.querySelectorAll(costSelector) ?? []);
            const baseSubtitle = subtitle?.cloneNode(true);
            baseSubtitle?.querySelectorAll(costSelector).forEach(annotation => annotation.remove());
            return {
                rowCount: app.element?.querySelectorAll(`[data-item-id="${psionicPowerId}"]`).length ?? 0,
                annotationCount: annotations.length,
                annotation: annotations[0]?.textContent.trim(),
                subtitle: subtitle?.textContent.trim(),
                baseSubtitle: baseSubtitle?.textContent.trim(),
                rowHasLegacyLevel: row?.hasAttribute('data-item-level') ?? false,
                sectionMethod: row?.closest('[data-method]')?.dataset.method,
                sectionLevel: row?.closest('[data-level]')?.dataset.level
            };
        };

        try {
            app.render({force: true, mode: app.constructor.MODES.EDIT});
            await waitFor(() => getRow(psionicPowerId));
            await delay(300);

            const registration = {
                hasGetLabel: typeof CONFIG.DND5E.spellcasting.psionic?.getLabel === 'function',
                label: CONFIG.DND5E.spellcasting.psionic?.getLabel?.()
            };
            const initial = summarize();
            const initialRow = getRow(psionicPowerId);
            const initialOrdinaryHtml = getRow(ordinarySpellId).outerHTML;

            for (let iteration = 0; iteration < 20; iteration++) {
                Hooks.callAll(renderHook, app, app.element, {actor}, {});
            }
            const repeated = {
                ...summarize(),
                sameRow: getRow(psionicPowerId) === initialRow,
                ordinaryUnchanged: getRow(ordinarySpellId).outerHTML === initialOrdinaryHtml
            };

            const psionicPower = actor.items.get(psionicPowerId);
            const changedActivities = psionicPower.toObject().system.activities;
            const changedCosts = ['3', '5'];
            Object.values(changedActivities).forEach((activity, index) => {
                activity.consumption.targets[0].value = changedCosts[index];
            });
            await psionicPower.update({'system.activities': changedActivities}, {render: false});
            Hooks.callAll(renderHook, app, app.element, {actor}, {});
            const changed = summarize();

            const noCostActivities = psionicPower.toObject().system.activities;
            for (const activity of Object.values(noCostActivities)) {
                activity.consumption.targets = [];
            }
            await psionicPower.update({'system.activities': noCostActivities}, {render: false});
            Hooks.callAll(renderHook, app, app.element, {actor}, {});
            const removed = summarize();

            const restoredActivities = psionicPower.toObject().system.activities;
            const restoredCosts = ['2', '4'];
            Object.values(restoredActivities).forEach((activity, index) => {
                activity.consumption.targets = [{
                    type: 'itemUses',
                    value: restoredCosts[index],
                    target: actor.items.find(item => item.system.identifier === 'spell-points').id,
                    scaling: {mode: ''}
                }];
            });
            await psionicPower.update({'system.activities': restoredActivities}, {render: false});
            Hooks.callAll(renderHook, app, app.element, {actor}, {});
            const restored = summarize();

            const rowBeforeFullRender = getRow(psionicPowerId);
            app.render({force: true});
            await waitFor(() => getRow(psionicPowerId) && getRow(psionicPowerId) !== rowBeforeFullRender);
            const fullRender = {
                ...summarize(),
                rowReplaced: getRow(psionicPowerId) !== rowBeforeFullRender
            };

            const rowBeforeSpellsRender = getRow(psionicPowerId);
            app.render({parts: ['spells']});
            await waitFor(() => getRow(psionicPowerId) && getRow(psionicPowerId) !== rowBeforeSpellsRender);
            const spellsRender = {
                ...summarize(),
                rowReplaced: getRow(psionicPowerId) !== rowBeforeSpellsRender
            };

            return {
                registration,
                initial,
                repeated,
                changed,
                removed,
                restored,
                fullRender,
                spellsRender,
                aboveLimitRowCount: app.element.querySelectorAll(
                    `[data-item-id="${highCostPowerId}"]`
                ).length
            };
        } finally {
            await app.close();
        }
    }, {...fixture, actorType: type, costSelector: PSIONIC_COST_SELECTOR});
}

function expectStableSubtitle(result) {
    expect(result.rowCount).toBe(1);
    expect(result.annotationCount).toBe(1);
    expect(result.annotation).toBe('• 2-4 Power Points');
    expect(result.subtitle).toBe('Action • 2-4 Power Points');
    expect(result.baseSubtitle).toBe('Action');
    expect(result.rowHasLegacyLevel).toBe(false);
    expect(result.sectionMethod).toBe('psionic');
    expect(result.sectionLevel).toBe('1');
}

test.describe('Psionic spell subtitles', () => {
    test.beforeEach(async ({page}) => {
        await loginUser(page, 'Gamemaster');
    });

    test.afterEach(async ({page}) => {
        const isGamemaster = await page.evaluate(() => game?.user?.isGM ?? false);
        if (!isGamemaster) {
            await page.goto('/join');
            await loginUser(page, 'Gamemaster');
        }
        await page.evaluate(async () => {
            const actors = game.actors.filter(actor => actor.name.startsWith('Playwright F-11 '));
            for (const actor of actors) {
                await actor.delete();
            }
        });
    });

    test('reconciles current character and NPC spellbook rows', async ({page}) => {
        for (const type of ['character', 'npc']) {
            const result = await validateSubtitleActor(page, await createSubtitleActor(page, type), type);

            expect(result.registration).toEqual({hasGetLabel: true, label: 'Psionic'});
            expectStableSubtitle(result.initial);
            expectStableSubtitle(result.repeated);
            expect(result.repeated.sameRow).toBe(true);
            expect(result.repeated.ordinaryUnchanged).toBe(true);
            expect(result.changed).toEqual({
                ...result.initial,
                annotation: '• 3-5 Power Points',
                subtitle: 'Action • 3-5 Power Points'
            });
            expect(result.removed).toEqual({
                ...result.initial,
                annotationCount: 0,
                annotation: undefined,
                subtitle: 'Action'
            });
            expectStableSubtitle(result.restored);
            expectStableSubtitle(result.fullRender);
            expect(result.fullRender.rowReplaced).toBe(true);
            expectStableSubtitle(result.spellsRender);
            expect(result.spellsRender.rowReplaced).toBe(true);
            expect(result.aboveLimitRowCount).toBe(0);
        }
    });

    test('shows one current annotation to Player2 owners', async ({page}) => {
        const fixtures = [];
        for (const type of ['character', 'npc']) {
            fixtures.push({type, fixture: await createSubtitleActor(page, type, 'Player2')});
        }

        await page.goto('/join');
        await loginUser(page, 'Player2');
        const results = [];
        for (const {fixture} of fixtures) {
            results.push(await page.evaluate(async ({actorId, psionicPowerId, highCostPowerId, costSelector}) => {
                const actor = game.actors.get(actorId);
                const app = actor.sheet;
                const delay = ms => new Promise(resolve => {
                    setTimeout(resolve, ms);
                });
                const getRow = itemId => app.element?.querySelector(`[data-item-id="${itemId}"]`);

                try {
                    app.render({force: true, mode: app.constructor.MODES.EDIT});
                    for (let attempt = 0; attempt < 50 && !getRow(psionicPowerId); attempt++) {
                        await delay(100);
                    }
                    const row = getRow(psionicPowerId);
                    return {
                        actorIsOwner: actor.isOwner,
                        annotationCount: row?.querySelectorAll(costSelector).length ?? 0,
                        annotation: row?.querySelector(costSelector)?.textContent.trim(),
                        aboveLimitRowCount: app.element?.querySelectorAll(
                            `[data-item-id="${highCostPowerId}"]`
                        ).length ?? 0
                    };
                } finally {
                    await app.close();
                }
            }, {...fixture, costSelector: PSIONIC_COST_SELECTOR}));
        }

        for (const result of results) {
            expect(result).toEqual({
                actorIsOwner: true,
                annotationCount: 1,
                annotation: '• 2-4 Power Points',
                aboveLimitRowCount: 0
            });
        }
    });
});
