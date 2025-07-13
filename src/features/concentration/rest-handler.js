/**
 * Concentration Management Utilities
 * Handles concentration spell management during rests
 */

/**
 * Handle removing concentration effects when the actor takes a rest
 * @param {Actor} actor - The actor taking a rest
 * @returns {Promise<void>}
 */
export async function handleConcentrationRest(actor) {
    const concentrating = actor.effects.filter(effect => effect.statuses.has('concentrating'));

    if (concentrating.size === 0) {
        return;
    }

    for (const effect of concentrating) {
        const confirmContent = game.i18n?.format('sosly.concentration.confirmation', {spell: effect.label.replace(/Concentrating:\s+/, '')});
        const confirmation = await Dialog.confirm({
            title: game.i18n?.localize('sosly.concentration.title'),
            content: confirmContent
        });

        if (!confirmation) {
            return;
        }

        await effect.delete();
    }
}
