import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';

/**
 * Rest Enhancements Feature
 * Provides enhanced rest mechanics and recovery
 */

import { registerRestEnhancementsSettings } from './settings';
import { handleShortRest } from './short-rest';
import { registerRestEnhancementsTests } from './quench';

export function registerRestEnhancementsFeature() {
    logger.info('Registering Rest Enhancements');

    registerRestEnhancementsSettings();

    // Register Quench tests if Quench module is available
    if (game.modules.get('quench')?.active) {
        registerRestEnhancementsTests();
    }

    Hooks.on('dnd5e.shortRest', async (actor, data) => {
        if (game.settings.get(module_id, 'rest-enhancements')) {
            await handleShortRest(actor, data);
        }
    });
}
