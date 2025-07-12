/**
 * Net Worth Calculator Feature
 * Calculates and displays actor wealth and item values
 */

import { calculateNetWorth } from './calculator';
import { registerNetworthHooks } from './ui';

export function registerNetworthFeature() {
    console.log('SoSly 5e House Rules | Registering Net Worth Calculator');
    
    registerNetworthHooks();
    
    // Return calculator function for use in actor mixin
    return {
        calculateNetWorth
    };
}