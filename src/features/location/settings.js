import {id as module_id} from '../../../module.json';

export function registerLocationSettings() {
    game.settings.register(module_id, 'location.enabled', {
        name: 'sosly.location.label',
        hint: 'sosly.location.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    });
}
