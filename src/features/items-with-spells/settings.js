import {id as module_id} from '../../../module.json';
import {registerMigration} from './migration';

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

    game.settings.register(module_id, 'items-with-spells-sort-order', {
        name: game.i18n.localize('sosly.items-with-spells.sort-order.label'),
        hint: game.i18n.localize('sosly.items-with-spells.sort-order.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        restricted: true,
        requiresReload: true
    });

    registerMigration();
}
