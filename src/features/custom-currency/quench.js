import {id as module_id} from '../../../module.json';
import {CURRENCY_PRESETS} from './presets';

export function registerCustomCurrencyTests() {
    Hooks.on('quenchReady', quench => {
        quench.registerBatch(
            'sosly.features.custom-currency',
            context => {
                const { describe, it, assert } = context;

                describe('Settings Registration', function() {
                    it('should register activeCurrencyPreset setting with correct properties', function() {
                        const setting = game.settings.settings.get(`${module_id}.activeCurrencyPreset`);

                        assert.isNotNull(setting, 'Currency preset setting should be registered');
                        assert.equal(setting.scope, 'world', 'Setting should have world scope');
                        assert.equal(setting.type, String, 'Setting should be String type');
                        assert.equal(setting.default, 'default', 'Setting should default to "default"');
                        assert.equal(setting.config, true, 'Setting should be configurable');
                        assert.equal(setting.restricted, true, 'Setting should be restricted');
                        assert.equal(setting.requiresReload, true, 'Setting should require reload');
                    });

                    it('should have all expected preset choices', function() {
                        const setting = game.settings.settings.get(`${module_id}.activeCurrencyPreset`);
                        const choices = setting.choices;

                        assert.property(choices, 'default', 'Should have default choice');
                        assert.property(choices, 'krynn', 'Should have krynn choice');
                        assert.property(choices, 'cormyr', 'Should have cormyr choice');
                    });
                });

                describe('Currency Presets', function() {
                    it('should have krynn preset defined', function() {
                        assert.property(CURRENCY_PRESETS, 'krynn', 'Krynn preset should exist');
                        assert.property(CURRENCY_PRESETS.krynn, 'currencies', 'Krynn should have currencies');
                    });

                    it('should have cormyr preset defined', function() {
                        assert.property(CURRENCY_PRESETS, 'cormyr', 'Cormyr preset should exist');
                        assert.property(CURRENCY_PRESETS.cormyr, 'currencies', 'Cormyr should have currencies');
                    });

                    it('krynn preset should define all currency types', function() {
                        const currencies = CURRENCY_PRESETS.krynn.currencies;

                        assert.property(currencies, 'pp', 'Should define platinum');
                        assert.property(currencies, 'gp', 'Should define gold (steel)');
                        assert.property(currencies, 'ep', 'Should define electrum (iron)');
                        assert.property(currencies, 'sp', 'Should define silver (bronze)');
                        assert.property(currencies, 'cp', 'Should define copper (silver)');
                    });

                    it('cormyr preset should define all currency types', function() {
                        const currencies = CURRENCY_PRESETS.cormyr.currencies;

                        assert.property(currencies, 'pp', 'Should define platinum (tricrown)');
                        assert.property(currencies, 'gp', 'Should define gold (golden lion)');
                        assert.property(currencies, 'ep', 'Should define electrum (blue eye)');
                        assert.property(currencies, 'sp', 'Should define silver (silver falcon)');
                        assert.property(currencies, 'cp', 'Should define copper (copper thumb)');
                    });

                    it('each currency should have required properties', function() {
                        const krynn_pp = CURRENCY_PRESETS.krynn.currencies.pp;

                        assert.property(krynn_pp, 'label', 'Currency should have label');
                        assert.property(krynn_pp, 'abbreviation', 'Currency should have abbreviation');
                        assert.property(krynn_pp, 'icon', 'Currency should have icon');
                    });

                    it('currency labels should be localization keys', function() {
                        const krynn_gp = CURRENCY_PRESETS.krynn.currencies.gp;

                        assert.equal(krynn_gp.label, 'SOSLY.CURRENCY.Krynn.Steel');
                        assert.equal(krynn_gp.abbreviation, 'SOSLY.CURRENCY.Krynn.SteelAbbr');
                    });

                    it('currency icons should have valid paths', function() {
                        const currencies = CURRENCY_PRESETS.krynn.currencies;

                        Object.values(currencies).forEach(currency => {
                            assert.match(currency.icon, /\.webp$/, 'Icon should be a webp file');
                            assert.match(currency.icon, /^systems\/dnd5e\/icons\/currency\//, 'Icon should be from dnd5e system');
                        });
                    });
                });

                describe('CSS Injection', function() {
                    it('should inject stylesheet when preset is active', function() {
                        const styleElement = document.getElementById('sosly-custom-currencies');

                        if (game.settings.get(module_id, 'activeCurrencyPreset') !== 'default') {
                            assert.isNotNull(styleElement, 'Style element should exist when preset is active');
                        }
                    });

                    it('should not inject stylesheet when preset is default', function() {
                        if (game.settings.get(module_id, 'activeCurrencyPreset') === 'default') {
                            const styleElement = document.getElementById('sosly-custom-currencies');
                            assert.isNull(styleElement, 'Style element should not exist when preset is default');
                        }
                    });
                });

                describe('CONFIG Override', function() {
                    it('should maintain conversion rates', function() {
                        const currencies = CONFIG.DND5E.currencies;

                        assert.equal(currencies.pp.conversion, 0.1, 'Platinum conversion should be unchanged');
                        assert.equal(currencies.gp.conversion, 1, 'Gold conversion should be unchanged');
                        assert.equal(currencies.ep.conversion, 2, 'Electrum conversion should be unchanged');
                        assert.equal(currencies.sp.conversion, 10, 'Silver conversion should be unchanged');
                        assert.equal(currencies.cp.conversion, 100, 'Copper conversion should be unchanged');
                    });

                    it('should have valid icon paths in CONFIG', function() {
                        const currencies = CONFIG.DND5E.currencies;

                        Object.values(currencies).forEach(currency => {
                            assert.isString(currency.icon, 'Icon should be a string');
                            assert.match(currency.icon, /\.webp$/, 'Icon should be a webp file');
                        });
                    });
                });
            },
            { displayName: 'SoSly: Custom Currency' }
        );
    });
}
