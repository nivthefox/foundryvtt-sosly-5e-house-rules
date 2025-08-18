import {id as module_id} from '../../../module.json';

export function registerTransformationCleanupSettings() {
    game.settings.register(module_id, 'transformation-cleanup', {
        name: game.i18n.localize('sosly.transformation-cleanup.label'),
        hint: game.i18n.localize('sosly.transformation-cleanup.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        restricted: true,
        requiresReload: true
    });
}
