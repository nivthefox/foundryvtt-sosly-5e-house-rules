/**
 * Encumbrance System Feature
 * Provides enhanced encumbrance calculations for actors
 * NOTE: This feature requires mixin approach since prepareDerivedData is not a hook
 */

import { prepareEncumbrance } from './encumbrance';
import { registerEncumbranceHooks } from './hooks';

export function registerEncumbranceFeature() {
    console.log('SoSly 5e House Rules | Registering Encumbrance System (Mixin Required)');
    
    registerEncumbranceHooks();
    
    // Return the encumbrance function for use in actor mixin
    return {
        prepareEncumbrance
    };
}