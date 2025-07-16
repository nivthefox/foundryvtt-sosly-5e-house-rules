import {id as module_id} from '../../../module.json';

/**
 * Madness Tracking Settings
 */

export function registerMadnessSettings() {
    game.settings.register(module_id, 'madness', {
        name: game.i18n.localize('sosly.madness.label'),
        hint: game.i18n.localize('sosly.madness.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        restricted: true,
        requiresReload: true
    });
}
