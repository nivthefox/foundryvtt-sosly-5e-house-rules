import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import {registerInfravisionSettings} from './settings';
import {InfravisionMode} from './vision-mode';
import {InfravisionDetectionMode} from './detection-mode';

export function registerInfravisionFeature() {
    logger.info('Registering Infravision');

    registerInfravisionSettings();

    if (!game.settings.get(module_id, 'infravision')) {
        return;
    }

    Hooks.once('i18nInit', () => {
        const infravisionVisionMode = new InfravisionMode();
        CONFIG.Canvas.visionModes.infravision = infravisionVisionMode;
        logger.info('Infravision vision mode registered');

        const infravisionDetectionMode = new InfravisionDetectionMode();
        CONFIG.Canvas.detectionModes.infravision = infravisionDetectionMode;
        logger.info('Infravision detection mode registered');
    });

    Hooks.on('dnd5e.prepareActorDerivedData', actor => {
        if (!actor.detectionModes) {
            return;
        }

        for (const token of actor.getActiveTokens()) {
            const infravisionRange = token.detectionModes?.find(dm => dm.id === 'infravision')?.range;
            if (infravisionRange && infravisionRange > 0) {
                actor.detectionModes.infravision = Math.max(actor.detectionModes.infravision || 0, infravisionRange);
                break;
            }
        }
    });
}
