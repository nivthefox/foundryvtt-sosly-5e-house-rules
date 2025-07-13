/**
 * Short Rest Enhancements
 * Handles hit dice and exhaustion recovery during short rests
 */

/**
 * Handle short rest enhancements for actors
 * @param {Actor} actor - The actor taking a short rest
 * @param {object} data - Rest data
 */
export async function handleShortRest(actor, data) {
    if (actor.type === 'vehicle' || actor.type === 'npc') {
        return;
    }

    if (foundry.utils.hasProperty(actor, 'system.attributes.hd')) {
        const classes = Array.from(actor.system.attributes.hd.classes).sort((a, b) => {
            a = parseInt(a.system.hitDice.slice(1));
            b = parseInt(b.system.hitDice.slice(1));
            return b - a;
        });
        const updateItems = [];

        for (const item of classes) {
            const used = item.system.hitDiceUsed;
            if (used > 0) {
                updateItems.push({ _id: item.id, 'system.hitDiceUsed': used - 1});
                break;
            }
        }

        if (actor.system.attributes.exhaustion > 0) {
            await actor.update({ 'system.attributes.exhaustion': actor.system.attributes.exhaustion - 1 }, { isRest: true });
        }

        await actor.updateEmbeddedDocuments('Item', updateItems, { isRest: true });
    }
}
