function setupBeastFormComponent() {
    CONFIG.DND5E.validProperties.spell.add('beastform');

    CONFIG.DND5E.itemProperties.beastform = {
        label: game.i18n.localize('sosly.components.beastform.label'),
        abbreviation: game.i18n.localize('sosly.components.beastform.abbreviation'),
        reference: 'Compendium.sosly-5e-house-rules.house-rules.JournalEntry.8MopJr18J312YX26.JournalEntryPage.fXQEofk4MrynDIoZ'
    };
}

export function registerBeastForm() {
    Hooks.once('setup', setupBeastFormComponent);
}
