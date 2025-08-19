import {id as module_id} from '../../../module.json';

/**
 * Severed Lands Blood Magic Settings
 */

export function registerSeveredLandsBloodMagicSettings() {
    game.settings.register(module_id, 'severed-lands-blood-magic', {
        name: game.i18n.localize('sosly.severedLandsBloodMagic.label'),
        hint: game.i18n.localize('sosly.severedLandsBloodMagic.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        restricted: true,
        requiresReload: true
    });
}
