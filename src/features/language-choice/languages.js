import {id as module_id} from '../../../module.json';
import {LANGUAGE_SETTINGS} from './language-data';

export function applyLanguageSettings() {
    const setting = game.settings.get(module_id, 'languageSetting');

    if (setting === 'default') {
        return;
    }

    const config = LANGUAGE_SETTINGS[setting];
    if (!config) {
        return;
    }

    if (config.standard) {
        for (const key of config.standard.remove) {
            delete CONFIG.DND5E.languages.standard.children[key];
        }
        Object.assign(CONFIG.DND5E.languages.standard.children, config.standard.add);
    }

    if (config.exotic) {
        for (const key of config.exotic.remove) {
            delete CONFIG.DND5E.languages.exotic.children[key];
        }
        Object.assign(CONFIG.DND5E.languages.exotic.children, config.exotic.add);
    }
}
