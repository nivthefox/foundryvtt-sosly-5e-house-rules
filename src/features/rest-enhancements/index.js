/**
 * Rest Enhancements Feature
 * Provides enhanced rest mechanics and recovery
 */

import { handleShortRest } from './short-rest';
import { handleCombatRecovery } from './combat-recovery';

export function registerRestEnhancementsFeature() {
    console.log('SoSly 5e House Rules | Registering Rest Enhancements');
    
    Hooks.on('dnd5e.shortRest', async (actor, data) => {
        await handleShortRest(actor, data);
    });

    Hooks.on('dnd5e.combatRecovery', async (combatant, recoveries) => {
        await handleCombatRecovery(combatant, recoveries);
    });
}