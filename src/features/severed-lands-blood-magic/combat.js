/**
 * Handle combat turn changes for madness save re-attempts
 */

/**
 * Show save re-attempt dialog for madness effects
 */
async function showMadnessSaveRetryDialog(actor, effect) {
    const spellLevel = effect.flags?.sosly?.spellLevel ?? 1;
    const dc = 10 + spellLevel;
    const spellcastingAbility = actor.system.attributes.spellcasting || 'int';
    const abilityLabel = CONFIG.DND5E.abilities[spellcastingAbility]?.label || 'Intelligence';

    const content = await renderTemplate(`modules/${game.modules.get('sosly-5e-house-rules').id}/templates/features/severed-lands-blood-magic/madness-save-prompt.hbs`, {
        actorName: actor.name,
        effectName: effect.name,
        abilityLabel,
        dc
    });

    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: {
            title: 'Madness Save Re-attempt',
        },
        content: content
    });

    if (!confirmed) {
        return null;
    }

    const result = await actor.rollAbilitySave(spellcastingAbility);

    if (result.total >= dc) {
        await effect.delete();

        const successContent = await renderTemplate(`modules/${game.modules.get('sosly-5e-house-rules').id}/templates/features/severed-lands-blood-magic/madness-save-success.hbs`, {
            actorName: actor.name,
            effectName: effect.name
        });

        ChatMessage.create({
            content: successContent,
            speaker: ChatMessage.getSpeaker({ actor })
        });
    } else {
        const failureContent = await renderTemplate(`modules/${game.modules.get('sosly-5e-house-rules').id}/templates/features/severed-lands-blood-magic/madness-save-failure.hbs`, {
            actorName: actor.name,
            effectName: effect.name
        });

        ChatMessage.create({
            content: failureContent,
            speaker: ChatMessage.getSpeaker({ actor })
        });
    }

    return result;
}

/**
 * Handle madness effects on combat turn change
 */
export async function handleMadnessCombatTurn(combat, previous, next) {
    // Get the current combatant from the combat itself
    const currentCombatant = combat?.combatant;
    if (!currentCombatant?.actor) {
        return;
    }

    const actor = currentCombatant.actor;

    // Only show dialog to non-GM users who own the character
    if (game.user.isGM) {
        return;
    }

    if (!actor.isOwner) {
        return;
    }

    const madnessEffects = actor.effects.filter(effect =>
        effect.flags?.sosly?.canRepeatSave === true
    );

    if (madnessEffects.length === 0) {
        return;
    }

    for (const effect of madnessEffects) {
        await showMadnessSaveRetryDialog(actor, effect);
    }
}
