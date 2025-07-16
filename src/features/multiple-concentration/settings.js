import {id as module_id} from '../../../module.json';

/**
 * Multiple Concentration Settings
 */

export function registerMultipleConcentrationSettings() {
    game.settings.register(module_id, 'multipleConcentration', {
        name: game.i18n.localize('sosly.concentration.multiple.label'),
        hint: game.i18n.localize('sosly.concentration.multiple.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
