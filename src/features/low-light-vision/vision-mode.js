const {VisionMode} = foundry.canvas.perception;

/**
 * Custom VisionMode for Low-Light Vision
 * Extends dim light perception to 2x normal range
 */
export class LowLightVisionMode extends VisionMode {
    constructor() {
        super({
            id: 'lowLight',
            label: 'Low-Light Vision',
            tokenConfig: true,
            lighting: {
                background: {
                    visibility: VisionMode.LIGHTING_VISIBILITY.REQUIRED
                }
            },
            vision: {
                defaults: {
                    attenuation: 0,
                    brightness: 0,
                    saturation: 0,
                    contrast: 0
                }
            }
        });
    }
}
