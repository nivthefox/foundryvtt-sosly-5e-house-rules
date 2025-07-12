/**
 * Madness Tracking Feature
 * Provides madness level tracking and management
 */

import { registerMadnessSettings } from './settings';
import { registerMadnessHooks } from './ui';

export function registerMadnessFeature() {
    console.log('SoSly 5e House Rules | Registering Madness Tracking');
    
    registerMadnessSettings();
    registerMadnessHooks();
}