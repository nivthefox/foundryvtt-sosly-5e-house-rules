/**
 * Pure calculation functions for Imperiled system
 * These functions can be easily unit tested
 */

/**
 * Determine if an actor should be offered the imperiled choice
 * @param {number} currentHP - Current hit points
 * @param {number} maxHP - Maximum hit points
 * @param {number} exhaustionLevel - Current exhaustion level
 * @param {boolean} hasImperiledEffect - Whether actor already has imperiled effect
 * @returns {boolean} True if actor should be offered imperiled choice
 */
export function shouldOfferImperiledChoice(currentHP, maxHP, exhaustionLevel, hasImperiledEffect) {
    return maxHP > 0 && currentHP <= 0 && exhaustionLevel < 5 && !hasImperiledEffect;
}

/**
 * Determine if imperiled effect should be removed
 * @param {number} currentHP - Current hit points
 * @param {boolean} hasImperiledEffect - Whether actor has imperiled effect
 * @returns {boolean} True if imperiled effect should be removed
 */
export function shouldRemoveImperiled(currentHP, hasImperiledEffect) {
    return currentHP > 0 && hasImperiledEffect;
}

/**
 * Calculate new exhaustion level when choosing to remain conscious
 * @param {number} currentExhaustion - Current exhaustion level
 * @returns {number} New exhaustion level (capped at 5)
 */
export function calculateImperiledExhaustion(currentExhaustion) {
    return Math.min(currentExhaustion + 1, 5);
}

/**
 * Determine if actor can choose to remain conscious (not at max exhaustion)
 * @param {number} exhaustionLevel - Current exhaustion level
 * @returns {boolean} True if actor can remain conscious
 */
export function canRemainConscious(exhaustionLevel) {
    return exhaustionLevel < 5;
}

/**
 * Generate status message for imperiled state change
 * @param {string} actorName - Name of the actor
 * @param {string} action - Type of action ('gained', 'removed')
 * @returns {string} Formatted status message
 */
export function generateImperiledMessage(actorName, action) {
    switch (action) {
        case 'gained':
            return `${actorName} has gained a level of Exhaustion to remain conscious!`;
        case 'removed':
            return `${actorName} is no longer imperiled.`;
        default:
            return `${actorName} imperiled status changed.`;
    }
}
