// Prevent Players from Identifying their items by hiding the buttons from them
// Only the GM will be able to Identify them

export function removeIdentifyButton() {
    // Remove Identify button at top of Item Sheet
    Hooks.on('renderItemSheet5e', (sheet, element) => {
        if (game.user.isGM) {return;}
        const unidentified = sheet.item.system.identified === false;
        if (!unidentified) {return;}
        element.querySelectorAll('.toggle-identified').forEach(n => n.remove());
    });

    // Remove Identify button from Item Context menu on Actor Sheet
    Hooks.on('dnd5e.getItemContextOptions', (item, buttons) => {
        if (game.user.isGM) {return;}
        const unidentified = item.system.identified === false;
        if (!unidentified) {return;}
        buttons.findSplice(e => e.name === 'DND5E.Identify');
    });
}
