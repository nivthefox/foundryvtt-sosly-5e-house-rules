/**
 * Concentration Management Feature
 * Handles concentration spell management during rests
 */

import { registerConcentrationSettings } from './settings';
import { handleConcentrationRest } from './rest-handler';
import { registerConcentrationTests } from './quench';

export function registerConcentrationFeature() {
    console.log('SoSly 5e House Rules | Registering Concentration Management');

    registerConcentrationSettings();

    const concentrationEnabled = game.settings.get('sosly-5e-house-rules', 'concentration');
    const breatherEnabled = game.settings.get('sosly-5e-house-rules', 'breather');

    if (concentrationEnabled) {
        Hooks.on('dnd5e.shortRest', async (actor, data) => {
            await handleConcentrationRest(actor);
        });

        Hooks.on('dnd5e.longRest', async (actor, data) => {
            await handleConcentrationRest(actor);
        });
    }

    if (concentrationEnabled && breatherEnabled) {
        Hooks.on('sosly.breather', async actor => {
            await handleConcentrationRest(actor);
        });
    }

    // Register Quench tests if Quench module is available
    if (game.modules.get('quench')?.active) {
        registerConcentrationTests();
    }
}
