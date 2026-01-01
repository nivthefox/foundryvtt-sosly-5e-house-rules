import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import { registerTransformationCleanupSettings } from './settings';
import { handleTransformationCleanup, handleTransformationCleanupSocket } from './handler';
import { registerTransformationCleanupTests } from './quench';

export function registerTransformationCleanupFeature() {
    logger.info('Registering Transformation Cleanup');

    registerTransformationCleanupSettings();

    Hooks.on('dnd5e.revertOriginalForm', handleTransformationCleanup);

    Hooks.once('ready', () => {
        if (!game.user.isGM) {return;}
        game.socket.on(`module.${module_id}`, handleTransformationCleanupSocket);
    });

    if (game.modules.get('quench')?.active) {
        registerTransformationCleanupTests();
    }
}
