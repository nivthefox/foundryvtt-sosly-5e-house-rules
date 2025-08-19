import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';

/**
 * Breather Rest System Feature
 * Provides short rest alternatives for recovery
 */

import {registerBreatherSettings} from './settings';
import {Breather} from './breather';
import {registerBreatherTests} from './quench';

export function registerBreatherFeature() {
    logger.info('Registering Breather Rest System');

    registerBreatherSettings();

    if (game.settings.get(module_id, 'breather')) {
        Breather.register();
    }

    // Register Quench tests if Quench module is available
    if (game.modules.get('quench')?.active) {
        registerBreatherTests();
    }
}
