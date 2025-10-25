import {id as module_id} from '../../../module.json';
import {LowLightBackgroundShader} from './shaders/background';

/**
 * Custom VisionMode for Low-Light Vision
 * Allows tokens to see double the distance in dim light
 */
export class LowLightVisionMode extends VisionMode {
    constructor() {
        const multiplier = game.settings.get(module_id, 'low-light-vision-multiplier');
        const grayscale = game.settings.get(module_id, 'low-light-vision-grayscale');

        super({
            id: 'lowLight',
            label: 'Low-Light Vision',
            tokenConfig: true,
            vision: {
                background: {
                    shader: LowLightBackgroundShader,
                    uniforms: {
                        lightCount: 0,
                        lightPositions: new Array(60).fill(0),
                        lightBrightRadii: new Array(30).fill(0),
                        lightDimRadii: new Array(30).fill(0),
                        canvasPosition: [0, 0],
                        canvasPivot: [0, 0],
                        canvasScale: 1.0,
                        dimMultiplier: multiplier,
                        useGrayscale: grayscale
                    }
                },
                defaults: {
                    attenuation: 0,
                    brightness: 0,
                    saturation: 0,
                    contrast: 0
                }
            },
            lighting: {
                background: {
                    visibility: VisionMode.LIGHTING_VISIBILITY.REQUIRED
                }
            }
        });
    }

    _activate(source) {
        const token = source.object?.document;
        if (token) {
            this._originalSightRange = token.sight.range;
            token.sight.range = null;
        }

        const updateOnce = () => {
            this._updateLightData(source);
            Hooks.off('lightingRefresh', updateOnce);
        };
        Hooks.once('lightingRefresh', updateOnce);
    }

    _deactivate(source) {
        const token = source.object?.document;
        if (token && this._originalSightRange !== undefined) {
            token.sight.range = this._originalSightRange;
            delete this._originalSightRange;
        }
    }

    _updateLightData(source) {
        if (!canvas.effects?.lightSources) {
            return;
        }

        const backgroundShader = source.layers?.background?.shader;
        if (!backgroundShader) {
            return;
        }

        const multiplier = game.settings.get(module_id, 'low-light-vision-multiplier');
        const viewport = canvas.scene._viewPosition;
        const maxLightRadius = 200;

        const lights = [];
        for (const light of canvas.effects.lightSources.values()) {
            if (!light.active) {
                continue;
            }

            const dist = Math.hypot(light.x - viewport.x, light.y - viewport.y);
            if (dist > ((viewport.scale * canvas.dimensions.width) + maxLightRadius)) {
                continue;
            }

            if (light.data.dim > 0) {
                lights.push({
                    pos: [light.x, light.y],
                    bright: light.data.bright || 0,
                    dim: light.data.dim * multiplier
                });
            }

            if (lights.length >= 30) {
                break;
            }
        }

        const positions = new Array(60).fill(0);
        const brightRadii = new Array(30).fill(0);
        const dimRadii = new Array(30).fill(0);

        lights.forEach((light, i) => {
            // Keep in world coordinates - shader will convert
            positions[(i * 2)] = light.pos[0];
            positions[(i * 2) + 1] = light.pos[1];
            brightRadii[i] = light.bright;
            dimRadii[i] = light.dim;
        });

        // Get initial canvas transform
        const canvasPosition = [canvas.stage.position.x, canvas.stage.position.y];
        const canvasPivot = [canvas.stage.pivot.x, canvas.stage.pivot.y];
        const canvasScale = canvas.stage.scale.x;

        // Update both uniforms and initialUniforms to prevent reset
        backgroundShader.uniforms.lightCount = lights.length;
        backgroundShader.uniforms.lightPositions = positions;
        backgroundShader.uniforms.lightBrightRadii = brightRadii;
        backgroundShader.uniforms.lightDimRadii = dimRadii;
        backgroundShader.uniforms.canvasPosition = canvasPosition;
        backgroundShader.uniforms.canvasPivot = canvasPivot;
        backgroundShader.uniforms.canvasScale = canvasScale;

        backgroundShader.initialUniforms.lightCount = lights.length;
        backgroundShader.initialUniforms.lightPositions = positions;
        backgroundShader.initialUniforms.lightBrightRadii = brightRadii;
        backgroundShader.initialUniforms.lightDimRadii = dimRadii;
        backgroundShader.initialUniforms.canvasPosition = canvasPosition;
        backgroundShader.initialUniforms.canvasPivot = canvasPivot;
        backgroundShader.initialUniforms.canvasScale = canvasScale;
    }
}
