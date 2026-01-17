import {id as module_id} from '../../../module.json';

export function registerAttunementLimitsSettings() {
    game.settings.register(module_id, 'attunementLimits', {
        name: game.i18n.localize('sosly.attunement-limits.label'),
        hint: game.i18n.localize('sosly.attunement-limits.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
