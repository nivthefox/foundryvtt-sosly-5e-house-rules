import {findBestHitDie, formatHitDieOptions} from './calculations';

const BaseRestDialog = dnd5e.applications.actor.BaseRestDialog;

class BreatherDialog extends BaseRestDialog {
    constructor(options = {}) {
        super(options);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'breather-dialog',
            classes: ['dnd5e', 'dialog', 'rest'],
            width: 400,
            height: 'auto'
        });
    }

    static get PARTS() {
        return {
            ...super.PARTS,
            content: {
                template: 'modules/sosly-5e-house-rules/templates/features/breather/breather.hbs'
            }
        };
    }

    get title() {
        return game.i18n.localize('sosly.breather.title');
    }

    /**
     * Display the breather rest dialog and await the user's action
     * @param {Actor5e} actor - The actor taking a breather
     * @param {object} config - Configuration options
     * @returns {Promise<object>} A promise that resolves when the rest is completed or rejects on cancel
     */
    static async configure(actor, config = {}) {
        return new Promise((resolve, reject) => {
            const app = new this({
                config,
                buttons: [{
                    default: true,
                    icon: 'fa-solid fa-flag',
                    label: game.i18n.localize('DND5E.REST.Label'),
                    name: 'rest',
                    type: 'submit'
                }],
                document: actor
            });
            app.addEventListener('close', () => app.rested ? resolve(app.config) : reject(), { once: true });
            app.render({ force: true });
        });
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Prepare hit dice data
        const actor = this.actor;
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
            context.canRoll = actor.system.attributes.hd.value > 0;
            context.denomination = findBestHitDie(context.availableHD);
            context.hdOptions = formatHitDieOptions(context.availableHD, game.i18n.localize('DND5E.available'));
        }

        return context;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        // Bind click handler for hit die roll button
        const rollButton = this.element.querySelector('[data-action="rollHitDie"]');
        if (rollButton) {
            rollButton.addEventListener('click', this.#onRollHitDie.bind(this));
        }
    }

    /**
     * Handle rolling a hit die
     * @param {Event} event - The click event
     */
    async #onRollHitDie(event) {
        event.preventDefault();
        const denom = this.form?.elements?.hd?.value || this.form?.hd?.value;
        if (denom) {
            await this.actor.rollHitDie({ denomination: denom });
            foundry.utils.mergeObject(this.config, new FormDataExtended(this.form).object);
            this.render();
        }
    }
}

export class Breather {
    static async breatherDialog({actor} = {}) {
        try {
            const config = await BreatherDialog.configure(actor);
            return { completed: true, ...config };
        } catch (err) {
            return { completed: false };
        }
    }
}
