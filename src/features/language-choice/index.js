import {logger} from '../../utils/logger';
import {id as module_id} from '../../../module.json';

/**
 * Language Choice Feature
 *
 * Allows GMs to select different language sets for their campaign world:
 * - D&D 5th Edition (Default) - Standard D&D 5e languages
 * - Dragonlance - Languages specific to the Dragonlance setting
 * - The Severed Lands - Languages for the custom Severed Lands setting
 *
 * The selected language set replaces the default D&D 5e language options
 * available to players during character creation.
 */

import {registerLanguageChoiceSettings} from './settings';
import {applyLanguageSettings} from './languages';

export function registerLanguageChoiceFeature() {
    logger.info('Registering Language Choice');

    registerLanguageChoiceSettings();

    if (game.settings.get(module_id, 'languageSetting')) {
        applyLanguageSettings();
    }
}
