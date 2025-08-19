import {logger} from '../../utils/logger';
import { registerTransformationCleanupSettings } from './settings';
import { handleTransformationCleanup } from './handler';
import { registerTransformationCleanupTests } from './quench';

export function registerTransformationCleanupFeature() {
    logger.info('Registering Transformation Cleanup');

    registerTransformationCleanupSettings();

    Hooks.on('dnd5e.revertOriginalForm', handleTransformationCleanup);

    if (game.modules.get('quench')?.active) {
        registerTransformationCleanupTests();
    }
}
