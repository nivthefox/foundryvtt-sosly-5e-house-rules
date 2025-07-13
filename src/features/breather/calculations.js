/**
 * Pure calculation functions for Breather system
 * These functions can be easily unit tested
 */

/**
 * Find the best available hit die denomination for rolling
 * @param {Object} availableHD - Object with hit die sizes and counts (e.g., {d6: 2, d8: 1, d10: 0})
 * @returns {string|null} Best hit die denomination (e.g., 'd8') or null if none available
 */
export function findBestHitDie(availableHD) {
    const dice = Object.entries(availableHD);
    const available = dice.find(([denomination, count]) => count > 0);
    return available ? available[0] : null;
}

/**
 * Calculate total available hit dice
 * @param {Object} availableHD - Object with hit die sizes and counts
 * @returns {number} Total number of available hit dice
 */
export function calculateTotalHitDice(availableHD) {
    return Object.values(availableHD).reduce((total, count) => total + count, 0);
}

/**
 * Format hit die options for UI display
 * @param {Object} availableHD - Object with hit die sizes and counts
 * @param {string} availableLabel - Localized "available" text
 * @returns {Array} Array of option objects with value and label
 */
export function formatHitDieOptions(availableHD, availableLabel = 'available') {
    return Object.entries(availableHD).map(([denomination, count]) => ({
        value: denomination,
        label: `${denomination} (${count} ${availableLabel})`
    }));
}

/**
 * Determine if an actor can roll hit dice
 * @param {Object} availableHD - Object with hit die sizes and counts
 * @returns {boolean} True if actor has any hit dice available
 */
export function canRollHitDice(availableHD) {
    return calculateTotalHitDice(availableHD) > 0;
}
