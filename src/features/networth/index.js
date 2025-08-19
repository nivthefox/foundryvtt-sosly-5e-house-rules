import {logger} from '../../utils/logger';

/**
 * Net Worth Calculator Feature
 * Calculates and displays actor wealth and item values
 */

import { calculateNetWorth } from './calculator';
import { registerNetworthHooks } from './ui';
import { registerNetworthTests } from './quench';

export function registerNetworthFeature() {
    logger.info('Registering Net Worth Calculator');

    registerNetworthHooks();

    // Register Quench tests if Quench module is available
    if (game.modules.get('quench')?.active) {
        registerNetworthTests();
    }

    // Return calculator function for use in actor mixin
    return {
        calculateNetWorth
    };
}
