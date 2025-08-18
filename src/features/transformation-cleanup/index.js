import { registerTransformationCleanupSettings } from './settings';
import { handleTransformationCleanup } from './handler';
import { registerTransformationCleanupTests } from './quench';

export function registerTransformationCleanupFeature() {
    console.log('SoSly 5e House Rules | Registering Transformation Cleanup');

    registerTransformationCleanupSettings();

    Hooks.on('dnd5e.revertOriginalForm', handleTransformationCleanup);

    if (game.modules.get('quench')?.active) {
        registerTransformationCleanupTests();
    }
}
