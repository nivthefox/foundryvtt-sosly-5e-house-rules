import {id as module_id} from '../../../module.json';

/**
 * Handle madness recovery on long rest
 */
export function registerRecoveryHandler() {
    Hooks.on('dnd5e.longRest', async (actor, data) => {
        if (!game.settings.get(module_id, 'severed-lands-blood-magic')) {
            return;
        }

        if (!game.settings.get(module_id, 'madness')) {
            return;
        }

        if (actor.type !== 'character') {
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

        ChatMessage.create({
            content: `<p>${message}</p>`,
            speaker: ChatMessage.getSpeaker({ actor })
        });
    });
}
