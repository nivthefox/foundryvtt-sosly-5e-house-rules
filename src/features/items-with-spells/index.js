import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import {registerItemsWithSpellsSettings} from './settings';
import {registerItemSheetSpells} from './item-sheet-spells';
import {registerActorIntegration} from './actor-integration';
import {registerSpellDeletion} from './spell-deletion';
import {registerActorSheetSpells} from './actor-sheet-spells';

/**
 * Items with Spells Feature
 * Adds a Spells tab to eligible item types and manages actor spell integration
 */

export function registerItemsWithSpellsFeature() {
    logger.info('Registering Items with Spells');

    registerItemsWithSpellsSettings();

    if (!game.settings.get(module_id, 'items-with-spells')) {
        return;
    }

    registerItemSheetSpells();
    registerActorIntegration();
    registerSpellDeletion();
    registerActorSheetSpells();
}
