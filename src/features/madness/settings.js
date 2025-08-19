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

    game.settings.register(module_id, 'madness-max', {
        name: game.i18n.localize('sosly.madness.max.label'),
        hint: game.i18n.localize('sosly.madness.max.hint'),
        scope: 'world',
        config: true,
        type: Number,
        default: 10,
        range: {
            min: 1,
            max: 20,
            step: 1
        },
        restricted: true,
        requiresReload: false
    });
}
