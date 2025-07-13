/**
 * Concentration Management Feature
 * Handles concentration spell management during rests
 */

import { handleConcentrationRest } from './rest-handler';

export function registerConcentrationFeature() {
    console.log('SoSly 5e House Rules | Registering Concentration Management');

    Hooks.on('dnd5e.shortRest', async (actor, data) => {
        await handleConcentrationRest(actor);
    });

    Hooks.on('dnd5e.longRest', async (actor, data) => {
        await handleConcentrationRest(actor);
    });

    Hooks.on('sosly.breather', async actor => {
        await handleConcentrationRest(actor);
    });
}
