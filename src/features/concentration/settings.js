/**
 * Concentration Management Settings
 */

export function registerConcentrationSettings() {
    game.settings.register('sosly-5e-house-rules', 'concentration', {
        name: game.i18n.localize('sosly.concentration.label'),
        hint: game.i18n.localize('sosly.concentration.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
