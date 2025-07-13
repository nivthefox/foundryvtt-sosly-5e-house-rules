const { DialogV2 } = foundry.applications.api;

import {
    findBestHitDie,
    canRollHitDice,
    formatHitDieOptions
} from './calculations';

export class Breather {
    static async breatherDialog({actor} = {}) {
        const context = Breather.#prepareContext(actor);
        const templateContent = await renderTemplate('modules/sosly-5e-house-rules/templates/features/breather/breather.hbs', context);
        return new Promise((resolve, reject) => {
            const dialogOptions = {
                window: {
                    title: `${game.i18n.localize('sosly.breather.label')}: ${actor.name}`,
                    minimizable: false,
                    resizable: false
                },
                position: {
                    width: 400,
                    height: 'auto'
                },
                content: `<form id="breather-hd">${templateContent}</form>`,
                modal: true,
                buttons: [
                    {
                        action: 'rest',
                        icon: 'fas fa-face-exhaling',
                        label: game.i18n.localize('DND5E.REST.Label'),
                        callback: (event, button, dialog) => {
                            const formData = new FormDataExtended(button.form);
                            resolve(formData.object);
                        }
                    },
                    {
                        action: 'cancel',
                        icon: 'fas fa-times',
                        label: game.i18n.localize('Cancel'),
                        callback: () => reject()
                    }
                ],
                render: html => {
                    const rollHitDieHandler = async event => {
                        event.preventDefault();
                        const form = event.target.closest('form');
                        const denom = form.elements.hd.value;
                        await actor.rollHitDie({ denomination: denom });
                        // Re-render the dialog content
                        const newContext = Breather.#prepareContext(actor);
                        const newContent = await renderTemplate('modules/sosly-5e-house-rules/templates/features/breather/breather.hbs', newContext);
                        html.find('form').html(newContent);
                        // Re-bind the event
                        const newRollButton = html.find('#roll-hd');
                        newRollButton.click(rollHitDieHandler);
                    };

                    const rollButton = html.find('#roll-hd');
                    rollButton.click(rollHitDieHandler);
                },
                close: reject
            };

            new DialogV2(dialogOptions).render({ force: true });
        });
    }


    static #prepareContext(actor) {
        const context = {};
        context.isGroup = actor.type === 'group';

        if (actor.type === 'npc') {
            const hd = actor.system.attributes.hd;
            context.availableHD = { [`d${hd.denomination}`]: hd.value };
            context.canRoll = hd.value > 0;
            context.denomination = `d${hd.denomination}`;
            context.hdOptions = [{
                value: context.denomination,
                label: `${context.denomination} (${hd.value} ${game.i18n.localize('DND5E.available')})`
            }];
        }

        else if (foundry.utils.hasProperty(actor, 'system.attributes.hd')) {
            context.availableHD = actor.system.attributes.hd.bySize;
            context.canRoll = canRollHitDice(context.availableHD);
            context.denomination = findBestHitDie(context.availableHD);
            context.hdOptions = formatHitDieOptions(context.availableHD, game.i18n.localize('DND5E.available'));
        }

        return context;
    }
}
