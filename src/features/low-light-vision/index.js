import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import {registerLowLightVisionSettings} from './settings';
import {LowLightVisionMode} from './vision-mode';

/**
 * Low-Light Vision Feature
 * Allows tokens to see double the distance in dim light
 */

export function registerLowLightVisionFeature() {
    logger.info('Registering Low-Light Vision');

    registerLowLightVisionSettings();

    if (!game.settings.get(module_id, 'low-light-vision')) {
        return;
    }

    Hooks.once('ready', () => {
        const lowLightMode = new LowLightVisionMode();
        CONFIG.Canvas.visionModes.lowLight = lowLightMode;
        logger.info('Low-Light Vision mode registered');

        canvas.app.ticker.add(() => {
            if (!canvas.effects?.visionSources) {
                return;
            }

            for (const source of canvas.effects.visionSources) {
                if (!source.active || source.visionMode?.id !== 'lowLight') {
                    continue;
                }

                const backgroundShader = source.layers?.background?.shader;
                if (!backgroundShader) {
                    continue;
                }

                backgroundShader.uniforms.canvasPosition = [canvas.stage.position.x, canvas.stage.position.y];
                backgroundShader.uniforms.canvasPivot = [canvas.stage.pivot.x, canvas.stage.pivot.y];
                backgroundShader.uniforms.canvasScale = canvas.stage.scale.x;
            }
        });
    });

    Hooks.on('initializeVisionMode', visibility => {
        const source = visibility.visionModeData.source;
        if (!source?.visionMode || source.visionMode.id !== 'lowLight') {
            return;
        }

        const token = source.object?.document;
        if (token && token.sight.range !== null) {
            token.sight.range = null;
        }

        const lowLightMode = CONFIG.Canvas.visionModes.lowLight;
        if (lowLightMode) {
            lowLightMode._updateLightData(source);
        }
    });

    Hooks.on('sightRefresh', () => {
        if (!canvas.effects?.visionSources) {
            return;
        }

        const lowLightMode = CONFIG.Canvas.visionModes.lowLight;
        if (!lowLightMode) {
            return;
        }

        for (const source of canvas.effects.visionSources) {
            if (source.active && source.visionMode?.id === 'lowLight') {
                lowLightMode._updateLightData(source);
            }
        }
    });
}
