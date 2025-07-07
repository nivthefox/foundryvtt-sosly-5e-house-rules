export function registerSettings() {
    game.settings.register('sosly-5e-house-rules', 'madness', {
        name: game.i18n.localize('sosly.madness.label'),
        hint: game.i18n.localize('sosly.madness.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        restricted: true,
        requiresReload: true
    });
}
