import {id as module_id} from '../../../module.json';

const BLOOD_VIAL_IDENTIFIER = 'blood-vial';

/**
 * Handle madness recovery on long rest
 */
export function registerRecoveryHandler() {
    Hooks.on('dnd5e.longRest', async (actor, data) => {
        if (!game.settings.get(module_id, 'severed-lands-blood-magic')) {
            return;
        }

        if (actor.type !== 'character') {
            return;
        }

        await handleBloodVialDecay(actor);

        if (!game.settings.get(module_id, 'madness')) {
            return;
        }

        const currentMadness = actor.flags?.sosly?.madness ?? 0;
        if (currentMadness <= 0) {
            return;
        }

        const profBonus = actor.system.attributes.prof || 2;
        const newMadness = Math.max(0, currentMadness - profBonus);

        await actor.update({
            'flags.sosly.madness': newMadness
        });

        const message = game.i18n.format('sosly.severedLandsBloodMagic.recovery', {
            actor: actor.name,
            profBonus: profBonus,
            current: newMadness
        });

        const content = await renderTemplate(`modules/${module_id}/templates/features/severed-lands-blood-magic/madness-recovery.hbs`, {
            message
        });

        ChatMessage.create({
            content,
            speaker: ChatMessage.getSpeaker({ actor })
        });
    });
}

async function handleBloodVialDecay(actor) {
    const bloodVials = actor.items.filter(item => item.system.identifier === BLOOD_VIAL_IDENTIFIER);

    if (bloodVials.length === 0) {
        return;
    }

    const updates = [];
    for (const vial of bloodVials) {
        const max = vial.system.uses?.max ?? 30;
        const spent = vial.system.uses?.spent ?? 0;
        const currentBlood = max - spent;

        if (currentBlood <= 0) {
            continue;
        }

        const newSpent = max - Math.floor(currentBlood / 2);

        updates.push({
            _id: vial.id,
            'system.uses.spent': newSpent
        });
    }

    if (updates.length > 0) {
        await actor.updateEmbeddedDocuments('Item', updates);
    }
}
