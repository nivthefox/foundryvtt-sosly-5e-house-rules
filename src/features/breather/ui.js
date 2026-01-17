import {findBestHitDie, formatHitDieOptions} from './calculations';
import {getRecoverableFeatures} from './class-features';
import {addBreatherDelta} from './deltas';
import {id as module_id} from '../../../module.json';

const BaseRestDialog = dnd5e.applications.actor.BaseRestDialog;
const FormDataExtended = foundry.applications.ux.FormDataExtended;

class BreatherUI extends BaseRestDialog {
    #hdRollHookId = null;

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
        } else if (foundry.utils.hasProperty(actor, 'system.attributes.hd')) {
            context.availableHD = actor.system.attributes.hd.bySize;
            context.canRoll = actor.system.attributes.hd.value > 0;
            context.denomination = findBestHitDie(context.availableHD);
            context.hdOptions = formatHitDieOptions(context.availableHD, game.i18n.localize('DND5E.available'));
        }

        if (!context.isGroup && actor.type === 'character') {
            context.recoverableFeatures = getRecoverableFeatures(actor);
        }

        if (!context.isGroup) {
            context.availableSpellSlots = this.#getAvailableSpellSlots();
        }

        if (!context.isGroup) {
            const exhaustion = actor.system.attributes.exhaustion || 0;
            context.currentExhaustion = exhaustion;
            context.canRecoverExhaustion = exhaustion > 0 && context.canRoll;
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

            if (!slotData?.max || slotData.value >= slotData.max) {
                continue;
            }
            if (availableHD < level) {
                continue;
            }

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

        if (!this.#hdRollHookId) {
            this.#hdRollHookId = Hooks.on('dnd5e.rollHitDieV2', this.#onRollHitDie_Track.bind(this));
        }

        const rollButton = this.element.querySelector('[data-action="rollHitDie"]');
        if (rollButton) {
            rollButton.addEventListener('click', this.#onRollHitDie.bind(this));
        }

        const restoreButton = this.element.querySelector('[data-action="restoreSpellSlot"]');
        if (restoreButton) {
            restoreButton.addEventListener('click', this.#onRestoreSpellSlot.bind(this));
        }

        const exhaustionButton = this.element.querySelector('[data-action="recoverExhaustion"]');
        if (exhaustionButton) {
            exhaustionButton.addEventListener('click', this.#onRecoverExhaustion.bind(this));
        }

        this.#setupFeatureValidation();
    }

    async close(options) {
        if (this.#hdRollHookId) {
            Hooks.off('dnd5e.rollHitDieV2', this.#hdRollHookId);
            this.#hdRollHookId = null;
        }
        return super.close(options);
    }

    async #onRollHitDie_Track(rolls, { subject, updates }) {
        if (subject.id !== this.actor.id) {
            return;
        }

        if (updates.actor?.['system.attributes.hp.value']) {
            const hpGained = updates.actor['system.attributes.hp.value'] - subject.system.attributes.hp.value;
            await addBreatherDelta(this.actor, 'system.attributes.hp.value', hpGained);
        }

        if (updates.class?.['system.hd.spent']) {
            const cls = subject.system.attributes.hd.classes.find(c =>
                c.system.hd.value > 0 && updates.class['system.hd.spent'] === c.system.hd.spent + 1
            );
            if (cls) {
                await addBreatherDelta(this.actor, 'system.hd.spent', 1, cls.id);
            }
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

    /**
     * Handle restoring a spell slot
     * @param {Event} event - The click event
     */
    async #onRestoreSpellSlot(event) {
        event.preventDefault();
        const select = this.form?.elements?.spellSlotLevel;
        const level = parseInt(select?.value);
        if (!level || isNaN(level)) {
            return;
        }

        const slotKey = `spell${level}`;
        const slotData = this.actor.system.spells?.[slotKey];
        if (!slotData || slotData.value >= slotData.max) {
            return;
        }

        for (let i = 0; i < level; i++) {
            await this.#spendHitDieWithTracking();
        }

        await addBreatherDelta(this.actor, `system.spells.${slotKey}.value`, 1);

        await this.actor.update({
            [`system.spells.${slotKey}.value`]: slotData.value + 1
        });

        this.render();
    }

    /**
     * Handle recovering from exhaustion
     * @param {Event} event - The click event
     */
    async #onRecoverExhaustion(event) {
        event.preventDefault();

        const currentExhaustion = this.actor.system.attributes.exhaustion || 0;
        if (currentExhaustion <= 0) {
            return;
        }

        const availableHD = this.actor.system.attributes.hd.value;
        if (availableHD <= 0) {
            return;
        }

        await this.#spendHitDieWithTracking();

        await addBreatherDelta(this.actor, 'system.attributes.exhaustion', -1);

        await this.actor.update({
            'system.attributes.exhaustion': currentExhaustion - 1
        });

        this.render();
    }

    async #spendHitDieWithTracking() {
        const hd = this.actor.system.attributes.hd;
        if (!hd.smallestAvailable || hd.value <= 0) {
            return;
        }

        const targetClass = Array.from(hd.classes)
            .filter(c => c.system.hd.denomination === hd.smallestAvailable)
            .find(c => c.system.hd.value > 0);

        if (targetClass) {
            await addBreatherDelta(this.actor, 'system.hd.spent', 1, targetClass.id);
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
        if (!form) {
            return;
        }

        const checkboxes = form.querySelectorAll('dnd5e-checkbox[name^="features."]');
        if (!checkboxes.length) {
            return;
        }

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.#validateFeatureSelection());
        });

        // Re-validate after HD rolls since available HD changes
        const rollButton = form.querySelector('[data-action="rollHitDie"]');
        if (rollButton) {
            const originalHandler = rollButton.onclick;
            rollButton.onclick = async event => {
                if (originalHandler) {
                    await originalHandler.call(this, event);
                }
                this.#validateFeatureSelection();
            };
        }

        this.#validateFeatureSelection();
    }

    /**
     * Validate that there are enough HD for selected features
     */
    #validateFeatureSelection() {
        const form = this.element.querySelector('form');
        if (!form) {
            return;
        }

        const checkboxes = form.querySelectorAll('dnd5e-checkbox[name^="features."]');
        let selectedCount = 0;
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedCount++;
            }
        });

        const availableHD = this.actor.system.attributes.hd.value;

        let validationMsg = form.querySelector('.feature-validation-error');
        if (!validationMsg && selectedCount > availableHD) {
            validationMsg = document.createElement('div');
            validationMsg.classList.add('feature-validation-error', 'note', 'warn');
            const fieldset = form.querySelector('fieldset');
            if (fieldset) {
                fieldset.appendChild(validationMsg);
            }
        }

        const restButton = this.element.querySelector('button[name="rest"]');
        if (selectedCount > availableHD) {
            if (validationMsg) {
                validationMsg.textContent = game.i18n.localize('sosly.breather.error.insufficientHD')
                    || `Not enough Hit Dice. You need ${selectedCount} HD but only have ${availableHD}.`;
            }
            if (restButton) {
                restButton.disabled = true;
                restButton.dataset.tooltip = game.i18n.localize('sosly.breather.error.insufficientHD');
            }
        } else {
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
