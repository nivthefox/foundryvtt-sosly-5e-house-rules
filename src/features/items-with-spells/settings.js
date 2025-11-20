import {id as module_id} from '../../../module.json';

/**
 * Items with Spells Feature Settings
 */

export function registerItemsWithSpellsSettings() {
    game.settings.register(module_id, 'items-with-spells', {
        name: game.i18n.localize('sosly.items-with-spells.label'),
        hint: game.i18n.localize('sosly.items-with-spells.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        restricted: true,
        requiresReload: true
    });
}
