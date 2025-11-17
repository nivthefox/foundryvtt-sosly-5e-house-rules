import {id as module_id} from '../../../module.json';

export function registerLanguageChoiceSettings() {
    game.settings.register(module_id, 'languageSetting', {
        name: game.i18n.localize('sosly.language-choice.label'),
        hint: game.i18n.localize('sosly.language-choice.hint'),
        scope: 'world',
        config: true,
        type: String,
        default: 'default',
        choices: {
            default: game.i18n.localize('sosly.language-choice.default'),
            dragonlance: game.i18n.localize('sosly.language-choice.dragonlance'),
            forgottenrealms: game.i18n.localize('sosly.language-choice.forgottenrealms'),
            severedlands: game.i18n.localize('sosly.language-choice.severedlands')
        },
        restricted: true,
        requiresReload: true
    });
}
