/**
 * Class feature detection and recovery configuration for Breather
 */

// Feature registry configuration
export const featureConfigs = [
    { name: 'Rage', key: 'rage', recovery: 'single' },
    { name: 'Bardic Inspiration', key: 'bardic-inspiration', recovery: 'single' },
    { name: "Monk's Focus", key: 'monks-focus', recovery: 'half' },
    { name: 'Channel Divinity', key: 'channel-divinity', recovery: 'single' },
    { name: 'Lay on Hands', key: 'lay-on-hands', recovery: 'half' },
    { name: 'Favored Enemy', key: 'favored-enemy', recovery: 'single' },
    { name: 'Font of Magic', key: 'font-of-magic', recovery: 'half' }
];

/**
 * Get recoverable features for an actor
 * @param {Actor5e} actor - The actor to check
 * @returns {Array} Array of recoverable features with recovery amounts
 */
export function getRecoverableFeatures(actor) {
    const features = [];

    // Check each configured feature
    for (const config of featureConfigs) {
    // Find the feature on the actor
        const feature = actor.items.find(i =>
            i.type === 'feat'
      && i.name === config.name
        );

        if (!feature) continue;

        // Check if feature has uses tracking
        const uses = feature.system.uses;
        if (!uses || uses.max === null) continue;

        // Check if feature is not at max uses
        const currentUses = uses.value ?? 0;
        if (currentUses >= uses.max) continue;

        // Calculate recovery amount
        const recoveryAmount = calculateRecoveryAmount(feature, config.recovery);
        if (recoveryAmount <= 0) continue;

        // Add to recoverable features
        features.push({
            id: feature.id,
            name: feature.name,
            key: config.key,
            recoveryAmount,
            recoveryType: config.recovery,
            label: `Regain ${recoveryAmount} ${feature.name}`,
            feature
        });
    }

    // Sort alphabetically by name
    return features.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Calculate the recovery amount for a feature
 * @param {Item5e} feature - The feature item
 * @param {string} recoveryType - 'single' or 'half'
 * @returns {number} Number of uses to recover
 */
export function calculateRecoveryAmount(feature, recoveryType) {
    const uses = feature.system.uses;
    if (!uses || uses.max === null) return 0;

    const currentUses = uses.value ?? 0;
    const maxUses = uses.max;
    const availableToRecover = maxUses - currentUses;

    if (recoveryType === 'single') {
        return Math.min(1, availableToRecover);
    } else if (recoveryType === 'half') {
        const halfMax = Math.floor(maxUses / 2);
        return Math.min(halfMax, availableToRecover);
    }

    return 0;
}
