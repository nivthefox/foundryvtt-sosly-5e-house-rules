/**
 * Net Worth Calculator
 * Calculates total value of actor's currency and items
 */

const coinValues = {
    pp: 10.00,
    gp: 1.00,
    ep: 0.50,
    sp: 0.1,
    cp: 0.01
};

/**
 * Count the total value of coins in gold pieces
 * @param {object} currency - Currency object with coin denominations
 * @returns {number} Total value in gold pieces
 */
export function countCoinValues(currency) {
    let coins = 0;
    for (const [key, value] of Object.entries(currency)) {
        coins += value * coinValues[key];
    }
    return coins;
}

/**
 * Calculate the net worth of a container (actor or item)
 * @param {Actor|Item} container - The container to calculate net worth for
 * @returns {number} Total net worth in gold pieces
 */
export function calculateNetWorth(container) {
    let netWorth = countCoinValues(container.system.currency);

    if (container.items === undefined) {
        return netWorth;
    }

    for (const item of container.items.values()) {
        if (item.type === 'container') {
            netWorth += calculateNetWorth(item);
        }

        if (item.system.price?.value !== undefined) {
            const value = {};
            value[item.system.price.denomination ?? 'gp'] = item.system.price.value;
            netWorth += countCoinValues(value) * item.system.quantity;
        }
    }

    return netWorth;
}
