import {id as module_id} from '../../../module.json';

export function registerInfravisionSettings() {
    game.settings.register(module_id, 'infravision', {
        name: 'Enable Infravision',
        hint: 'Allows tokens with Infravision to see in darkness by detecting heat sources. Everything appears as 95% black except for living creatures which glow with a red heat signature.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    });
}
