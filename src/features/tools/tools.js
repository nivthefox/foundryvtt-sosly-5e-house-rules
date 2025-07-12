export function registerTools() {
    // Add PianoForte to the Tool Proficiency list
    Hooks.once('setup', () => {
        CONFIG.DND5E.tools.pianoforte = {
            ability: 'cha',
            id: 'Compendium.sosly-5e-house-rules.equipment.Item.71VziEvvvWmeFCuo'
        };
    });
}
