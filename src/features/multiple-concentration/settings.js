/**
 * Multiple Concentration Settings
 */

export function registerMultipleConcentrationSettings() {
    game.settings.register('sosly-5e-house-rules', 'multipleConcentration', {
        name: game.i18n.localize('sosly.concentration.multiple.label'),
        hint: game.i18n.localize('sosly.concentration.multiple.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
