import {id as module_id} from '../../../module.json';
import { logger } from '../../utils/logger';
import { showMadnessSaveDialog, showConsequenceDialog } from './madness-dialog';
import { createMadnessChatMessage } from './chat-handler';

/**
 * Handle spell slot consumption for blood magic
 */
export function registerSpellHandler() {
    // Use postActivityConsumption to check what was actually consumed
    Hooks.on('dnd5e.postActivityConsumption', async (activity, usageConfig, messageConfig, updates) => {
        logger.info('Blood Magic: postActivityConsumption hook triggered');
        await handleBloodMagic(activity, usageConfig, messageConfig, updates);
    });
}

async function handleBloodMagic(activity, usageConfig, messageConfig, updates) {

    if (!game.settings.get(module_id, 'severed-lands-blood-magic')) {
        logger.info('Blood Magic: Feature disabled');
        return;
    }

    if (!game.settings.get(module_id, 'madness')) {
        logger.info('Blood Magic: Madness feature disabled');
        return;
    }

    const actor = activity.actor;
    if (!actor || actor.type !== 'character') {
        logger.info('Blood Magic: Not a character actor');
        return;
    }

    // Check if this activity belongs to a spell and isn't a cantrip
    const item = activity.item;
    const isSpell = item?.type === 'spell';
    const isCantrip = item?.system?.level === 0;

    if (!isSpell || isCantrip) {
        logger.info('Blood Magic: Not a leveled spell');
        return;
    }

    // Check if spell slots were actually consumed by examining the nested updates object
    const actorUpdates = updates?.actor?.system?.spells;
    const spellSlotConsumed = actorUpdates && Object.keys(actorUpdates).some(key =>
        key.startsWith('spell') && actorUpdates[key]?.value !== undefined
    );

    logger.info('Blood Magic: Spell slot consumed:', spellSlotConsumed);
    logger.info('Blood Magic: Actor spell updates:', actorUpdates);

    if (!spellSlotConsumed) {
        logger.info('Blood Magic: No spell slot was consumed');
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

        // Get the actual die result that was used (handles advantage/disadvantage correctly)
        logger.info('Blood Magic: Full saveResult object:', saveResult);
        const usedResult = saveResult.dice[0]?.results?.find(result => result.active);
        const naturalRoll = usedResult?.result;

        // Check for natural 20 (Blood Surge)
        if (naturalRoll === 20) {
            await handleBloodSurge(actor, spellLevel);
            return;
        }

        // Check if save failed
        if (rollTotal < dc) {
            // Check for natural 1 (Hungry Magic) - only on failed saves
            if (naturalRoll === 1) {
                await handleHungryMagic(actor, spellLevel);
            }
            const choice = await showConsequenceDialog();

            if (choice === 'madness') {
                await handleMadnessConsequence(actor, spellLevel);
            } else if (choice === 'exhaustion') {
                await handleExhaustionConsequence(actor);
            }
        }

    } catch (error) {
        logger.error('Error processing spell consumption:', error);
    }
}

/**
 * Handle Blood Surge (Natural 20)
 */
async function handleBloodSurge(actor, spellLevel) {
    const slotLevel = `spell${spellLevel}`;
    const currentSlots = actor.system.spells[slotLevel]?.value || 0;
    const maxSlots = actor.system.spells[slotLevel]?.max || 0;

    let slotRecovered = false;
    if (currentSlots < maxSlots) {
        await actor.update({
            [`system.spells.${slotLevel}.value`]: currentSlots + 1
        });
        slotRecovered = true;
    }

    const content = await renderTemplate(`modules/${module_id}/templates/features/severed-lands-blood-magic/blood-surge.hbs`, {
        actorName: actor.name,
        slotRecovered: slotRecovered
    });

    ChatMessage.create({
        content: content,
        speaker: ChatMessage.getSpeaker({ actor })
    });
}

/**
 * Handle Hungry Magic (Natural 1)
 */
async function handleHungryMagic(actor, spellLevel) {
    let slotConsumed = false;

    // Try to consume a slot starting from the lowest level available
    for (let level = 1; level <= spellLevel; level++) {
        const slotLevel = `spell${level}`;
        const currentSlots = actor.system.spells[slotLevel]?.value || 0;

        if (currentSlots > 0) {
            await actor.update({
                [`system.spells.${slotLevel}.value`]: currentSlots - 1
            });

            const content = await renderTemplate(`modules/${module_id}/templates/features/severed-lands-blood-magic/hungry-magic-slot.hbs`, {
                actorName: actor.name,
                level: level
            });

            ChatMessage.create({
                content: content,
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

        const content = await renderTemplate(`modules/${module_id}/templates/features/severed-lands-blood-magic/hungry-magic-damage.hbs`, {
            actorName: actor.name,
            damage: damage
        });

        ChatMessage.create({
            content: content,
            speaker: ChatMessage.getSpeaker({ actor }),
            rolls: [damageRoll]
        });
    }
}

/**
 * Handle madness consequence
 */
async function handleMadnessConsequence(actor, spellLevel) {
    const currentMadness = actor.flags?.sosly?.madness ?? 0;
    const newMadness = currentMadness + 1;

    await actor.update({
        'flags.sosly.madness': newMadness
    });

    // Always create chat message with button for GM to select madness effect
    await createMadnessChatMessage(actor, newMadness, spellLevel);
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

    const content = await renderTemplate(`modules/${game.modules.get('sosly-5e-house-rules').id}/templates/features/severed-lands-blood-magic/exhaustion-gained.hbs`, {
        actorName: actor.name,
        exhaustionLevel: newExhaustion
    });

    ChatMessage.create({
        content,
        speaker: ChatMessage.getSpeaker({ actor })
    });
}
