/**
 * Wrapper for _prepareSpellsContext that filters spell school options
 * to only include schools the actor actually has spells for.
 *
 * @param {Function} wrapped - The original _prepareSpellsContext method
 * @param {object} context - The render context
 * @param {object} options - Render options
 * @returns {Promise<object>} The modified context
 */
export async function filterSpellSchools(wrapped, context, options) {
    context = await wrapped(context, options);

    if (!context.listControls?.filters) {
        return context;
    }

    const spellSchoolKeys = new Set(Object.keys(CONFIG.DND5E.spellSchools));
    const actorSpellSchools = new Set(
        this.actor.items
            .filter(item => item.type === 'spell' && item.system.school)
            .map(item => item.system.school)
    );

    context.listControls.filters = context.listControls.filters.filter(filter => {
        if (!spellSchoolKeys.has(filter.key)) {
            return true;
        }
        return actorSpellSchools.has(filter.key);
    });

    return context;
}
