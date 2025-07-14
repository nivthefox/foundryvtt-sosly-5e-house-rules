/**
 * Quench unit tests for Breather Calculations
 */

import {
    findBestHitDie,
    calculateTotalHitDice,
    formatHitDieOptions,
    canRollHitDice
} from './calculations';

export function registerBreatherTests() {
    Hooks.on('quenchReady', quench => {
        quench.registerBatch(
            'sosly.features.breather',
            context => {
                const { describe, it, assert } = context;

                describe('Settings Registration', function() {
                    it('should register breather setting with correct properties', function() {
                        const setting = game.settings.settings.get('sosly-5e-house-rules.breather');

                        assert.isNotNull(setting, 'Breather setting should be registered');
                        assert.equal(setting.scope, 'world', 'Setting should have world scope');
                        assert.equal(setting.type, Boolean, 'Setting should be Boolean type');
                        assert.equal(setting.default, true, 'Setting should default to true');
                        assert.equal(setting.config, true, 'Setting should be configurable');
                        assert.equal(setting.restricted, true, 'Setting should be restricted');
                        assert.equal(setting.requiresReload, true, 'Setting should require reload');
                    });
                });

                describe('findBestHitDie', function() {
                    it('should find first available hit die', function() {
                        const availableHD = { d6: 0, d8: 2, d10: 1, d12: 0 };
                        const result = findBestHitDie(availableHD);
                        assert.equal(result, 'd8');
                    });

                    it('should return null when no hit dice available', function() {
                        const availableHD = { d6: 0, d8: 0, d10: 0 };
                        const result = findBestHitDie(availableHD);
                        assert.equal(result, null);
                    });

                    it('should handle empty object', function() {
                        const result = findBestHitDie({});
                        assert.equal(result, null);
                    });

                    it('should find first available in order', function() {
                        const availableHD = { d6: 1, d8: 2, d10: 3 };
                        const result = findBestHitDie(availableHD);
                        assert.equal(result, 'd6'); // First available
                    });
                });

                describe('calculateTotalHitDice', function() {
                    it('should sum all hit dice counts', function() {
                        const availableHD = { d6: 2, d8: 3, d10: 1 };
                        const result = calculateTotalHitDice(availableHD);
                        assert.equal(result, 6);
                    });

                    it('should handle zero counts', function() {
                        const availableHD = { d6: 0, d8: 0, d10: 0 };
                        const result = calculateTotalHitDice(availableHD);
                        assert.equal(result, 0);
                    });

                    it('should handle empty object', function() {
                        const result = calculateTotalHitDice({});
                        assert.equal(result, 0);
                    });
                });

                describe('formatHitDieOptions', function() {
                    it('should format options correctly', function() {
                        const availableHD = { d6: 2, d8: 1 };
                        const result = formatHitDieOptions(availableHD, 'available');

                        assert.equal(result.length, 2);
                        assert.equal(result[0].value, 'd6');
                        assert.equal(result[0].label, 'd6 (2 available)');
                        assert.equal(result[1].value, 'd8');
                        assert.equal(result[1].label, 'd8 (1 available)');
                    });

                    it('should use default label when none provided', function() {
                        const availableHD = { d10: 3 };
                        const result = formatHitDieOptions(availableHD);

                        assert.equal(result[0].label, 'd10 (3 available)');
                    });

                    it('should handle empty object', function() {
                        const result = formatHitDieOptions({});
                        assert.equal(result.length, 0);
                    });
                });

                describe('canRollHitDice', function() {
                    it('should return true when hit dice available', function() {
                        const availableHD = { d6: 0, d8: 1, d10: 0 };
                        assert.equal(canRollHitDice(availableHD), true);
                    });

                    it('should return false when no hit dice available', function() {
                        const availableHD = { d6: 0, d8: 0, d10: 0 };
                        assert.equal(canRollHitDice(availableHD), false);
                    });

                    it('should return false for empty object', function() {
                        assert.equal(canRollHitDice({}), false);
                    });

                    it('should return true when multiple dice available', function() {
                        const availableHD = { d6: 2, d8: 3, d10: 1 };
                        assert.equal(canRollHitDice(availableHD), true);
                    });
                });
            },
            { displayName: 'SoSly: Breather Calculations' }
        );
    });
}
