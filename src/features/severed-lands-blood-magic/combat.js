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

    const content = `
        <div class="dnd5e2 dialog-content">
            <p><strong>${actor.name}</strong> has a madness effect that allows a save re-attempt:</p>
            <p><em>${effect.name}</em></p>
            <hr>
            <p>Would you like to attempt a <strong>${abilityLabel} save (DC ${dc})</strong> to end this effect?</p>
        </div>
    `;

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

        const successContent = `
            <div class="dnd5e2 chat-card">
                <section class="card-header description">
                    <header class="summary">
                        <img class="gold-icon" src="icons/magic/control/fear-fright-white.webp" alt="Save Success">
                        <div class="name-stacked">
                            <span class="title">Madness Save Success</span>
                        </div>
                    </header>
                    <section class="details card-content">
                        <p><strong>${actor.name}</strong> successfully saves against the madness effect!</p>
                        <p><em>${effect.name}</em> has been removed.</p>
                    </section>
                </section>
            </div>
        `;

        ChatMessage.create({
            content: successContent,
            speaker: ChatMessage.getSpeaker({ actor })
        });
    } else {
        const failureContent = `
            <div class="dnd5e2 chat-card">
                <section class="card-header description">
                    <header class="summary">
                        <img class="gold-icon" src="icons/magic/control/fear-fright-monster-purple-blue.webp" alt="Save Failure">
                        <div class="name-stacked">
                            <span class="title">Madness Save Failed</span>
                        </div>
                    </header>
                    <section class="details card-content">
                        <p><strong>${actor.name}</strong> fails the save against the madness effect.</p>
                        <p><em>${effect.name}</em> continues.</p>
                    </section>
                </section>
            </div>
        `;

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
