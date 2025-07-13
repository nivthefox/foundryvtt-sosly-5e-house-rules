/**
 * Pure calculation functions for rest enhancements
 * These functions can be easily unit tested
 */

/**
 * Sort classes by hit die size (largest first) for recovery priority
 * @param {Array} classItems - Array of class items
 * @returns {Array} Sorted array of classes
 */
export function sortClassesByHitDie(classItems) {
    return classItems.sort((a, b) => {
        const aDie = parseInt((a.system.hd?.denomination || 'd0').slice(1));
        const bDie = parseInt((b.system.hd?.denomination || 'd0').slice(1));
        return bDie - aDie;
    });
}

/**
 * Find the best class to recover a hit die from (largest die with spent dice)
 * @param {Array} classItems - Array of class items
 * @returns {Object|null} Class item to recover from, or null if none available
 */
export function findBestHitDieRecovery(classItems) {
    const sortedClasses = sortClassesByHitDie(classItems);

    for (const classItem of sortedClasses) {
        const spent = classItem.system.hd?.spent || 0;
        if (spent > 0) {
            return classItem;
        }
    }

    return null;
}

/**
 * Calculate exhaustion reduction for short rest
 * @param {number} currentExhaustion - Current exhaustion level
 * @returns {number} New exhaustion level after short rest
 */
export function calculateExhaustionReduction(currentExhaustion) {
    return Math.max(0, currentExhaustion - 1);
}

/**
 * Calculate total hit dice available for an actor
 * @param {Array} classItems - Array of class items
 * @returns {Object} Object with total, spent, and available hit dice
 */
export function calculateHitDiceStats(classItems) {
    let total = 0;
    let spent = 0;

    for (const classItem of classItems) {
        const levels = classItem.system.levels || 0;
        const spentDice = classItem.system.hd?.spent || 0;

        total += levels;
        spent += spentDice;
    }

    return {
        total,
        spent,
        available: total - spent
    };
}
