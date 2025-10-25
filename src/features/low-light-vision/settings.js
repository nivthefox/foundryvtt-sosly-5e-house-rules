import {id as module_id} from '../../../module.json';

export function registerLowLightVisionSettings() {
    game.settings.register(module_id, 'low-light-vision', {
        name: 'Enable Low-Light Vision',
        hint: 'Allows tokens with Low-Light Vision to see double the distance in dim light areas.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    });

    game.settings.register(module_id, 'low-light-vision-multiplier', {
        name: 'Low-Light Vision Multiplier',
        hint: 'How much to multiply dim light radius for tokens with Low-Light Vision (default: 2x).',
        scope: 'world',
        config: true,
        type: Number,
        default: 2,
        range: {
            min: 1.5,
            max: 4,
            step: 0.5
        },
        requiresReload: true
    });

    game.settings.register(module_id, 'low-light-vision-grayscale', {
        name: 'Low-Light Vision Grayscale',
        hint: 'Convert low-light vision to grayscale (default: enabled).',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
}
