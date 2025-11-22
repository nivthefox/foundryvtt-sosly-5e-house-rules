import {id as module_id} from '../../../module.json';

export function registerCustomCurrencySettings() {
    game.settings.register(module_id, 'activeCurrencyPreset', {
        name: game.i18n.localize('SOSLY.SETTINGS.CustomCurrency.Name'),
        hint: game.i18n.localize('SOSLY.SETTINGS.CustomCurrency.Hint'),
        scope: 'world',
        config: true,
        type: String,
        choices: {
            default: 'SOSLY.CURRENCY.Presets.Default',
            krynn: 'SOSLY.CURRENCY.Presets.Krynn',
            cormyr: 'SOSLY.CURRENCY.Presets.Cormyr'
        },
        default: 'default',
        restricted: true,
        requiresReload: true
    });
}
