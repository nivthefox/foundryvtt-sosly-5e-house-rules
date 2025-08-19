import {logger} from '../../utils/logger';

/**
 * Combat Recovery Enhancements
 * Handles NPC resource recovery during combat
 */

/**
 * Handle combat recovery for NPCs
 * @param {Combatant} combatant - The combatant in combat
 * @param {string[]} recoveries - Array of recovery types
 */
export async function handleCombatRecovery(combatant, recoveries) {
    if (!recoveries.includes('turnStart')) {
        return;
    }

    const actor = game.actors.get(combatant.actorId);
    if (!actor || actor.type !== 'npc') {
        return;
    }

    if (actor.system?.resources?.legact?.max < 1) {
        return;
    }

    const legact = actor.system.resources.legact;
    if (legact.value < legact.max) {
        await actor.update({'system.resources.legact.value': legact.max});
        logger.info(`NPC ${actor.name} is recovering resources at the start of their turn`);
    }
}
