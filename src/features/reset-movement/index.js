import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import {registerResetMovementControls} from './controls';
import {handleResetMovementSocket} from './handler';

export function registerResetMovementFeature() {
    logger.info('Registering Reset Movement');

    Hooks.on('getSceneControlButtons', registerResetMovementControls);

    Hooks.once('ready', () => {
        game.socket.on(`module.${module_id}`, handleResetMovementSocket);
    });
}
