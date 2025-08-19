/**
 * Reusable meter component utility
 * Creates meter HTML elements for character sheet integration with built-in configuration
 */

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
            template: 'modules/sosly-5e-house-rules/templates/components/meter-config.hbs'
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
 * @param {Document} [options.document] - Document to update when configuring
 * @param {string} [options.property] - Property path to update
 * @param {number[]} [options.thresholds] - Array of threshold values for tick marks
 * @param {boolean} [options.allowOverflow=false] - Whether values can exceed maximum
 * @returns {string} HTML string for the meter component
 */
export async function createMeter({label, valueNow, valueMax, cssClass,
    editable = false, document, property, thresholds = [], allowOverflow = false}) {

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
        percentage,
        thresholds: thresholdTicks,
        isOverflow,
        allowOverflow
    };

    const html = await renderTemplate('modules/sosly-5e-house-rules/templates/components/meter.hbs', templateData);

    // If editable, set up the config button handler
    if (editable && document && property) {
        // We need to return both HTML and a setup function
        return {
            html,
            setup: element => {
                const configButton = element.querySelector('[data-action="config"]');
                if (configButton) {
                    configButton.addEventListener('click', event => {
                        event.preventDefault();
                        new MeterConfig(document, property, label, valueMax, allowOverflow, {}).render(true);
                    });
                }
            }
        };
    }

    return {html, setup: () => {}};
}
