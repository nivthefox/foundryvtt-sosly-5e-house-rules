export function registerLocationSettings() {
    game.settings.register('sosly-5e-house-rules', 'location.enabled', {
        name: 'SOSLY.location.label',
        hint: 'SOSLY.location.hint',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    });
}
