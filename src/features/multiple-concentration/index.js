import {id as module_id} from '../../../module.json';

/**
 * Multiple Concentration Feature
 * Allows characters to concentrate on two spells simultaneously by expending a Hit Die
 */

import { registerMultipleConcentrationSettings } from './settings';
import { registerDialogModification } from './dialog-modifier';
import { registerConcentrationHandler } from './handler';

export function registerMultipleConcentrationFeature() {
    console.log('SoSly 5e House Rules | Registering Multiple Concentration');

    registerMultipleConcentrationSettings();

    const isEnabled = game.settings.get(module_id, 'multipleConcentration');

    // Always run setup to handle enable/disable state
    Hooks.once('setup', async () => {
        console.log('SoSly 5e House Rules | Checking concentration limits for multiple concentration');

        if (isEnabled) {
            // Setting concentration limits to 2
            const actors = game.actors.filter(actor =>
                (actor.type === 'character' || actor.type === 'npc')
                && actor.getFlag('sosly', 'originalConcentrationLimit') === undefined
            );

            for (const actor of actors) {
                const currentLimit = actor.system.attributes?.concentration?.limit ?? 1;
                await actor.setFlag('sosly', 'originalConcentrationLimit', currentLimit);
                await actor.update({'system.attributes.concentration.limit': 2});
            }
        } else {
            // Restoring original concentration limits
            const actors = game.actors.filter(actor =>
                (actor.type === 'character' || actor.type === 'npc')
                && actor.getFlag('sosly', 'originalConcentrationLimit') !== undefined
            );

            for (const actor of actors) {
                const originalLimit = actor.getFlag('sosly', 'originalConcentrationLimit');
                await actor.update({'system.attributes.concentration.limit': originalLimit});
                await actor.unsetFlag('sosly', 'originalConcentrationLimit');
            }
        }
    });

    // Only register the rest if enabled
    if (!isEnabled) return;

    // Set concentration limit for newly created actors
    Hooks.on('preCreateActor', async (actor, data, options, userId) => {
        // Only apply to character and npc types
        if (data.type !== 'character' && data.type !== 'npc') return;

        const originalLimit = data.system?.attributes?.concentration?.limit ?? 1;
        await actor.updateSource({
            'system.attributes.concentration.limit': 2,
            'flags.sosly.originalConcentrationLimit': originalLimit
        });
    });

    // Register the dialog modification
    registerDialogModification();

    // Register the concentration handler
    registerConcentrationHandler();
}
