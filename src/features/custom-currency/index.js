import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import {registerCustomCurrencySettings} from './settings';
import {CURRENCY_PRESETS} from './presets';
import {registerCustomCurrencyTests} from './quench';

export function registerCustomCurrencyFeature() {
    logger.info('Registering Custom Currency');

    registerCustomCurrencySettings();

    if (game.modules.get('quench')?.active) {
        registerCustomCurrencyTests();
    }

    Hooks.once('ready', () => {
        const preset = game.settings.get(module_id, 'activeCurrencyPreset');

        if (preset === 'default') {
            return;
        }

        const config = CURRENCY_PRESETS[preset];
        if (!config) {
            logger.error(`Unknown currency preset: ${preset}`);
            return;
        }

        applyCurrencyPreset(config);
    });
}

function applyCurrencyPreset(config) {
    for (const [key, custom] of Object.entries(config.currencies)) {
        if (!CONFIG.DND5E.currencies[key]) {
            continue;
        }

        const localizedLabel = game.i18n.localize(custom.label);
        const localizedAbbr = game.i18n.localize(custom.abbreviation);

        CONFIG.DND5E.currencies[key] = {
            ...CONFIG.DND5E.currencies[key],
            label: localizedLabel,
            abbreviation: localizedAbbr,
            icon: custom.icon
        };

        const upperKey = key.toUpperCase();
        game.i18n.translations.DND5E[`Currency${upperKey}`] = localizedLabel;
        game.i18n.translations.DND5E[`CurrencyAbbr${upperKey}`] = localizedAbbr;
    }

    injectCurrencyStyles();
}

function injectCurrencyStyles() {
    const style = document.createElement('style');
    style.id = 'sosly-custom-currencies';

    const currencies = append => Object.entries(CONFIG.DND5E.currencies)
        .map(([key, { icon }]) => `&.${key}${append ?? ''} { background-image: url("${icon}"); }`);

    style.innerHTML = `
        :is(.dnd5e2, .dnd5e2-journal) :is(i, span).currency {
            ${currencies().join('\n')}
        }
        .dnd5e2 .form-group label.label-icon.currency {
            ${currencies('::after').join('\n')}
        }
    `;

    document.head.append(style);
}
