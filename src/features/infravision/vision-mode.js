import {InfravisionBackgroundShader} from './shaders/background';
import {InfravisionCanvasShader} from './shaders/canvas';

const {VisionMode} = foundry.canvas.perception;

export class InfravisionMode extends VisionMode {
    constructor() {
        super({
            id: 'infravision',
            label: 'Infravision',
            tokenConfig: true,
            canvas: {
                shader: InfravisionCanvasShader,
                uniforms: {
                    saturation: -1.0,
                    contrast: 0,
                    exposure: -0.85
                }
            },
            lighting: {
                levels: {
                    [VisionMode.LIGHTING_LEVELS.DIM]: VisionMode.LIGHTING_LEVELS.BRIGHT
                },
                background: {
                    visibility: VisionMode.LIGHTING_VISIBILITY.REQUIRED
                }
            },
            vision: {
                background: {
                    shader: InfravisionBackgroundShader
                },
                darkness: {
                    adaptive: false
                },
                defaults: {
                    attenuation: 0,
                    brightness: -0.85,
                    saturation: -1,
                    contrast: 0
                }
            }
        });
    }
}
