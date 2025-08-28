/**
 * Imperiled Actor Update Handling
 * Manages imperiled condition when actor HP changes
 */

import {
    shouldOfferImperiledChoice,
    shouldRemoveImperiled,
    calculateImperiledExhaustion,
    generateImperiledMessage,
    shouldApplyImperiled
} from './calculations';
import { showImperiledDialog, applyUnconscious, createImperiledChatMessage } from './ui';

/**
 * Handle imperiled condition when actor is updated
 * @param {Actor} actor - The actor being updated
 * @param {object} changed - Changes being applied
 * @param {object} options - Update options
 * @param {string} userId - ID of user making the update
 */
export async function handleImperiledUpdate(actor, changed, options, userId) {
    // Only process for the user who triggered the update
    if (game.user.id !== userId) return;

    if (!shouldApplyImperiled(actor.type, actor.prototypeToken.actorLink)) {
        return;
    }

    if (changed.system?.attributes?.hp?.value === undefined) {
        return;
    }

    const hp = changed.system.attributes.hp;
    const exhaustion = actor.system.attributes.exhaustion;
    const maxHP = actor.system.attributes.hp.max;

    const existing = actor.effects.get(dnd5e.utils.staticID('dnd5eimperiled'));
    const unconscious = actor.effects.get(dnd5e.utils.staticID('dnd5eunconscious'));
    const dead = actor.effects.get(dnd5e.utils.staticID('dnd5edead'));

    if (shouldRemoveImperiled(hp.value, !!existing)) {
        await existing.delete();

        await createImperiledChatMessage(actor, generateImperiledMessage(actor.name, 'removed'));
        return;
    }

    if (hp.value > 0) {
        return;
    }

    if (shouldOfferImperiledChoice(hp.value, maxHP, exhaustion, !!existing, !!unconscious, !!dead)) {
        const confirmation = await showImperiledDialog(exhaustion);

        if (!confirmation) {
            await applyUnconscious(actor, null, 'chose to fall unconscious');
            return;
        }

        const effect = await ActiveEffect.implementation.fromStatusEffect('imperiled');
        await ActiveEffect.implementation.create(effect, { parent: actor, keepId: true});

        await actor.update({'system.attributes.exhaustion': calculateImperiledExhaustion(exhaustion)});

        await createImperiledChatMessage(actor, generateImperiledMessage(actor.name, 'gained'));
    }
}
