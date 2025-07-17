/**
 * Quench unit tests for Breather Calculations and Class Features
 */

import {
    findBestHitDie,
    calculateTotalHitDice,
    formatHitDieOptions,
    canRollHitDice
} from './calculations';
import {
    getRecoverableFeatures,
    calculateRecoveryAmount,
    featureConfigs
} from './class-features';

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

                describe('Class Feature Detection', function() {
                    let mockActor;

                    this.beforeEach(function() {
                        // Base mock actor with HD available
                        mockActor = {
                            name: 'Test Character',
                            system: {
                                attributes: {
                                    hd: {
                                        smallestAvailable: 6,
                                        value: 5,
                                        max: 5
                                    }
                                }
                            },
                            items: []
                        };
                    });

                    it('should detect recoverable features with available uses', function() {
                        // Add features to mock actor
                        mockActor.items.push({
                            id: 'rage-id',
                            name: 'Rage',
                            type: 'feat',
                            system: {
                                uses: {
                                    value: 2,
                                    max: 4,
                                    spent: 2
                                }
                            }
                        });

                        mockActor.items.push({
                            id: 'bardic-id',
                            name: 'Bardic Inspiration',
                            type: 'feat',
                            system: {
                                uses: {
                                    value: 0,
                                    max: 5,
                                    spent: 5
                                }
                            }
                        });

                        const features = getRecoverableFeatures(mockActor);

                        assert.equal(features.length, 2);
                        assert.equal(features[0].name, 'Bardic Inspiration');
                        assert.equal(features[1].name, 'Rage');
                    });

                    it('should exclude features at maximum uses', function() {
                        mockActor.items.push({
                            id: 'rage-id',
                            name: 'Rage',
                            type: 'feat',
                            system: {
                                uses: {
                                    value: 4,
                                    max: 4,
                                    spent: 0
                                }
                            }
                        });

                        const features = getRecoverableFeatures(mockActor);
                        assert.equal(features.length, 0);
                    });

                    it('should exclude features without uses tracking', function() {
                        mockActor.items.push({
                            id: 'feat-id',
                            name: 'Some Feature',
                            type: 'feat',
                            system: {}
                        });

                        const features = getRecoverableFeatures(mockActor);
                        assert.equal(features.length, 0);
                    });

                    it('should return features sorted alphabetically', function() {
                        mockActor.items.push({
                            id: '1',
                            name: 'Rage',
                            type: 'feat',
                            system: { uses: { value: 2, max: 4, spent: 2 } }
                        });

                        mockActor.items.push({
                            id: '2',
                            name: 'Channel Divinity',
                            type: 'feat',
                            system: { uses: { value: 0, max: 2, spent: 2 } }
                        });

                        mockActor.items.push({
                            id: '3',
                            name: 'Bardic Inspiration',
                            type: 'feat',
                            system: { uses: { value: 1, max: 5, spent: 4 } }
                        });

                        const features = getRecoverableFeatures(mockActor);

                        assert.equal(features.length, 3);
                        assert.equal(features[0].name, 'Bardic Inspiration');
                        assert.equal(features[1].name, 'Channel Divinity');
                        assert.equal(features[2].name, 'Rage');
                    });

                    it('should include recovery amount in feature data', function() {
                        mockActor.items.push({
                            id: 'bardic-id',
                            name: 'Bardic Inspiration',
                            type: 'feat',
                            system: {
                                uses: {
                                    value: 1,
                                    max: 5,
                                    spent: 4
                                }
                            }
                        });

                        const features = getRecoverableFeatures(mockActor);

                        assert.property(features[0], 'recoveryAmount');
                        assert.equal(features[0].recoveryAmount, 1); // Single recovery
                        assert.equal(features[0].label, 'Regain 1 Bardic Inspiration');
                    });

                    it('should calculate half recovery for appropriate features', function() {
                        mockActor.items.push({
                            id: 'lay-on-hands-id',
                            name: 'Lay on Hands',
                            type: 'feat',
                            system: {
                                uses: {
                                    value: 5,
                                    max: 50,
                                    spent: 45
                                }
                            }
                        });

                        const features = getRecoverableFeatures(mockActor);

                        assert.equal(features[0].recoveryAmount, 25); // Half of max
                        assert.equal(features[0].label, 'Regain 25 Lay on Hands');
                    });
                });

                describe('Recovery Amount Calculations', function() {
                    it('should calculate single recovery correctly', function() {
                        const feature = {
                            system: {
                                uses: {
                                    value: 2,
                                    max: 4,
                                    spent: 2
                                }
                            }
                        };

                        const amount = calculateRecoveryAmount(feature, 'single');
                        assert.equal(amount, 1);
                    });

                    it('should calculate half recovery correctly', function() {
                        const feature = {
                            system: {
                                uses: {
                                    value: 10,
                                    max: 50,
                                    spent: 40
                                }
                            }
                        };

                        const amount = calculateRecoveryAmount(feature, 'half');
                        assert.equal(amount, 25);
                    });

                    it('should round down half recovery', function() {
                        const feature = {
                            system: {
                                uses: {
                                    value: 0,
                                    max: 5,
                                    spent: 5
                                }
                            }
                        };

                        const amount = calculateRecoveryAmount(feature, 'half');
                        assert.equal(amount, 2); // Floor of 2.5
                    });

                    it('should cap recovery at available uses', function() {
                        const feature = {
                            system: {
                                uses: {
                                    value: 3,
                                    max: 4,
                                    spent: 1
                                }
                            }
                        };

                        const amount = calculateRecoveryAmount(feature, 'single');
                        assert.equal(amount, 1); // Can only recover 1 to reach max
                    });

                    it('should cap half recovery at available uses', function() {
                        const feature = {
                            system: {
                                uses: {
                                    value: 45,
                                    max: 50,
                                    spent: 5
                                }
                            }
                        };

                        const amount = calculateRecoveryAmount(feature, 'half');
                        assert.equal(amount, 5); // Can only recover 5 to reach max, not 25
                    });
                });

                describe('Feature Registry Configuration', function() {
                    it('should match known features to recovery types', function() {
                        // This tests the configuration mapping

                        const expectedConfigs = [
                            { name: 'Rage', key: 'rage', recovery: 'single' },
                            { name: 'Bardic Inspiration', key: 'bardic-inspiration', recovery: 'single' },
                            { name: "Monk's Focus", key: 'monks-focus', recovery: 'half' },
                            { name: 'Channel Divinity', key: 'channel-divinity', recovery: 'single' },
                            { name: 'Lay on Hands', key: 'lay-on-hands', recovery: 'half' },
                            { name: 'Favored Enemy', key: 'favored-enemy', recovery: 'single' },
                            { name: 'Font of Magic', key: 'font-of-magic', recovery: 'half' }
                        ];

                        expectedConfigs.forEach(expected => {
                            const found = featureConfigs.find(f => f.name === expected.name);
                            assert.exists(found, `Feature ${expected.name} should exist in configs`);
                            assert.equal(found.recovery, expected.recovery);
                        });
                    });
                });

            },
            { displayName: 'SoSly: Breather Calculations and Class Features' }
        );
    });
}
