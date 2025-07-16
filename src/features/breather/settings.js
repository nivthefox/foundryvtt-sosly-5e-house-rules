import {id as module_id} from '../../../module.json';

/**
 * Breather Rest System Settings
 */

export function registerBreatherSettings() {
    game.settings.register(module_id, 'breather', {
        name: game.i18n.localize('sosly.breather.label'),
        hint: game.i18n.localize('sosly.breather.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
