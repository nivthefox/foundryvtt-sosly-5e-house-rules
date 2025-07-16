import {id as module_id} from '../../../module.json';

/**
 * Imperiled Condition System Settings
 */

export function registerImperiledSettings() {
    game.settings.register(module_id, 'imperiled', {
        name: game.i18n.localize('sosly.imperiled.label'),
        hint: game.i18n.localize('sosly.imperiled.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
