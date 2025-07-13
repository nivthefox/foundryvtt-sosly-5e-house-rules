/**
 * Rest Enhancements Feature
 * Provides enhanced rest mechanics and recovery
 */

import { registerRestEnhancementsSettings } from './settings';
import { handleShortRest } from './short-rest';
import { handleCombatRecovery } from './combat-recovery';

export function registerRestEnhancementsFeature() {
    console.log('SoSly 5e House Rules | Registering Rest Enhancements');

    registerRestEnhancementsSettings();

    Hooks.on('dnd5e.shortRest', async (actor, data) => {
        if (game.settings.get('sosly-5e-house-rules', 'rest-enhancements')) {
            await handleShortRest(actor, data);
        }
    });

    Hooks.on('dnd5e.combatRecovery', async (combatant, recoveries) => {
        if (game.settings.get('sosly-5e-house-rules', 'rest-enhancements')) {
            await handleCombatRecovery(combatant, recoveries);
        }
    });
}
