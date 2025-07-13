/**
 * Encumbrance System Feature
 * Provides enhanced encumbrance calculations for actors using libWrapper
 */

import { prepareEncumbrance } from './encumbrance.js';
import { registerEncumbranceHooks } from './hooks.js';

export function registerEncumbranceFeature() {
    console.log('SoSly 5e House Rules | Registering Encumbrance System (libWrapper)');

    registerEncumbranceHooks();

    // Use libWrapper to wrap the prepareDerivedData method
    libWrapper.register('sosly-5e-house-rules', 'CONFIG.Actor.documentClass.prototype.prepareDerivedData', function(wrapped, ...args) {
        // Call the original prepareDerivedData method
        const result = wrapped(...args);

        // Apply custom encumbrance calculations
        const rollData = this.system.parent.getRollData({deterministic: true});
        prepareEncumbrance.call(this.system, rollData);

        return result;
    }, 'WRAPPER');
}