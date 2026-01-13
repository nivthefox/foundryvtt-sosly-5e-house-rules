import {findBestHitDie, formatHitDieOptions} from './calculations';
import {getRecoverableFeatures} from './class-features';
import {id as module_id} from '../../../module.json';

const BaseRestDialog = dnd5e.applications.actor.BaseRestDialog;
const FormDataExtended = foundry.applications.ux.FormDataExtended;

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
                config: { type: 'breather', ...config },
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

        // Get available spell slots for recovery
        if (!context.isGroup) {
            context.availableSpellSlots = this.#getAvailableSpellSlots();
        }

        return context;
    }

    /**
     * Get spell slots that can be recovered (have capacity and affordable HD cost)
     * @returns {Array<object>} Array of available spell slot options
     */
    #getAvailableSpellSlots() {
        const actor = this.actor;
        const availableHD = actor.system.attributes.hd.value;
        const slots = [];

        for (let level = 1; level <= 9; level++) {
            const slotKey = `spell${level}`;
            const slotData = actor.system.spells?.[slotKey];

            // Skip if no slots at this level or no capacity
            if (!slotData?.max || slotData.value >= slotData.max) {continue;}

            // Skip if not enough HD
            if (availableHD < level) {continue;}

            slots.push({
                level,
                slotKey,
                label: game.i18n.localize(`DND5E.SpellLevel${level}`),
                cost: level,
                current: slotData.value,
                max: slotData.max
            });
        }

        return slots;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        // Bind click handler for hit die roll button
        const rollButton = this.element.querySelector('[data-action="rollHitDie"]');
        if (rollButton) {
            rollButton.addEventListener('click', this.#onRollHitDie.bind(this));
        }

        // Bind click handler for spell slot restore button
        const restoreButton = this.element.querySelector('[data-action="restoreSpellSlot"]');
        if (restoreButton) {
            restoreButton.addEventListener('click', this.#onRestoreSpellSlot.bind(this));
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
     * Handle restoring a spell slot
     * @param {Event} event - The click event
     */
    async #onRestoreSpellSlot(event) {
        event.preventDefault();
        const select = this.form?.elements?.spellSlotLevel;
        const level = parseInt(select?.value);
        if (!level || isNaN(level)) {return;}

        const slotKey = `spell${level}`;
        const slotData = this.actor.system.spells?.[slotKey];
        if (!slotData || slotData.value >= slotData.max) {return;}

        // Spend hit dice (one per spell level)
        for (let i = 0; i < level; i++) {
            await this.#spendHitDie();
        }

        // Restore the spell slot
        await this.actor.update({
            [`system.spells.${slotKey}.value`]: slotData.value + 1
        });

        // Re-render to update available options
        this.render();
    }

    /**
     * Spend a single hit die from the smallest available class
     * @returns {Promise<void>}
     */
    async #spendHitDie() {
        const hd = this.actor.system.attributes.hd;
        if (!hd.smallestAvailable || hd.value <= 0) {return;}

        // Find a class that has the smallest HD size and unspent HD
        const targetClass = Array.from(hd.classes)
            .filter(c => c.system.hd.denomination === hd.smallestAvailable)
            .find(c => c.system.hd.value > 0);

        if (targetClass) {
            await this.actor.updateEmbeddedDocuments('Item', [{
                _id: targetClass.id,
                'system.hd.spent': targetClass.system.hd.spent + 1
            }]);
        }
    }

    /**
     * Setup real-time validation for feature selection
     */
    #setupFeatureValidation() {
        const form = this.element.querySelector('form');
        if (!form) {return;}

        const checkboxes = form.querySelectorAll('dnd5e-checkbox[name^="features."]');
        if (!checkboxes.length) {return;}

        // Validate on any checkbox change
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.#validateFeatureSelection());
        });

        // Also validate when HD are rolled (since that changes available HD)
        const rollButton = form.querySelector('[data-action="rollHitDie"]');
        if (rollButton) {
            const originalHandler = rollButton.onclick;
            rollButton.onclick = async event => {
                if (originalHandler) {await originalHandler.call(this, event);}
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
        if (!form) {return;}

        // Count selected features
        const checkboxes = form.querySelectorAll('dnd5e-checkbox[name^="features."]');
        let selectedCount = 0;
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {selectedCount++;}
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
