/**
 * Encumbrance Hooks
 * Handles equipment changes that affect encumbrance
 */

/**
 * Register hooks for encumbrance updates
 */
export function registerEncumbranceHooks() {
    // Update encumbrance when items are equipped/unequipped
    Hooks.on('updateItem', async (item, changes, options, id) => {
        if (changes.equipped !== undefined) {
            if (options.parent) {
                options.parent.prepareDerivedData();
            }
        }
    });
}
