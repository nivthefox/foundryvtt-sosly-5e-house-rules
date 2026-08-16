import {id as module_id} from '../../../module.json';
import { createMeter } from '../../components/meters/meter.js';

const BLOOD_VIAL_IDENTIFIER = 'blood-vial';
const BLOOD_METER_SELECTOR = '[data-sosly-meter="blood-pool"]';
const bloodRenderTokens = new WeakMap();

function removeBloodMeters(element) {
    for (const meter of element.querySelectorAll(BLOOD_METER_SELECTOR)) {
        meter.remove();
    }
}

function calculateBloodPool(actor) {
    const bloodVials = actor.items.filter(item => item.system.identifier === BLOOD_VIAL_IDENTIFIER);

    if (bloodVials.length === 0) {
        return null;
    }

    let totalMax = 0;
    let totalCurrent = 0;

    for (const vial of bloodVials) {
        const max = vial.system.uses?.max ?? 30;
        const spent = vial.system.uses?.spent ?? 0;

        totalMax += max;
        totalCurrent += (max - spent);
    }

    return {
        current: totalCurrent,
        max: totalMax
    };
}

async function distributeBloodAcrossVials(actor, newTotal) {
    const bloodVials = actor.items.filter(item => item.system.identifier === BLOOD_VIAL_IDENTIFIER);

    if (bloodVials.length === 0) {
        return;
    }

    const sortedVials = [...bloodVials].sort((a, b) => {
        const aMax = a.system.uses?.max ?? 30;
        const aSpent = a.system.uses?.spent ?? 0;
        const aRemaining = aMax - aSpent;

        const bMax = b.system.uses?.max ?? 30;
        const bSpent = b.system.uses?.spent ?? 0;
        const bRemaining = bMax - bSpent;

        return bRemaining - aRemaining;
    });

    const updates = [];
    let remaining = Math.max(0, newTotal);

    for (const vial of sortedVials) {
        const max = vial.system.uses?.max ?? 30;

        if (remaining >= max) {
            updates.push({
                _id: vial.id,
                'system.uses.spent': 0
            });
            remaining -= max;
        } else {
            const spent = max - remaining;
            updates.push({
                _id: vial.id,
                'system.uses.spent': spent
            });
            remaining = 0;
        }
    }

    if (updates.length > 0) {
        await actor.updateEmbeddedDocuments('Item', updates);
    }
}

async function createBloodMeter(app) {
    if (app.actor.isPolymorphed) {
        const originalActorId = app.actor.getFlag('dnd5e', 'originalActor');
        const originalActor = game.actors.get(originalActorId);

        if (!originalActor) {
            return null;
        }

        const bloodPool = calculateBloodPool(originalActor);
        if (!bloodPool) {
            return null;
        }

        const empoweredBlood = app.actor.getFlag(module_id, 'empoweredBlood') ?? bloodPool.current;

        return createMeter({
            label: game.i18n.localize('sosly.severedLandsBloodMagic.bloodPool'),
            valueNow: empoweredBlood,
            valueMax: bloodPool.max * 2,
            cssClass: 'blood-pool',
            editable: false,
            inlineEditable: true,
            document: app.actor,
            onUpdate: async newValue => {
                await app.actor.setFlag(module_id, 'empoweredBlood', newValue);
            }
        });
    }

    const bloodPool = calculateBloodPool(app.actor);
    if (!bloodPool) {
        return null;
    }

    return createMeter({
        label: game.i18n.localize('sosly.severedLandsBloodMagic.bloodPool'),
        valueNow: bloodPool.current,
        valueMax: bloodPool.max,
        cssClass: 'blood-pool',
        editable: false,
        inlineEditable: true,
        document: app.actor,
        onUpdate: async newValue => {
            await distributeBloodAcrossVials(app.actor, newValue);
        }
    });
}

async function addBloodTracking(app, element) {
    const renderToken = Symbol('blood-pool-render');
    bloodRenderTokens.set(app, renderToken);

    if (!game.settings.get(module_id, 'severed-lands-blood-magic')) {
        removeBloodMeters(element);
        return;
    }

    const statsContainer = element.querySelector('.dnd5e2.sheet.actor .sidebar .stats');
    if (!statsContainer) {
        return;
    }

    const meterResult = await createBloodMeter(app);

    if (bloodRenderTokens.get(app) !== renderToken) {
        return;
    }

    if (!game.settings.get(module_id, 'severed-lands-blood-magic') || !meterResult) {
        removeBloodMeters(element);
        return;
    }

    const currentStatsContainer = element.querySelector('.dnd5e2.sheet.actor .sidebar .stats');
    if (!currentStatsContainer) {
        return;
    }

    const meterElement = document.createElement('div');
    meterElement.innerHTML = meterResult.html;
    const meterGroup = meterElement.firstElementChild;

    meterGroup.setAttribute('data-sosly-meter', 'blood-pool');
    meterResult.setup(meterGroup);

    removeBloodMeters(element);
    currentStatsContainer.appendChild(meterGroup);
}

async function handleTransform(original, source, transformedData, settings, options) {
    if (!game.settings.get(module_id, 'severed-lands-blood-magic')) {
        return;
    }

    const bloodPool = calculateBloodPool(original);
    if (!bloodPool) {
        return;
    }

    foundry.utils.setProperty(transformedData, `flags.${module_id}.empoweredBlood`, bloodPool.current);
}

async function handleRevert(transformedActor, options) {
    if (!game.settings.get(module_id, 'severed-lands-blood-magic')) {
        return;
    }

    if (!transformedActor.isPolymorphed) {
        return;
    }

    const empoweredBlood = transformedActor.getFlag(module_id, 'empoweredBlood');
    if (empoweredBlood === undefined) {
        return;
    }

    const originalActorId = transformedActor.getFlag('dnd5e', 'originalActor');
    const originalActor = game.actors.get(originalActorId);

    if (!originalActor) {
        return;
    }

    const bloodPool = calculateBloodPool(originalActor);
    if (!bloodPool) {
        return;
    }

    const clampedBlood = Math.min(empoweredBlood, bloodPool.max);
    await distributeBloodAcrossVials(originalActor, clampedBlood);
}

export function registerBloodMagicHooks() {
    Hooks.on('renderCharacterActorSheet', async (app, element, context, options) => {
        await addBloodTracking(app, element);
    });

    Hooks.on('renderNPCActorSheet', async (app, element, context, options) => {
        await addBloodTracking(app, element);
    });

    Hooks.on('dnd5e.transformActorV2', handleTransform);
    Hooks.on('dnd5e.revertOriginalForm', handleRevert);
}
