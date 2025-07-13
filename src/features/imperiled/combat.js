/**
 * Imperiled Combat Management
 * Handles imperiled condition during combat turns
 */

import {id as module_id} from '../../../module.json';

/**
 * Handle imperiled condition when combat turn changes
 * @param {Combat} combat - The combat instance
 * @param {object} previous - Previous turn data
 * @param {object} next - Next turn data
 */
export async function handleImperiled(combat, previous, next) {
    if (previous === null) {
        return;
    }

    const actorId = combat.combatants.get(previous.combatantId).actorId;
    const actor = game.actors.get(actorId);

    const exhaustion = actor.system.attributes.exhaustion;
    const existing = actor.effects.get(dnd5e.utils.staticID('dnd5eimperiled'));

    if (!existing) {
        return;
    }

    if (exhaustion >= 5) {
        await existing.delete();
        const effect = await ActiveEffect.implementation.fromStatusEffect('unconscious');
        await ActiveEffect.implementation.create(effect, { parent: actor, keepId: true});

        const content = await renderTemplate(`modules/${module_id}/templates/features/imperiled/Imperiled.hbs`, {
            text: `${actor.name} falls unconscious and is no longer imperiled.`
        });
        await ChatMessage.create({
            user: game.user.id,
            speaker: {actor, alias: actor.name},
            content
        });
        return;
    }

    const confirmContent = game.i18n?.format('sosly.imperiled.confirmation', {exhaustion});
    const confirmation = await Dialog.confirm({
        title: 'Imperiled!',
        content: confirmContent
    });

    if (!confirmation) {
        await existing.delete();
        const effect = await ActiveEffect.implementation.fromStatusEffect('unconscious');
        await ActiveEffect.implementation.create(effect, { parent: actor, keepId: true});

        const content = await renderTemplate(`modules/${module_id}/templates/features/imperiled/Imperiled.hbs`, {
            text: `${actor.name} falls unconscious and is no longer imperiled.`
        });
        await ChatMessage.create({
            user: game.user.id,
            speaker: {actor, alias: actor.name},
            content
        });
        return;
    }

    await actor.update({ 'system.attributes.exhaustion': exhaustion + 1 });
    const content = await renderTemplate(`modules/${module_id}/templates/features/imperiled/Imperiled.hbs`, {
        text: `${actor.name} has gained a level of Exhaustion to remain conscious!`
    });
    await ChatMessage.create({
        user: game.user.id,
        speaker: {actor, alias: actor.name},
        content
    });
}
