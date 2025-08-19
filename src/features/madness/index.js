import {logger} from '../../utils/logger';

/**
 * Madness Tracking Feature
 * Provides madness level tracking and management
 */

import { registerMadnessSettings } from './settings';
import { registerMadnessHooks } from './ui';

export function registerMadnessFeature() {
    logger.info('Registering Madness Tracking');

    registerMadnessSettings();
    registerMadnessHooks();
}
