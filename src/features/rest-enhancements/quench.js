/**
 * Quench unit tests for Rest Enhancements
 */

import {
    sortClassesByHitDie,
    findBestHitDieRecovery,
    calculateExhaustionReduction,
    calculateHitDiceStats,
    calculateLongRestExhaustionReduction,
    calculateNewExhaustion
} from './calculations';

export function registerRestEnhancementsTests() {
    Hooks.on('quenchReady', quench => {
        quench.registerBatch(
            'sosly.features.rest-enhancements',
            context => {
                const { describe, it, assert } = context;

                describe('sortClassesByHitDie', function() {
                    it('should sort classes by hit die size descending', function() {
                        const classes = [
                            { system: { hd: { denomination: 'd6' } } },
                            { system: { hd: { denomination: 'd12' } } },
                            { system: { hd: { denomination: 'd8' } } },
                            { system: { hd: { denomination: 'd10' } } }
                        ];

                        const sorted = sortClassesByHitDie(classes);
                        assert.equal(sorted[0].system.hd.denomination, 'd12');
                        assert.equal(sorted[1].system.hd.denomination, 'd10');
                        assert.equal(sorted[2].system.hd.denomination, 'd8');
                        assert.equal(sorted[3].system.hd.denomination, 'd6');
                    });

                    it('should handle missing hit die denomination', function() {
                        const classes = [
                            { system: { hd: { denomination: 'd8' } } },
                            { system: { hd: {} } },
                            { system: {} }
                        ];

                        const sorted = sortClassesByHitDie(classes);
                        assert.equal(sorted[0].system.hd.denomination, 'd8');
                        // Classes without hit dice should sort to the end (treated as d0)
                    });
                });

                describe('findBestHitDieRecovery', function() {
                    it('should find class with largest hit die and spent dice', function() {
                        const classes = [
                            { system: { hd: { denomination: 'd6', spent: 0 } } },
                            { system: { hd: { denomination: 'd12', spent: 2 } } },
                            { system: { hd: { denomination: 'd8', spent: 1 } } }
                        ];

                        const best = findBestHitDieRecovery(classes);
                        assert.equal(best.system.hd.denomination, 'd12');
                    });

                    it('should return null when no spent dice available', function() {
                        const classes = [
                            { system: { hd: { denomination: 'd6', spent: 0 } } },
                            { system: { hd: { denomination: 'd12', spent: 0 } } }
                        ];

                        const best = findBestHitDieRecovery(classes);
                        assert.equal(best, null);
                    });

                    it('should handle classes without spent property', function() {
                        const classes = [
                            { system: { hd: { denomination: 'd8' } } },
                            { system: { hd: { denomination: 'd10', spent: 1 } } }
                        ];

                        const best = findBestHitDieRecovery(classes);
                        assert.equal(best.system.hd.denomination, 'd10');
                    });
                });

                describe('calculateExhaustionReduction', function() {
                    it('should reduce exhaustion by 1', function() {
                        assert.equal(calculateExhaustionReduction(3), 2);
                        assert.equal(calculateExhaustionReduction(1), 0);
                    });

                    it('should not go below 0', function() {
                        assert.equal(calculateExhaustionReduction(0), 0);
                    });

                    it('should handle negative values', function() {
                        assert.equal(calculateExhaustionReduction(-1), 0);
                    });
                });

                describe('calculateHitDiceStats', function() {
                    it('should calculate total hit dice from class levels', function() {
                        const classes = [
                            { system: { levels: 5, hd: { spent: 2 } } },
                            { system: { levels: 3, hd: { spent: 1 } } }
                        ];

                        const stats = calculateHitDiceStats(classes);
                        assert.equal(stats.total, 8);
                        assert.equal(stats.spent, 3);
                        assert.equal(stats.available, 5);
                    });

                    it('should handle missing levels or spent', function() {
                        const classes = [
                            { system: { levels: 4 } },
                            { system: { hd: { spent: 1 } } }
                        ];

                        const stats = calculateHitDiceStats(classes);
                        assert.equal(stats.total, 4);
                        assert.equal(stats.spent, 1);
                        assert.equal(stats.available, 3);
                    });

                    it('should handle empty class array', function() {
                        const stats = calculateHitDiceStats([]);
                        assert.equal(stats.total, 0);
                        assert.equal(stats.spent, 0);
                        assert.equal(stats.available, 0);
                    });
                });

                describe('calculateLongRestExhaustionReduction', function() {
                    it('should return CON modifier when positive', function() {
                        assert.equal(calculateLongRestExhaustionReduction(3), 3);
                        assert.equal(calculateLongRestExhaustionReduction(5), 5);
                    });

                    it('should return 1 when CON modifier is 1', function() {
                        assert.equal(calculateLongRestExhaustionReduction(1), 1);
                    });

                    it('should return 1 when CON modifier is 0', function() {
                        assert.equal(calculateLongRestExhaustionReduction(0), 1);
                    });

                    it('should return 1 when CON modifier is negative', function() {
                        assert.equal(calculateLongRestExhaustionReduction(-1), 1);
                        assert.equal(calculateLongRestExhaustionReduction(-3), 1);
                    });
                });

                describe('calculateNewExhaustion', function() {
                    it('should reduce exhaustion by the specified amount', function() {
                        assert.equal(calculateNewExhaustion(5, 2), 3);
                        assert.equal(calculateNewExhaustion(3, 1), 2);
                    });

                    it('should not go below 0', function() {
                        assert.equal(calculateNewExhaustion(2, 5), 0);
                        assert.equal(calculateNewExhaustion(1, 3), 0);
                    });

                    it('should handle zero exhaustion', function() {
                        assert.equal(calculateNewExhaustion(0, 1), 0);
                    });

                    it('should handle exact reduction to zero', function() {
                        assert.equal(calculateNewExhaustion(3, 3), 0);
                    });
                });
            },
            { displayName: 'SoSly: Rest Enhancements' }
        );
    });
}
