/**
 * Imperiled Condition Feature
 * Manages the Imperiled condition and related mechanics
 */

import { registerImperiledSettings } from './settings';
import { registerImperiledConditions } from './conditions';
import { handleImperiled } from './combat';
import { handleImperiledUpdate } from './actor-updates';

export function registerImperiledFeature() {
    console.log('SoSly 5e House Rules | Registering Imperiled Condition');

    registerImperiledSettings();
    registerImperiledConditions();

    Hooks.on('combatTurnChange', async (combat, previous, next) => {
        if (game.settings.get('sosly-5e-house-rules', 'imperiled')) {
            await handleImperiled(combat, previous, next);
        }
    });

    Hooks.on('preUpdateActor', async (actor, changed, options, userId) => {
        if (game.settings.get('sosly-5e-house-rules', 'imperiled')) {
            await handleImperiledUpdate(actor, changed, options, userId);
        }
    });
}
