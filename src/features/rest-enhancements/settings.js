import {id as module_id} from '../../../module.json';

/**
 * Rest Enhancements Settings
 */

export function registerRestEnhancementsSettings() {
    game.settings.register(module_id, 'rest-enhancements', {
        name: game.i18n.localize('sosly.rest-enhancements.label'),
        hint: game.i18n.localize('sosly.rest-enhancements.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
