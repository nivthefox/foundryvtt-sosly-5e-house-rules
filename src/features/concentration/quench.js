import { handleConcentrationRest } from './rest-handler';

export function registerConcentrationTests() {
    Hooks.on('quenchReady', quench => {
        quench.registerBatch(
            'sosly.features.concentration',
            context => {
                const { describe, it, assert } = context;

                describe('Settings Registration', function() {
                    it('should register concentration setting with correct properties', function() {
                        const setting = game.settings.settings.get('sosly-5e-house-rules.concentration');

                        assert.isNotNull(setting, 'Concentration setting should be registered');
                        assert.equal(setting.scope, 'world', 'Setting should have world scope');
                        assert.equal(setting.type, Boolean, 'Setting should be Boolean type');
                        assert.equal(setting.default, true, 'Setting should default to true');
                        assert.equal(setting.config, true, 'Setting should be configurable');
                        assert.equal(setting.restricted, true, 'Setting should be restricted');
                        assert.equal(setting.requiresReload, true, 'Setting should require reload');
                    });
                });

                describe('handleConcentrationRest', function() {
                    it('should return early when actor has no concentration effects', async function() {
                        const mockActor = {
                            effects: {
                                filter: () => []
                            }
                        };

                        const result = await handleConcentrationRest(mockActor);
                        assert.isUndefined(result, 'Should return undefined when no concentration effects');
                    });

                    it('should handle single concentration effect with confirmation', async function() {
                        let effectDeleted = false;
                        const mockEffect = {
                            label: 'Concentrating: Fireball',
                            statuses: new Set(['concentrating']),
                            delete: async () => { effectDeleted = true; }
                        };

                        const mockActor = {
                            effects: {
                                filter: fn => {
                                    const effect = mockEffect;
                                    return fn(effect) ? [effect] : [];
                                }
                            }
                        };

                        // Mock Dialog.confirm to return true
                        const originalConfirm = Dialog.confirm;
                        Dialog.confirm = async () => true;

                        await handleConcentrationRest(mockActor);

                        assert.isTrue(effectDeleted, 'Effect should be deleted when confirmed');

                        // Restore original Dialog.confirm
                        Dialog.confirm = originalConfirm;
                    });

                    it('should not delete effect when user cancels confirmation', async function() {
                        let effectDeleted = false;
                        const mockEffect = {
                            label: 'Concentrating: Magic Missile',
                            statuses: new Set(['concentrating']),
                            delete: async () => { effectDeleted = true; }
                        };

                        const mockActor = {
                            effects: {
                                filter: fn => {
                                    const effect = mockEffect;
                                    return fn(effect) ? [effect] : [];
                                }
                            }
                        };

                        // Mock Dialog.confirm to return false
                        const originalConfirm = Dialog.confirm;
                        Dialog.confirm = async () => false;

                        await handleConcentrationRest(mockActor);

                        assert.isFalse(effectDeleted, 'Effect should not be deleted when cancelled');

                        // Restore original Dialog.confirm
                        Dialog.confirm = originalConfirm;
                    });

                    it('should extract spell name from concentration effect label', async function() {
                        let dialogContent = '';
                        const mockEffect = {
                            label: 'Concentrating: Shield of Faith',
                            statuses: new Set(['concentrating']),
                            delete: async () => {}
                        };

                        const mockActor = {
                            effects: {
                                filter: fn => {
                                    const effect = mockEffect;
                                    return fn(effect) ? [effect] : [];
                                }
                            }
                        };

                        // Mock Dialog.confirm to capture content
                        const originalConfirm = Dialog.confirm;
                        Dialog.confirm = async options => {
                            dialogContent = options.content;
                            return true;
                        };

                        // Mock game.i18n.format to return the formatted string
                        const originalFormat = game.i18n?.format;
                        if (game.i18n) {
                            game.i18n.format = (key, data) => {
                                if (key === 'sosly.concentration.confirmation') {
                                    return `Your character is concentrating on ${data.spell}. Do you want to end concentration?`;
                                }
                                return key;
                            };
                        }

                        await handleConcentrationRest(mockActor);

                        assert.include(dialogContent, 'Shield of Faith', 'Dialog should contain extracted spell name');

                        // Restore original functions
                        Dialog.confirm = originalConfirm;
                        if (game.i18n && originalFormat) {
                            game.i18n.format = originalFormat;
                        }
                    });
                });
            },
            { displayName: 'SoSly: Concentration Management' }
        );
    });
}
