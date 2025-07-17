import {findBestHitDie, formatHitDieOptions} from './calculations';
import {getRecoverableFeatures} from './class-features';
import {id as module_id} from '../../../module.json';

const BaseRestDialog = dnd5e.applications.actor.BaseRestDialog;

class BreatherUI extends BaseRestDialog {
    constructor(options = {}) {
        super(options);
    }

    static get PARTS() {
        return {
            ...super.PARTS,
            content: {
                template: `modules/${module_id}/templates/features/breather/breather.hbs`
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
                classes: ['breather'],
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

        // Get recoverable class features
        if (!context.isGroup && actor.type === 'character') {
            context.recoverableFeatures = getRecoverableFeatures(actor);
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

        // Add real-time validation for class features
        this.#setupFeatureValidation();
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

    /**
     * Setup real-time validation for feature selection
     */
    #setupFeatureValidation() {
        const form = this.element.querySelector('form');
        if (!form) return;

        const checkboxes = form.querySelectorAll('dnd5e-checkbox[name^="features."]');
        if (!checkboxes.length) return;

        // Validate on any checkbox change
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.#validateFeatureSelection());
        });

        // Also validate when HD are rolled (since that changes available HD)
        const rollButton = form.querySelector('[data-action="rollHitDie"]');
        if (rollButton) {
            const originalHandler = rollButton.onclick;
            rollButton.onclick = async event => {
                if (originalHandler) await originalHandler.call(this, event);
                this.#validateFeatureSelection();
            };
        }

        // Initial validation
        this.#validateFeatureSelection();
    }

    /**
     * Validate that there are enough HD for selected features
     */
    #validateFeatureSelection() {
        const form = this.element.querySelector('form');
        if (!form) return;

        // Count selected features
        const checkboxes = form.querySelectorAll('dnd5e-checkbox[name^="features."]');
        let selectedCount = 0;
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) selectedCount++;
        });

        // Get available HD
        const availableHD = this.actor.system.attributes.hd.value;

        // Get or create validation message element
        let validationMsg = form.querySelector('.feature-validation-error');
        if (!validationMsg && selectedCount > availableHD) {
            validationMsg = document.createElement('div');
            validationMsg.classList.add('feature-validation-error', 'note', 'warn');
            const fieldset = form.querySelector('fieldset');
            if (fieldset) {
                fieldset.appendChild(validationMsg);
            }
        }

        // Update validation state
        const restButton = this.element.querySelector('button[name="rest"]');
        if (selectedCount > availableHD) {
            // Show error and disable button
            if (validationMsg) {
                validationMsg.textContent = game.i18n.localize('sosly.breather.error.insufficientHD')
                    || `Not enough Hit Dice. You need ${selectedCount} HD but only have ${availableHD}.`;
            }
            if (restButton) {
                restButton.disabled = true;
                restButton.dataset.tooltip = game.i18n.localize('sosly.breather.error.insufficientHD');
            }
        } else {
            // Remove error and enable button
            if (validationMsg) {
                validationMsg.remove();
            }
            if (restButton) {
                restButton.disabled = false;
                restButton.dataset.tooltip = null;
            }
        }
    }


}

export class Breather {
    static async breatherDialog({actor} = {}) {
        try {
            const config = await BreatherUI.configure(actor);
            return { completed: true, ...config };
        } catch (err) {
            return { completed: false };
        }
    }
}
