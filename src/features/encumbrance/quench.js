/**
 * Quench unit tests for Encumbrance Calculations
 */

import {
    calculateItemWeight,
    calculateTotalItemsWeight,
    calculateCurrencyWeight,
    calculateEncumbranceThreshold,
    calculateEncumbrancePercentages,
    determineEncumbranceLevel,
    calculateSizeModifier
} from './calculations';

export function registerEncumbranceTests() {
    Hooks.on('quenchReady', quench => {
        quench.registerBatch(
            'sosly.features.encumbrance',
            context => {
                const { describe, it, assert } = context;

                describe('calculateItemWeight', function() {
                    it('should return full weight for unequipped items', function() {
                        assert.equal(calculateItemWeight(10, false), 10);
                        assert.equal(calculateItemWeight(5.5, false), 5.5);
                    });

                    it('should return half weight (rounded up) for equipped items', function() {
                        assert.equal(calculateItemWeight(10, true), 5);
                        assert.equal(calculateItemWeight(5, true), 3); // Math.ceil(2.5)
                        assert.equal(calculateItemWeight(1, true), 1); // Math.ceil(0.5)
                    });

                    it('should handle zero weight', function() {
                        assert.equal(calculateItemWeight(0, false), 0);
                        assert.equal(calculateItemWeight(0, true), 0);
                    });
                });

                describe('calculateTotalItemsWeight', function() {
                    it('should sum weights correctly', function() {
                        const items = [
                            { weight: 10, equipped: false },
                            { weight: 6, equipped: true }, // becomes 3
                            { weight: 2, equipped: false }
                        ];

                        const total = calculateTotalItemsWeight(items);
                        assert.equal(total, 15); // 10 + 3 + 2
                    });

                    it('should handle empty array', function() {
                        assert.equal(calculateTotalItemsWeight([]), 0);
                    });

                    it('should handle all equipped items', function() {
                        const items = [
                            { weight: 8, equipped: true }, // becomes 4
                            { weight: 2, equipped: true }  // becomes 1
                        ];

                        const total = calculateTotalItemsWeight(items);
                        assert.equal(total, 5);
                    });
                });

                describe('calculateCurrencyWeight', function() {
                    it('should calculate currency weight correctly', function() {
                        const currency = { cp: 100, sp: 50, gp: 10 };
                        const weight = calculateCurrencyWeight(currency, 50); // 50 coins per pound
                        assert.equal(weight, 3.2); // 160 coins / 50
                    });

                    it('should handle negative coin values', function() {
                        const currency = { cp: -10, sp: 50, gp: 10 };
                        const weight = calculateCurrencyWeight(currency, 50);
                        assert.equal(weight, 1.2); // (0 + 50 + 10) / 50
                    });

                    it('should handle empty currency', function() {
                        const weight = calculateCurrencyWeight({}, 50);
                        assert.equal(weight, 0);
                    });
                });

                describe('calculateEncumbranceThreshold', function() {
                    it('should calculate basic threshold', function() {
                        const threshold = calculateEncumbranceThreshold(15, 5); // STR 15, x5 multiplier
                        assert.equal(threshold, 75);
                    });

                    it('should include bonus', function() {
                        const threshold = calculateEncumbranceThreshold(15, 5, 10);
                        assert.equal(threshold, 85); // (15 * 5) + 10
                    });

                    it('should handle decimal multipliers', function() {
                        const threshold = calculateEncumbranceThreshold(15, 0.5);
                        assert.equal(threshold, 7.5);
                    });
                });

                describe('calculateEncumbrancePercentages', function() {
                    it('should calculate percentages correctly', function() {
                        const percentages = calculateEncumbrancePercentages(60, 75, 150, 225);
                        // encumbered: 75/225 = 33.33%, heavily: 150/225 = 66.67%, current: 60/225 = 26.67%

                        assert.approximately(percentages.encumbered, 33.3, 0.1);
                        assert.approximately(percentages.heavilyEncumbered, 66.7, 0.1);
                        assert.approximately(percentages.current, 26.7, 0.1);
                    });

                    it('should clamp values between 0 and 100', function() {
                        const percentages = calculateEncumbrancePercentages(300, 75, 150, 225);
                        // current would be over 100%

                        assert.equal(percentages.current, 100);
                        assert.approximately(percentages.encumbered, 33.3, 0.1);
                    });
                });

                describe('determineEncumbranceLevel', function() {
                    it('should return correct encumbrance levels', function() {
                        assert.equal(determineEncumbranceLevel(50, 75, 150), 'none');
                        assert.equal(determineEncumbranceLevel(100, 75, 150), 'encumbered');
                        assert.equal(determineEncumbranceLevel(200, 75, 150), 'heavily');
                    });

                    it('should handle edge cases', function() {
                        assert.equal(determineEncumbranceLevel(75, 75, 150), 'none'); // exactly at threshold
                        assert.equal(determineEncumbranceLevel(150, 75, 150), 'encumbered'); // exactly at heavily threshold
                    });
                });

                describe('calculateSizeModifier', function() {
                    it('should return correct size multipliers', function() {
                        assert.equal(calculateSizeModifier('tiny'), 0.5);
                        assert.equal(calculateSizeModifier('small'), 1);
                        assert.equal(calculateSizeModifier('medium'), 1);
                        assert.equal(calculateSizeModifier('large'), 2);
                        assert.equal(calculateSizeModifier('huge'), 4);
                        assert.equal(calculateSizeModifier('gargantuan'), 8);
                    });

                    it('should handle powerful build feature', function() {
                        assert.equal(calculateSizeModifier('medium', true), 2); // becomes large
                        assert.equal(calculateSizeModifier('small', true), 1); // becomes medium
                        assert.equal(calculateSizeModifier('gargantuan', true), 8); // stays gargantuan
                    });

                    it('should handle unknown sizes', function() {
                        assert.equal(calculateSizeModifier('unknown'), 1);
                    });
                });
            },
            { displayName: 'SoSly: Encumbrance Calculations' }
        );
    });
}
