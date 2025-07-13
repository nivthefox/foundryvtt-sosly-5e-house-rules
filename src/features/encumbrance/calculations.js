/**
 * Pure calculation functions for encumbrance system
 * These functions can be easily unit tested
 */

/**
 * Calculate item weight with equipped bonus (equipped items weigh half)
 * @param {number} baseWeight - Base weight of the item
 * @param {boolean} isEquipped - Whether the item is equipped
 * @returns {number} Effective weight of the item
 */
export function calculateItemWeight(baseWeight, isEquipped) {
    if (isEquipped) {
        return Math.ceil(baseWeight / 2);
    }
    return baseWeight;
}

/**
 * Calculate total weight from a list of items
 * @param {Array} items - Array of items with weight and equipped status
 * @returns {number} Total weight
 */
export function calculateTotalItemsWeight(items) {
    return items.reduce((totalWeight, item) => {
        const weight = calculateItemWeight(item.weight, item.equipped);
        return totalWeight + weight;
    }, 0);
}

/**
 * Calculate currency weight from coin counts
 * @param {Object} currency - Object with coin denominations (cp, sp, ep, gp, pp)
 * @param {number} currencyPerWeight - How many coins per unit weight
 * @returns {number} Weight of currency
 */
export function calculateCurrencyWeight(currency, currencyPerWeight) {
    const numCoins = Object.values(currency).reduce((total, count) => {
        return total + Math.max(count, 0);
    }, 0);

    return numCoins / currencyPerWeight;
}

/**
 * Calculate encumbrance threshold
 * @param {number} base - Base value (usually Strength score)
 * @param {number} multiplier - Threshold multiplier
 * @param {number} bonus - Additional bonus
 * @returns {number} Calculated threshold
 */
export function calculateEncumbranceThreshold(base, multiplier, bonus = 0) {
    return Number((base * multiplier).toFixed(1)) + bonus;
}

/**
 * Calculate encumbrance percentages for UI bars
 * @param {number} currentWeight - Current encumbrance weight
 * @param {number} encumberedThreshold - Weight at which encumbered
 * @param {number} heavilyEncumberedThreshold - Weight at which heavily encumbered
 * @param {number} maximumThreshold - Maximum weight capacity
 * @returns {Object} Percentage values for encumbrance levels
 */
export function calculateEncumbrancePercentages(
    currentWeight,
    encumberedThreshold,
    heavilyEncumberedThreshold,
    maximumThreshold
) {
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    return {
        encumbered: clamp((encumberedThreshold * 100) / maximumThreshold, 0, 100),
        heavilyEncumbered: clamp((heavilyEncumberedThreshold * 100) / maximumThreshold, 0, 100),
        current: clamp((currentWeight * 100) / maximumThreshold, 0, 100)
    };
}

/**
 * Determine encumbrance level based on current weight
 * @param {number} currentWeight - Current weight
 * @param {number} encumberedThreshold - Encumbered threshold
 * @param {number} heavilyEncumberedThreshold - Heavily encumbered threshold
 * @returns {string} Encumbrance level: 'none', 'encumbered', or 'heavily'
 */
export function determineEncumbranceLevel(currentWeight, encumberedThreshold, heavilyEncumberedThreshold) {
    if (currentWeight > heavilyEncumberedThreshold) {
        return 'heavily';
    } else if (currentWeight > encumberedThreshold) {
        return 'encumbered';
    }
    return 'none';
}

/**
 * Calculate size modifier for encumbrance
 * @param {string} size - Actor size (tiny, small, medium, large, etc.)
 * @param {boolean} powerfulBuild - Whether actor has powerful build feature
 * @returns {number} Size multiplier for encumbrance calculations
 */
export function calculateSizeModifier(size, powerfulBuild = false) {
    const sizeMultipliers = {
        tiny: 0.5,
        small: 1,
        medium: 1,
        large: 2,
        huge: 4,
        gargantuan: 8
    };

    let multiplier = sizeMultipliers[size] || 1;

    // Powerful build increases effective size by one category for carrying capacity
    if (powerfulBuild && multiplier < 8) {
        const sizes = Object.keys(sizeMultipliers);
        const currentIndex = sizes.indexOf(size);
        if (currentIndex !== -1 && currentIndex < sizes.length - 1) {
            const nextSize = sizes[currentIndex + 1];
            multiplier = sizeMultipliers[nextSize];
        }
    }

    return multiplier;
}
