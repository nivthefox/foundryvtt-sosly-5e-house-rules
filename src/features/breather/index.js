/**
 * Breather Rest System Feature
 * Provides short rest alternatives for recovery
 */

import { registerBreatherSettings } from './settings';
import { registerBreatherUI } from './ui';

export function registerBreatherFeature() {
    console.log('SoSly 5e House Rules | Registering Breather Rest System');

    registerBreatherSettings();
    registerBreatherUI();
}
