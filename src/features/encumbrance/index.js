/**
 * Encumbrance System Feature
 * Provides enhanced encumbrance calculations for actors using libWrapper
 */

import { prepareEncumbrance } from './encumbrance.js';
import { registerEncumbranceHooks } from './hooks.js';

export function registerEncumbranceFeature() {
    console.log('SoSly 5e House Rules | Registering Encumbrance System (libWrapper)');

    registerEncumbranceHooks();

    // Use libWrapper to wrap the D&D 5e system's prepareEncumbrance method
    // This is more targeted than wrapping prepareDerivedData
    libWrapper.register('sosly-5e-house-rules', 'dnd5e.dataModels.actor.AttributesFields.prepareEncumbrance', function(wrapped, rollData, options = {}) {
        // Apply our custom encumbrance calculations instead of the system's
        prepareEncumbrance.call(this, rollData, options);
    }, 'OVERRIDE');
}
