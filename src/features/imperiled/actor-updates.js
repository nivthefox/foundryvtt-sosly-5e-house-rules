/**
 * Imperiled Actor Update Handling
 * Manages imperiled condition when actor HP changes
 */

import {id as module_id} from '../../../module.json';

/**
 * Handle imperiled condition when actor is updated
 * @param {Actor} actor - The actor being updated
 * @param {object} changed - Changes being applied
 * @param {object} options - Update options
 * @param {string} userId - ID of user making the update
 */
export async function handleImperiledUpdate(actor, changed, options, userId) {
    if (actor.type === 'vehicle' || actor.type === 'group') {
        return;
    }

    if (changed.system?.attributes?.hp?.value === undefined) {
        return;
    }

    const hp = changed.system.attributes.hp;
    const exhaustion = actor.system.attributes.exhaustion;

    const existing = actor.effects.get(dnd5e.utils.staticID('dnd5eimperiled'));

    if (hp.value > 0 && existing) {
        await existing.delete();

        const content = await renderTemplate(`modules/${module_id}/templates/features/imperiled/Imperiled.hbs`, {
            text: `${actor.name} is no longer imperiled.`
        });
        await ChatMessage.create({
            user: game.user.id,
            speaker: {actor: actor, alias: actor.name},
            content
        });
        return;
    }

    if (hp.value > 0) {
        return;
    }

    if (!existing && exhaustion < 5) {
        const confirmContent = game.i18n?.format('sosly.imperiled.confirmation', {exhaustion});
        const confirmation = await Dialog.confirm({
            title: game.i18n?.localize('sosly.imperiled.title'),
            content: confirmContent
        });

        if (!confirmation) {
            const effect = await ActiveEffect.implementation.fromStatusEffect('unconscious');
            await ActiveEffect.implementation.create(effect, { parent: actor, keepId: true});
            return;
        }

        const effect = await ActiveEffect.implementation.fromStatusEffect('imperiled');
        await ActiveEffect.implementation.create(effect, { parent: actor, keepId: true});
        await actor.update({system: {
            attributes: {
                exhaustion: exhaustion + 1
            }
        }});

        const content = await renderTemplate(`modules/${module_id}/templates/features/imperiled/Imperiled.hbs`, {
            text: `${actor.name} has gained a level of Exhaustion to remain conscious!`
        });
        await ChatMessage.create({
            user: game.user.id,
            speaker: {actor: actor, alias: actor.name},
            content
        });
    }
}