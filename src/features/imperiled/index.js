import {id as module_id} from '../../../module.json';

/**
 * Imperiled Condition Feature
 * Manages the Imperiled condition and related mechanics
 */

import { registerImperiledSettings } from './settings';
import { registerImperiledConditions } from './conditions';
import { handleImperiled } from './combat';
import { handleImperiledUpdate } from './actor-updates';
import { registerImperiledTests } from './quench';

export function registerImperiledFeature() {
    console.log('SoSly 5e House Rules | Registering Imperiled Condition');

    registerImperiledSettings();
    registerImperiledConditions();

    // Register Quench tests if Quench module is available
    if (game.modules.get('quench')?.active) {
        registerImperiledTests();
    }

    Hooks.on('combatTurnChange', async (combat, previous, next) => {
        if (game.settings.get(module_id, 'imperiled')) {
            await handleImperiled(combat, previous, next);
        }
    });

    Hooks.on('preUpdateActor', async (actor, changed, options, userId) => {
        if (game.settings.get(module_id, 'imperiled')) {
            await handleImperiledUpdate(actor, changed, options, userId);
        }
    });
}
