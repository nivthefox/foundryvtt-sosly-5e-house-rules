import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';

/**
 * Multiple Concentration Feature
 * Allows characters to concentrate on two spells simultaneously by expending a Hit Die
 */

import { registerMultipleConcentrationSettings } from './settings';
import { registerDialogModification } from './dialog-modifier';
import { registerConcentrationHandler } from './handler';

export function registerMultipleConcentrationFeature() {
    logger.info('Registering Multiple Concentration');

    registerMultipleConcentrationSettings();

    const isEnabled = game.settings.get(module_id, 'multipleConcentration');

    // Always run setup to handle enable/disable state
    Hooks.once('setup', async () => {
        logger.info('Checking concentration limits for multiple concentration');

        if (isEnabled) {
            // Setting concentration limits to 2
            const actors = game.actors.filter(actor =>
                (actor.type === 'character' || actor.type === 'npc')
                && actor.getFlag(module_id, 'originalConcentrationLimit') === undefined
            );

            for (const actor of actors) {
                const currentLimit = actor.system.attributes?.concentration?.limit ?? 1;
                await actor.setFlag(module_id, 'originalConcentrationLimit', currentLimit);
                await actor.update({'system.attributes.concentration.limit': 2});
            }
        } else {
            // Restoring original concentration limits
            const actors = game.actors.filter(actor =>
                (actor.type === 'character' || actor.type === 'npc')
                && actor.getFlag(module_id, 'originalConcentrationLimit') !== undefined
            );

            for (const actor of actors) {
                const originalLimit = actor.getFlag(module_id, 'originalConcentrationLimit');
                await actor.update({'system.attributes.concentration.limit': originalLimit});
                await actor.unsetFlag(module_id, 'originalConcentrationLimit');
            }
        }
    });

    // Migrate old 'sosly' namespace flags to module_id namespace
    Hooks.on('renderActorSheet', async (app, html, data) => {
        const actor = app.actor;
        if (!actor || (actor.type !== 'character' && actor.type !== 'npc')) {
            return;
        }

        const oldFlag = foundry.utils.getProperty(actor.flags, 'sosly.originalConcentrationLimit');
        if (oldFlag !== undefined) {
            await actor.update({
                [`flags.${module_id}.originalConcentrationLimit`]: oldFlag,
                'flags.sosly.-=originalConcentrationLimit': null
            });
            logger.info(`Migrated concentration flag for actor ${actor.name}`);
        }
    });

    // Only register the rest if enabled
    if (!isEnabled) {return;}

    // Set concentration limit for newly created actors
    Hooks.on('preCreateActor', async (actor, data, options, userId) => {
        // Only apply to character and npc types
        if (data.type !== 'character' && data.type !== 'npc') {return;}

        const originalLimit = data.system?.attributes?.concentration?.limit ?? 1;
        await actor.updateSource({
            'system.attributes.concentration.limit': 2,
            [`flags.${module_id}.originalConcentrationLimit`]: originalLimit
        });
    });

    // Register the dialog modification
    registerDialogModification();

    // Register the concentration handler
    registerConcentrationHandler();
}
