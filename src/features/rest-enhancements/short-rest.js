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

    // Get class items directly from actor.items since that's the reliable way
    const classItems = actor.items.filter(item => item.type === 'class');

    if (classItems.length > 0) {
        // Sort classes by hit die size (largest first) for recovery priority
        const classes = classItems.sort((a, b) => {
            const aDie = parseInt((a.system.hd?.denomination || 'd0').slice(1));
            const bDie = parseInt((b.system.hd?.denomination || 'd0').slice(1));
            return bDie - aDie;
        });

        const updateItems = [];
        for (const item of classes) {
            const spent = item.system.hd?.spent || 0;
            if (spent > 0) {
                updateItems.push({ _id: item.id, 'system.hd.spent': spent - 1});
                break;
            }
        }

        if (updateItems.length > 0) {
            await actor.updateEmbeddedDocuments('Item', updateItems, { isRest: true });
        }
    }

    if (actor.system.attributes.exhaustion > 0) {
        await actor.update({ 'system.attributes.exhaustion': actor.system.attributes.exhaustion - 1 }, { isRest: true });
    }
}
