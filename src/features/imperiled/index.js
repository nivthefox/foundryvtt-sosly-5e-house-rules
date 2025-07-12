/**
 * Imperiled Condition Feature
 * Manages the Imperiled condition and related mechanics
 */

import { registerImperiledConditions } from './conditions';
import { handleImperiled } from './combat';
import { handleImperiledUpdate } from './actor-updates';

export function registerImperiledFeature() {
    console.log('SoSly 5e House Rules | Registering Imperiled Condition');
    
    registerImperiledConditions();
    
    Hooks.on('combatTurnChange', async (combat, previous, next) => {
        await handleImperiled(combat, previous, next);
    });

    Hooks.on('preUpdateActor', async (actor, changed, options, userId) => {
        await handleImperiledUpdate(actor, changed, options, userId);
    });
}