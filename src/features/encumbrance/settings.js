import {id as module_id} from '../../../module.json';

/**
 * Custom Encumbrance Settings
 */

export function registerEncumbranceSettings() {
    game.settings.register(module_id, 'encumbrance', {
        name: game.i18n.localize('sosly.encumbrance.label'),
        hint: game.i18n.localize('sosly.encumbrance.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
