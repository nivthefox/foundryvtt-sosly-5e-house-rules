/**
 * UI functions for Imperiled feature
 */

import {id as module_id} from '../../../module.json';

/**
 * Show imperiled confirmation dialog
 * @param {number} exhaustion - Current exhaustion level
 * @returns {Promise<boolean>} True if user chooses to remain conscious
 */
export async function showImperiledDialog(exhaustion) {
    const confirmContent = game.i18n?.format('sosly.imperiled.confirmation', {exhaustion});
    return foundry.applications.api.DialogV2.confirm({
        window: {
            title: game.i18n?.localize('sosly.imperiled.title'),
        },
        classes: ['imperiled'],
        position: { width: 400 },
        content: `<p>${confirmContent}</p>`,
        yes: {},
        no: {}
    });
}

/**
 * Apply unconscious effect to actor and remove imperiled
 * @param {Actor} actor - The actor to apply unconscious to
 * @param {ActiveEffect} imperiledEffect - The imperiled effect to remove
 * @param {string} reason - Reason for falling unconscious
 */
export async function applyUnconscious(actor, imperiledEffect, reason = 'falls unconscious and is no longer imperiled') {
    if (imperiledEffect) {await imperiledEffect.delete();}

    const effect = await ActiveEffect.implementation.fromStatusEffect('unconscious');
    await ActiveEffect.implementation.create(effect, { parent: actor, keepId: true});

    await createImperiledChatMessage(actor, `${actor.name} ${reason}.`);
}

/**
 * Create imperiled-related chat message
 * @param {Actor} actor - The actor for the message
 * @param {string} text - The message text
 */
export async function createImperiledChatMessage(actor, text) {
    const content = await renderTemplate(`modules/${module_id}/templates/features/imperiled/Imperiled.hbs`, {
        text
    });

    await ChatMessage.create({
        user: game.user.id,
        speaker: {actor, alias: actor.name},
        content
    });
}
