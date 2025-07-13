/**
 * Quench unit tests for Imperiled Calculations
 */

import {
    shouldOfferImperiledChoice,
    shouldRemoveImperiled,
    calculateImperiledExhaustion,
    canRemainConscious,
    generateImperiledMessage
} from './calculations';

export function registerImperiledTests() {
    Hooks.on('quenchReady', quench => {
        quench.registerBatch(
            'sosly.features.imperiled',
            context => {
                const { describe, it, assert } = context;

                describe('shouldOfferImperiledChoice', function() {
                    it('should offer choice when at 0 HP, low exhaustion, no effect', function() {
                        assert.equal(shouldOfferImperiledChoice(0, 2, false), true);
                        assert.equal(shouldOfferImperiledChoice(-5, 4, false), true);
                    });

                    it('should not offer choice when HP > 0', function() {
                        assert.equal(shouldOfferImperiledChoice(1, 2, false), false);
                        assert.equal(shouldOfferImperiledChoice(10, 0, false), false);
                    });

                    it('should not offer choice when exhaustion >= 5', function() {
                        assert.equal(shouldOfferImperiledChoice(0, 5, false), false);
                        assert.equal(shouldOfferImperiledChoice(-10, 6, false), false);
                    });

                    it('should not offer choice when already imperiled', function() {
                        assert.equal(shouldOfferImperiledChoice(0, 2, true), false);
                    });
                });

                describe('shouldRemoveImperiled', function() {
                    it('should remove when HP > 0 and has effect', function() {
                        assert.equal(shouldRemoveImperiled(1, true), true);
                        assert.equal(shouldRemoveImperiled(20, true), true);
                    });

                    it('should not remove when HP <= 0', function() {
                        assert.equal(shouldRemoveImperiled(0, true), false);
                        assert.equal(shouldRemoveImperiled(-5, true), false);
                    });

                    it('should not remove when no effect present', function() {
                        assert.equal(shouldRemoveImperiled(10, false), false);
                        assert.equal(shouldRemoveImperiled(0, false), false);
                    });
                });

                describe('calculateImperiledExhaustion', function() {
                    it('should increase exhaustion by 1', function() {
                        assert.equal(calculateImperiledExhaustion(0), 1);
                        assert.equal(calculateImperiledExhaustion(3), 4);
                    });

                    it('should cap at 5', function() {
                        assert.equal(calculateImperiledExhaustion(4), 5);
                        assert.equal(calculateImperiledExhaustion(5), 5);
                        assert.equal(calculateImperiledExhaustion(10), 5);
                    });

                    it('should handle negative values', function() {
                        assert.equal(calculateImperiledExhaustion(-1), 0);
                    });
                });

                describe('canRemainConscious', function() {
                    it('should allow when exhaustion < 5', function() {
                        assert.equal(canRemainConscious(0), true);
                        assert.equal(canRemainConscious(4), true);
                    });

                    it('should not allow when exhaustion >= 5', function() {
                        assert.equal(canRemainConscious(5), false);
                        assert.equal(canRemainConscious(6), false);
                    });
                });

                describe('generateImperiledMessage', function() {
                    it('should generate correct messages', function() {
                        const name = 'Test Character';

                        assert.equal(
                            generateImperiledMessage(name, 'gained'),
                            'Test Character has gained a level of Exhaustion to remain conscious!'
                        );

                        assert.equal(
                            generateImperiledMessage(name, 'removed'),
                            'Test Character is no longer imperiled.'
                        );

                        assert.equal(
                            generateImperiledMessage(name, 'unknown'),
                            'Test Character imperiled status changed.'
                        );
                    });

                    it('should handle empty names', function() {
                        const result = generateImperiledMessage('', 'gained');
                        assert.equal(result, ' has gained a level of Exhaustion to remain conscious!');
                    });
                });
            },
            { displayName: 'SoSly: Imperiled Calculations' }
        );
    });
}
