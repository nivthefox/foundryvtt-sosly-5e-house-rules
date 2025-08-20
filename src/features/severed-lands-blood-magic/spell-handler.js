import {id as module_id} from '../../../module.json';
import { showMadnessSaveDialog, showConsequenceDialog } from './madness-dialog';
import { createMadnessChatMessage } from './chat-handler';

/**
 * Handle spell slot consumption for blood magic
 */
export function registerSpellHandler() {
    Hooks.on('dnd5e.activityConsumption', async (activity, usageConfig, messageConfig, updates) => {
        if (!game.settings.get(module_id, 'severed-lands-blood-magic')) {
            return;
        }

        if (!game.settings.get(module_id, 'madness')) {
            return;
        }

        const actor = activity.actor;
        if (!actor || actor.type !== 'character') {
            return;
        }

        // Check if this activity belongs to a spell and consumes spell slots
        const item = activity.item;
        const isSpell = item?.type === 'spell';
        const consumesSpellSlot = activity.consumption?.spellSlot === true;

        if (!isSpell || !consumesSpellSlot) {
            return;
        }

        const spellLevel = item.system.level;

        try {
            const saveResult = await showMadnessSaveDialog(actor, spellLevel);
            if (!saveResult) {
                return;
            }

            const rollTotal = saveResult.total;
            const dc = 10 + spellLevel;

            // Check for natural 20 (Blood Surge)
            if (saveResult.dice[0]?.results[0]?.result === 20) {
                await handleBloodSurge(actor, spellLevel);
                return;
            }

            // Check for natural 1 (Hungry Magic)
            if (saveResult.dice[0]?.results[0]?.result === 1) {
                await handleHungryMagic(actor, spellLevel);
            }

            // Check if save failed
            if (rollTotal < dc) {
                const choice = await showConsequenceDialog();

                if (choice === 'madness') {
                    await handleMadnessConsequence(actor);
                } else if (choice === 'exhaustion') {
                    await handleExhaustionConsequence(actor);
                }
            }

        } catch (error) {
            console.error('Severed Lands Blood Magic | Error processing spell consumption:', error);
        }
    });
}

/**
 * Handle Blood Surge (Natural 20)
 */
async function handleBloodSurge(actor, spellLevel) {
    const slotLevel = `spell${spellLevel}`;
    const currentSlots = actor.system.spells[slotLevel]?.value || 0;
    const maxSlots = actor.system.spells[slotLevel]?.max || 0;

    if (currentSlots < maxSlots) {
        await actor.update({
            [`system.spells.${slotLevel}.value`]: currentSlots + 1
        });
    }

    const message = game.i18n.format('sosly.severedLandsBloodMagic.bloodSurge', {
        actor: actor.name
    });

    ChatMessage.create({
        content: `<p>${message}</p>`,
        speaker: ChatMessage.getSpeaker({ actor })
    });
}

/**
 * Handle Hungry Magic (Natural 1)
 */
async function handleHungryMagic(actor, spellLevel) {
    let slotConsumed = false;

    // Try to consume a slot of the same level or lower
    for (let level = spellLevel; level >= 1; level--) {
        const slotLevel = `spell${level}`;
        const currentSlots = actor.system.spells[slotLevel]?.value || 0;

        if (currentSlots > 0) {
            await actor.update({
                [`system.spells.${slotLevel}.value`]: currentSlots - 1
            });

            const message = game.i18n.format('sosly.severedLandsBloodMagic.hungryMagic.slot', {
                actor: actor.name,
                level: level
            });

            ChatMessage.create({
                content: `<p>${message}</p>`,
                speaker: ChatMessage.getSpeaker({ actor })
            });

            slotConsumed = true;
            break;
        }
    }

    // If no slot was available, deal psychic damage
    if (!slotConsumed) {
        const damageRoll = new Roll(`${spellLevel}d6`);
        await damageRoll.evaluate();

        const damage = damageRoll.total;
        const currentHP = actor.system.attributes.hp.value;

        await actor.update({
            'system.attributes.hp.value': Math.max(0, currentHP - damage)
        });

        const message = game.i18n.format('sosly.severedLandsBloodMagic.hungryMagic.damage', {
            actor: actor.name,
            damage: damage
        });

        ChatMessage.create({
            content: `<p>${message}</p>`,
            speaker: ChatMessage.getSpeaker({ actor }),
            rolls: [damageRoll]
        });
    }
}

/**
 * Handle madness consequence
 */
async function handleMadnessConsequence(actor) {
    const currentMadness = actor.flags?.sosly?.madness ?? 0;
    const newMadness = currentMadness + 1;

    await actor.update({
        'flags.sosly.madness': newMadness
    });

    // Always create chat message with button for GM to select madness effect
    await createMadnessChatMessage(actor, newMadness);
}

/**
 * Handle exhaustion consequence
 */
async function handleExhaustionConsequence(actor) {
    const currentExhaustion = actor.system.attributes.exhaustion || 0;
    const newExhaustion = Math.min(6, currentExhaustion + 1);

    await actor.update({
        'system.attributes.exhaustion': newExhaustion
    });

    ChatMessage.create({
        content: `<p><strong>${actor.name}</strong> gains 1 level of exhaustion (now at ${newExhaustion}).</p>`,
        speaker: ChatMessage.getSpeaker({ actor })
    });
}
