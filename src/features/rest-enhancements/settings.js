/**
 * Rest Enhancements Settings
 */

export function registerRestEnhancementsSettings() {
    game.settings.register('sosly-5e-house-rules', 'rest-enhancements', {
        name: game.i18n.localize('sosly.rest-enhancements.label'),
        hint: game.i18n.localize('sosly.rest-enhancements.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        restricted: true,
        requiresReload: true
    });
}
