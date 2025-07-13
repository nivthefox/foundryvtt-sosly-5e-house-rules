/**
 * Breather rest utility functions
 */

import { Breather } from './breather';

/**
 * Perform a breather rest for an actor
 * @param {Actor} actor - The actor taking a breather
 * @param {object} config - Configuration options
 * @returns {Promise<void>}
 */
export async function performBreather(actor, config = {}) {
    if (actor.type === 'vehicle') {
        return;
    }

    if (Hooks.call('sosly.preBreather', actor, config) === false) {
        return;
    }

    // Take note of the initial hit points and number of hit dice the Actor has
    const hd0 = foundry.utils.getProperty(actor, 'system.attributes.hd.value');

    // Display a Dialog for rolling hit dice
    try {
        foundry.utils.mergeObject(config, await Breather.breatherDialog({actor: actor, canRoll: hd0 > 0}));
    }
    catch (err) {
        return;
    }

    if (Hooks.call('sosly.breather', actor, config) === false) {
        return;
    }

    if (!config.dialog && config.autoHD) {
        await actor.autoSpendHitDice({threshold: config.autoHDThreshold});
    }
}
