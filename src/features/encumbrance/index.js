import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';

/**
 * Encumbrance System Feature
 * Provides enhanced encumbrance calculations for actors using libWrapper
 */

import { registerEncumbranceSettings } from './settings';
import { prepareEncumbrance } from './encumbrance.js';
import { registerEncumbranceHooks } from './hooks.js';
import { registerEncumbranceTests } from './quench';

export function registerEncumbranceFeature() {
    logger.info('Registering Encumbrance System (libWrapper)');

    registerEncumbranceSettings();

    // Register Quench tests if Quench module is available
    if (game.modules.get('quench')?.active) {
        registerEncumbranceTests();
    }

    if (game.settings.get(module_id, 'encumbrance')) {
        registerEncumbranceHooks();

        // Use libWrapper to wrap the D&D 5e system's prepareEncumbrance method
        // This is more targeted than wrapping prepareDerivedData
        libWrapper.register(module_id, 'dnd5e.dataModels.actor.AttributesFields.prepareEncumbrance', function(wrapped, rollData, options = {}) {
            // Apply our custom encumbrance calculations instead of the system's
            prepareEncumbrance.call(this, rollData, options);
        }, 'OVERRIDE');
    }
}
