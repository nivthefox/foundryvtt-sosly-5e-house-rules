/**
 * Concentration Management Feature
 * Handles concentration spell management during rests
 */

import { registerConcentrationSettings } from './settings';
import { handleConcentrationRest } from './rest-handler';

export function registerConcentrationFeature() {
    console.log('SoSly 5e House Rules | Registering Concentration Management');

    registerConcentrationSettings();

    Hooks.on('dnd5e.shortRest', async (actor, data) => {
        if (game.settings.get('sosly-5e-house-rules', 'concentration')) {
            await handleConcentrationRest(actor);
        }
    });

    Hooks.on('dnd5e.longRest', async (actor, data) => {
        if (game.settings.get('sosly-5e-house-rules', 'concentration')) {
            await handleConcentrationRest(actor);
        }
    });

    // Hook breather events, but check both settings
    Hooks.on('sosly.breather', async actor => {
        if (game.settings.get('sosly-5e-house-rules', 'concentration')
            && game.settings.get('sosly-5e-house-rules', 'breather')) {
            await handleConcentrationRest(actor);
        }
    });
}
