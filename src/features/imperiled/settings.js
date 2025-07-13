/**
 * Imperiled Condition System Settings
 */

export function registerImperiledSettings() {
    game.settings.register('sosly-5e-house-rules', 'imperiled', {
        name: game.i18n.localize('sosly.imperiled.label'),
        hint: game.i18n.localize('sosly.imperiled.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
