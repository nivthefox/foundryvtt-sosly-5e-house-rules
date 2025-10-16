/**
 * Dialog Modification for Multiple Concentration
 * Modifies the concentration dialog to show HD cost option
 */

export function registerDialogModification() {
    Hooks.on('renderActivityUsageDialog', (app, html, data) => {
        const concentrationSection = html.querySelector('section[data-application-part="concentration"]');
        if (!concentrationSection) {return;}

        const select = concentrationSection.querySelector('select[name="concentration.end"]');
        if (!select) {return;}

        // Find the empty option (value="")
        const emptyOption = select.querySelector('option[value=""]');
        if (!emptyOption) {return;}

        // Check if actor has HD available and determine the smallest HD
        const actor = app.actor;
        const hd = actor.system.attributes.hd;
        let smallestHD = null;

        if (actor.type === 'npc' && hd.value > 0) {
            smallestHD = `d${hd.denomination}`;
        } else if (actor.type === 'character' && hd.value > 0) {
            // Use the built-in smallestAvailable for PCs
            smallestHD = hd.smallestAvailable;
        }

        // Only modify the option if HD are available
        if (smallestHD) {
            emptyOption.textContent = game.i18n.format('sosly.concentration.multiple.option', {
                die: smallestHD
            });
        }
    });
}
