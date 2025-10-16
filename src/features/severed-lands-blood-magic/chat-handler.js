import {id as module_id} from '../../../module.json';
import { showDMMadnessDialog } from './madness-dialog';
import { createMadnessEffect } from './effects';

/**
 * Handle chat button clicks for madness selection
 */
export function registerChatHandler() {
    Hooks.on('renderChatMessage', (message, html) => {
        // Only attach listeners to our madness chat cards
        const madnessButton = html.find('[data-action="selectMadness"]');
        if (madnessButton.length === 0) {return;}

        madnessButton.on('click', async event => {
            event.preventDefault();

            // Only allow GM to click the button
            if (!game.user.isGM) {
                ui.notifications.warn('Only the GM can select madness effects.');
                return;
            }

            const button = event.currentTarget;
            const actorUuid = button.dataset.actorUuid;
            const madnessLevel = parseInt(button.dataset.madnessLevel);
            const spellLevel = parseInt(button.dataset.spellLevel) || 1;

            try {
                const actor = await fromUuid(actorUuid);
                if (!actor) {
                    ui.notifications.error('Could not find the actor.');
                    return;
                }

                // Show the DM madness selection dialog
                const effectData = await showDMMadnessDialog(madnessLevel);

                if (effectData && effectData !== null && effectData !== false) {
                    effectData.spellLevel = spellLevel;
                    await createMadnessEffect(actor, effectData);

                    // Update the chat message to remove the button permanently
                    const messageContent = await renderTemplate(`modules/${module_id}/templates/features/severed-lands-blood-magic/madness-chat-completed.hbs`, {
                        actorName: actor.name,
                        madnessLevel: madnessLevel,
                        effectName: effectData.effectName
                    });

                    await message.update({ content: messageContent });
                }
            } catch (error) {
                console.error('Severed Lands Blood Magic | Error handling madness selection:', error);
                ui.notifications.error('Failed to apply madness effect.');
            }
        });
    });
}

/**
 * Create madness chat message with button
 */
export async function createMadnessChatMessage(actor, madnessLevel, spellLevel = 1) {
    const content = await renderTemplate(`modules/${module_id}/templates/features/severed-lands-blood-magic/madness-chat.hbs`, {
        actorName: actor.name,
        actorUuid: actor.uuid,
        madnessLevel: madnessLevel,
        spellLevel: spellLevel
    });

    await ChatMessage.create({
        content: content,
        speaker: ChatMessage.getSpeaker({ actor }),
        whisper: game.users.filter(u => u.isGM).map(u => u.id)
    });
}
