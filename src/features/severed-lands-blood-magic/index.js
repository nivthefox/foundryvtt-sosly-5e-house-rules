/**
 * Severed Lands Blood Magic Feature
 * Automates blood magic mechanics including madness saves, blood surge, and hungry magic
 */

import { registerSeveredLandsBloodMagicSettings } from './settings';
import { registerSpellHandler } from './spell-handler';
import { registerRecoveryHandler } from './recovery';
import { registerChatHandler } from './chat-handler';
import { handleMadnessCombatTurn } from './combat';

export function registerSeveredLandsBloodMagicFeature() {
    console.log('SoSly 5e House Rules | Registering Severed Lands Blood Magic');

    registerSeveredLandsBloodMagicSettings();
    registerSpellHandler();
    registerRecoveryHandler();
    registerChatHandler();

    // Register combat turn handler for madness save re-attempts
    Hooks.on('combatTurnChange', async (combat, previous, next) => {
        if (game.settings.get('sosly-5e-house-rules', 'severed-lands-blood-magic')
            && game.settings.get('sosly-5e-house-rules', 'madness')) {
            await handleMadnessCombatTurn(combat, previous, next);
        }
    });
}
