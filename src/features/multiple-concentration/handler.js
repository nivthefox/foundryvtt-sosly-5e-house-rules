import {id as module_id} from '../../../module.json';

/**
 * Concentration Handler for Multiple Concentration
 * Handles HD expenditure when maintaining multiple concentrations
 */

// WeakMap to track pending multiple concentration by actor
const pendingMultipleConcentration = new WeakMap();

export function registerConcentrationHandler() {
    // Track when user selects the empty option (multiple concentration)
    Hooks.on('dnd5e.preActivityConsumption', (activity, config, data) => {
        if (config.concentration?.end === '') {
            // User selected our "None (Spend HD)" option
            pendingMultipleConcentration.set(activity.actor, true);
        } else {
            // Clear any pending state
            pendingMultipleConcentration.delete(activity.actor);
        }
    });

    // Handle HD expenditure after concentration begins
    Hooks.on('dnd5e.beginConcentrating', async (actor, item, effect, activity) => {
        if (!pendingMultipleConcentration.get(actor)) {return;}

        // Clear the pending state
        pendingMultipleConcentration.delete(actor);

        // Expend HD
        const hd = actor.system.attributes.hd;
        let hdExpended = null;
        let error = null;

        if (actor.type === 'npc' && hd.value > 0) {
            // NPCs track HD spent on the actor
            await actor.update({'system.attributes.hd.spent': (actor.system.attributes.hd.spent || 0) + 1});
            hdExpended = `d${hd.denomination}`;
        } else if (actor.type === 'character' && hd.value > 0) {
            // PCs track HD per class
            const smallestHD = hd.smallestAvailable;
            if (smallestHD) {
                // Find a class that has unspent HD of this size
                const cls = hd.classes
                    .filter(c => c.system.hd.denomination === smallestHD)
                    .find(c => c.system.hd.value > 0);

                if (cls) {
                    // Classes are embedded Items, need to use updateEmbeddedDocuments
                    const classChanges = [{
                        _id: cls.id,
                        'system.hd.spent': cls.system.hd.spent + 1
                    }];
                    await actor.updateEmbeddedDocuments('Item', classChanges);
                    hdExpended = smallestHD;
                } else {
                    // This shouldn't happen, but just in case
                    hdExpended = smallestHD;
                    error = game.i18n.format(
                        'ERROR: No class with {die} Hit Die found for {actor}! Concentration created but no HD was spent. GM intervention required!',
                        { die: smallestHD, actor: actor.name }
                    );
                }
            }
        }

        // Post chat message using template
        if (hdExpended || error) {
            const content = await foundry.applications.handlebars.renderTemplate(
                `modules/${module_id}/templates/features/multiple-concentration/chat-message.hbs`,
                {
                    actor: actor.name,
                    die: hdExpended,
                    error
                }
            );

            await ChatMessage.create({
                content,
                speaker: ChatMessage.getSpeaker({actor})
            });
        }
    });
}
