import { calculateLongRestExhaustionReduction } from './calculations';

/**
 * Modify long rest config to use CON-based exhaustion recovery
 * @param {Actor} actor - The actor taking a long rest
 * @param {object} config - Rest configuration from dnd5e
 */
export function handlePreLongRest(actor, config) {
    if (actor.type === 'vehicle' || actor.type === 'npc') {
        return;
    }

    const conMod = actor.system.abilities.con?.mod ?? 0;
    const reduction = calculateLongRestExhaustionReduction(conMod);
    config.exhaustionDelta = -reduction;
}

/**
 * Grant Inspiration after long rest if actor doesn't have it
 * @param {Actor} actor - The actor that completed a long rest
 * @param {object} config - Rest configuration from dnd5e
 */
export async function handleLongRest(actor, config) {
    if (actor.type === 'vehicle' || actor.type === 'npc') {
        return;
    }

    if (!actor.system.attributes.inspiration) {
        await actor.update({ 'system.attributes.inspiration': true }, { isRest: true });
    }
}
