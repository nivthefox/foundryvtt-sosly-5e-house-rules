/**
 * Reusable meter component utility
 * Creates meter HTML elements for character sheet integration with built-in configuration
 */

import {id as module_id} from '../../../module.json';

const DocumentSheet5e = dnd5e.applications.api.DocumentSheet5e;

/**
 * Configuration dialog for meter values
 */
class MeterConfig extends DocumentSheet5e {

    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ['dnd5e2', 'standard-form', 'config-sheet', 'meter-config'],
        position: {
            width: 420
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false,
            handler: MeterConfig.prototype._onSubmit
        },
        actions: {
            increase: MeterConfig.prototype._onIncrease,
            decrease: MeterConfig.prototype._onDecrease
        }
    };

    /** @override */
    static PARTS = {
        form: {
            template: `modules/${module_id}/templates/components/meter-config.hbs`
        }
    };

    constructor(document, property, label, max, allowOverflow = false, options = {}) {
        super({document, ...options});
        this.property = property;
        this.label = label;
        this.max = max;
        this.allowOverflow = allowOverflow;
    }


    /** @override */
    get title() {
        return `${this.label} Configuration`;
    }

    /** @override */
    async _prepareContext(options) {
        const current = foundry.utils.getProperty(this.document, this.property) ?? 0;
        return {
            label: this.label,
            value: current,
            max: this.max
        };
    }

    /**
     * Handle increase button
     */
    async _onIncrease(event, target) {
        const input = target.parentElement.querySelector('input');
        const current = parseInt(input.value) || 0;
        const newValue = this.allowOverflow ? current + 1 : Math.min(current + 1, this.max);

        if (newValue !== current) {
            input.value = newValue;
            await this.#updateValue(newValue);
        }
    }

    /**
     * Handle decrease button
     */
    async _onDecrease(event, target) {
        const input = target.parentElement.querySelector('input');
        const current = parseInt(input.value) || 0;
        const newValue = Math.max(current - 1, 0);

        if (newValue !== current) {
            input.value = newValue;
            await this.#updateValue(newValue);
        }
    }

    /**
     * Handle form submission
     */
    async _onSubmit(event, form, formData) {
        const value = parseInt(formData.object.value) || 0;
        await this.#updateValue(value);
    }

    /**
     * Update the meter value
     */
    async #updateValue(value) {
        const minValue = Math.max(0, value);
        const clampedValue = this.allowOverflow ? minValue : Math.min(minValue, this.max);
        await this.document.update({[this.property]: clampedValue});
    }
}

/**
 * Create a meter component with built-in configuration
 * @param {Object} options - Configuration options for the meter
 * @param {string} options.label - Display label for the meter
 * @param {number} options.valueNow - Current value
 * @param {number} options.valueMax - Maximum value
 * @param {string} options.cssClass - Additional CSS class for the meter
 * @param {boolean} [options.editable=false] - Whether to show config button
 * @param {boolean} [options.inlineEditable=false] - Whether to enable click-to-edit inline
 * @param {Document} [options.document] - Document to update when configuring
 * @param {string} [options.property] - Property path to update
 * @param {Function} [options.onUpdate] - Custom update handler for inline editing
 * @param {number[]} [options.thresholds] - Array of threshold values for tick marks
 * @param {boolean} [options.allowOverflow=false] - Whether values can exceed maximum
 * @returns {string} HTML string for the meter component
 */
export async function createMeter({label, valueNow, valueMax, cssClass,
    editable = false, inlineEditable = false, document, property, onUpdate,
    thresholds = [], allowOverflow = false}) {

    const percentage = valueMax > 0 ? Math.round(Math.min(valueNow / valueMax, 1) * 100) : 0;
    const isOverflow = allowOverflow && valueNow > valueMax;

    const thresholdTicks = thresholds.map(threshold => ({
        value: threshold,
        percentage: valueMax > 0 ? Math.round((threshold / valueMax) * 100) : 0
    }));

    const displayValue = isOverflow && valueNow >= valueMax ? `${valueMax}+` : valueNow;

    const templateData = {
        label,
        valueNow: displayValue,
        valueMax,
        cssClass,
        editable,
        inlineEditable,
        percentage,
        thresholds: thresholdTicks,
        isOverflow,
        allowOverflow
    };

    const html = await renderTemplate(`modules/${module_id}/templates/components/meter.hbs`, templateData);

    // Set up handlers
    return {
        html,
        setup: element => {
            // Config button handler
            if (editable && document && property) {
                const configButton = element.querySelector('[data-action="config"]');
                if (configButton) {
                    configButton.addEventListener('click', event => {
                        event.preventDefault();
                        new MeterConfig(document, property, label, valueMax, allowOverflow, {}).render(true);
                    });
                }
            }

            // Inline edit handler
            if (inlineEditable) {
                const meter = element.querySelector('.meter.progress');
                const labelDiv = meter.querySelector('.label');
                const input = meter.querySelector('input');

                if (!meter || !labelDiv || !input) {
                    return;
                }

                // Click to show input
                labelDiv.addEventListener('click', () => {
                    labelDiv.hidden = true;
                    input.hidden = false;
                    input.focus();
                    input.select();
                });

                // Blur to hide input and update value
                input.addEventListener('blur', async () => {
                    input.hidden = true;
                    labelDiv.hidden = false;

                    const newValue = parseInt(input.value) || 0;
                    const clampedValue = Math.max(0, Math.min(newValue, valueMax));

                    if (onUpdate) {
                        await onUpdate(clampedValue);
                    } else if (document && property) {
                        await document.update({[property]: clampedValue});
                    }
                });

                // Enter to commit
                input.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        input.blur();
                    } else if (event.key === 'Escape') {
                        input.value = valueNow;
                        input.blur();
                    }
                });
            }
        }
    };
}
