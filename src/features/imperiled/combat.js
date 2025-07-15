/**
 * Imperiled Combat Management
 * Handles imperiled condition during combat turns
 */

import { showImperiledDialog, applyUnconscious, createImperiledChatMessage } from './ui';

/**
 * Handle imperiled condition when combat turn changes
 * @param {Combat} combat - The combat instance
 * @param {object} previous - Previous turn data
 * @param {object} next - Next turn data
 */
export async function handleImperiled(combat, previous, next) {
    if (previous === null) {
        return;
    }

    const actorId = combat.combatants.get(previous.combatantId).actorId;
    const actor = game.actors.get(actorId);

    const exhaustion = actor.system.attributes.exhaustion;
    const existing = actor.effects.get(dnd5e.utils.staticID('dnd5eimperiled'));

    if (!existing) {
        return;
    }

    if (exhaustion >= 5) {
        await applyUnconscious(actor, existing);
        return;
    }

    const confirmation = await showImperiledDialog(exhaustion);

    if (!confirmation) {
        await applyUnconscious(actor, existing);
        return;
    }

    await actor.update({ 'system.attributes.exhaustion': exhaustion + 1 });
    await createImperiledChatMessage(actor, `${actor.name} has gained a level of Exhaustion to remain conscious!`);
}
