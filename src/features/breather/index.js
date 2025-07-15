/**
 * Breather Rest System Feature
 * Provides short rest alternatives for recovery
 */

import {registerBreatherSettings} from './settings';
import {BreatherUI} from './ui';
import {registerBreatherTests} from './quench';

export function registerBreatherFeature() {
    console.log('SoSly 5e House Rules | Registering Breather Rest System');

    registerBreatherSettings();

    if (game.settings.get('sosly-5e-house-rules', 'breather')) {
        BreatherUI.register();
    }

    // Register Quench tests if Quench module is available
    if (game.modules.get('quench')?.active) {
        registerBreatherTests();
    }
}
