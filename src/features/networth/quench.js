/**
 * Quench unit tests for Net Worth Calculator
 */

import { calculateNetWorth, countCoinValues } from './calculator';

export function registerNetworthTests() {
    Hooks.on('quenchReady', quench => {
        quench.registerBatch(
            'sosly.features.networth',
            context => {
                const { describe, it, assert } = context;

                describe('countCoinValues', function() {
                    it('should calculate currency value correctly', function() {
                        const currency = { cp: 100, sp: 50, ep: 10, gp: 5, pp: 1 };
                        const result = countCoinValues(currency);
                        assert.equal(result, 26); // 1 + 5 + 5 + 5 + 10 in gp
                    });

                    it('should handle empty currency', function() {
                        const result = countCoinValues({});
                        assert.equal(result, 0);
                    });

                    it('should handle missing denominations', function() {
                        const currency = { gp: 10 };
                        const result = countCoinValues(currency);
                        assert.equal(result, 10);
                    });

                    it('should handle partial currency object', function() {
                        const currency = { cp: 150, gp: 3 };
                        const result = countCoinValues(currency);
                        assert.equal(result, 4.5); // 1.5 + 3 in gp
                    });
                });

                describe('calculateNetWorth', function() {
                    it('should handle container with no items', function() {
                        const container = {
                            system: { currency: { gp: 5 } }
                        };
                        const result = calculateNetWorth(container);
                        assert.equal(result, 5);
                    });

                    it('should calculate item values correctly', function() {
                        const mockItem1 = {
                            type: 'equipment',
                            system: {
                                price: { value: 10, denomination: 'gp' },
                                quantity: 2
                            }
                        };
                        const mockItem2 = {
                            type: 'equipment',
                            system: {
                                price: { value: 50, denomination: 'sp' },
                                quantity: 1
                            }
                        };

                        const container = {
                            system: { currency: {} },
                            items: {
                                values: () => [mockItem1, mockItem2]
                            }
                        };

                        const result = calculateNetWorth(container);
                        assert.equal(result, 25); // 20gp + 5gp
                    });

                    it('should handle containers recursively', function() {
                        const nestedContainer = {
                            type: 'container',
                            system: { currency: { gp: 2 } },
                            items: { values: () => [] }
                        };

                        const container = {
                            system: { currency: { gp: 5 } },
                            items: {
                                values: () => [nestedContainer]
                            }
                        };

                        const result = calculateNetWorth(container);
                        assert.equal(result, 7); // 5 + 2 in gp
                    });

                    it('should handle items without price', function() {
                        const mockItem = {
                            type: 'equipment',
                            system: {
                                quantity: 1
                            }
                        };

                        const container = {
                            system: { currency: { gp: 5 } },
                            items: {
                                values: () => [mockItem]
                            }
                        };

                        const result = calculateNetWorth(container);
                        assert.equal(result, 5); // Only currency value
                    });
                });
            },
            { displayName: 'SoSly: Net Worth Calculations' }
        );
    });
}
