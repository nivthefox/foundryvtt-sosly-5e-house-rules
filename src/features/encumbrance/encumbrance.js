/**
 * Enhanced encumbrance calculations for actors
 * Equipped items weigh half as much as carried items
 */

import {
    calculateItemWeight,
    calculateCurrencyWeight,
    calculateEncumbranceThreshold,
    calculateEncumbrancePercentages
} from './calculations';

/**
 * Calculate encumbrance details for an Actor (for use in mixin).
 * Equipped items weigh half as much as carried items.
 * @this {CharacterData|NPCData|VehicleData}
 * @param {object} rollData - The Actor's roll data
 * @param {object} [options]
 * @param {Function} [options.validateItem] - Determine whether an item's weight should count toward encumbrance
 */
export function prepareEncumbrance(rollData, { validateItem } = {}) {
    const config = CONFIG.DND5E.encumbrance;
    const encumbrance = this.attributes.encumbrance ??= {};
    const baseUnits = CONFIG.DND5E.encumbrance.baseUnits[this.parent.type]
        ?? CONFIG.DND5E.encumbrance.baseUnits.default;
    const unitSystem = game.settings.get('dnd5e', 'metricWeightUnits') ? 'metric' : 'imperial';

    // Get the total weight from items
    let weight = this.parent.items
        .filter(item => !['race', 'feat', 'class', 'subclass', 'feature', 'spell'].includes(item.type))
        .filter(item => !item.container && (validateItem?.(item) ?? true))
        .reduce((weight, item) => {
            const isEquipped = item.system.equipped;
            const itemWeight = (item.system.totalWeightIn?.(baseUnits[unitSystem]) ?? 0);
            return weight + calculateItemWeight(itemWeight, isEquipped);
        }, 0);

    // [Optional] add Currency Weight (for non-transformed actors)
    const currency = this.currency;
    if (game.settings.get('dnd5e', 'currencyWeight') && currency) {
        const currencyPerWeight = config.currencyPerWeight[unitSystem];
        const currencyWeight = calculateCurrencyWeight(currency, currencyPerWeight);
        weight += dnd5e.utils.convertWeight(
            currencyWeight,
            config.baseUnits.default[unitSystem],
            baseUnits[unitSystem]
        );
    }

    // Determine the Encumbrance size class
    const keys = Object.keys(CONFIG.DND5E.actorSizes);
    const index = keys.findIndex(k => k === this.traits?.size);
    const sizeConfig = CONFIG.DND5E.actorSizes[
        keys[this.parent.flags.dnd5e?.powerfulBuild ? Math.min(index + 1, keys.length - 1) : index]
    ];
    const sizeMod = sizeConfig?.capacityMultiplier ?? sizeConfig?.token ?? 1;
    let maximumMultiplier;

    const calculateThreshold = threshold => {
        let base = this.abilities.str?.value ?? 10;
        const bonus = dnd5e.utils.simplifyBonus(encumbrance.bonuses?.[threshold], rollData)
            + dnd5e.utils.simplifyBonus(encumbrance.bonuses?.overall, rollData);
        let multiplier = dnd5e.utils.simplifyBonus(encumbrance.multipliers[threshold], rollData)
            * dnd5e.utils.simplifyBonus(encumbrance.multipliers.overall, rollData);
        if (threshold === 'maximum') maximumMultiplier = multiplier;
        if (this.parent.type === 'vehicle') base = this.attributes.capacity.cargo;
        else multiplier *= (config.threshold[threshold]?.[unitSystem] ?? 1) * sizeMod;
        return calculateEncumbranceThreshold(base, multiplier, bonus);
    };

    // Populate final Encumbrance values
    encumbrance.value = weight.toNearest(0.1);
    encumbrance.thresholds = {
        encumbered: calculateThreshold('encumbered'),
        heavilyEncumbered: calculateThreshold('heavilyEncumbered'),
        maximum: calculateThreshold('maximum')
    };
    encumbrance.max = encumbrance.thresholds.maximum;
    encumbrance.mod = (sizeMod * maximumMultiplier).toNearest(0.1);

    const percentages = calculateEncumbrancePercentages(
        encumbrance.value,
        encumbrance.thresholds.encumbered,
        encumbrance.thresholds.heavilyEncumbered,
        encumbrance.max
    );

    encumbrance.stops = {
        encumbered: percentages.encumbered,
        heavilyEncumbered: percentages.heavilyEncumbered
    };
    encumbrance.pct = percentages.current;
    encumbrance.encumbered = encumbrance.value > encumbrance.thresholds.heavilyEncumbered;
}
