import {id as module_id} from '../../../module.json';
import { createMeter } from '../../components/meters/meter.js';

/**
 * Madness Tracking UI Integration
 * Adds madness level tracking to character sheets
 */

/**
 * Add madness tracking to character sheet
 * @param {Application} app - The sheet application
 * @param {HTMLElement} el - The sheet HTML element
 * @param {Object} data - The template data from the sheet
 */
async function addMadnessTracking(app, el, data) {
    if (!game.settings.get(module_id, 'madness')) {
        return;
    }

    const statsContainer = el.querySelector('.dnd5e2.sheet.actor .sidebar .stats');
    if (!statsContainer) return;

    const madnessMax = game.settings.get(module_id, 'madness-max');
    const currentMadness = app.actor.flags?.sosly?.madness ?? 0;
    const isEditable = data.editable;

    const meterResult = await createMeter({
        label: game.i18n.localize('sosly.madness.label'),
        valueNow: currentMadness,
        valueMax: madnessMax,
        cssClass: 'madness',
        editable: isEditable,
        document: app.actor,
        property: 'flags.sosly.madness',
        thresholds: [2.5, 4.5, 6.5],
        allowOverflow: true
    });

    const meterElement = document.createElement('div');
    meterElement.innerHTML = meterResult.html;
    const meterGroup = meterElement.firstElementChild;

    // Set up the meter's event handlers
    meterResult.setup(meterGroup);

    statsContainer.appendChild(meterGroup);
}

/**
 * Register hooks for madness UI integration
 */
export function registerMadnessHooks() {
    // PCs only
    Hooks.on('renderActorSheet5eCharacter2', async (app, html, data) => {
        const el = html[0];
        await addMadnessTracking(app, el, data);
    });
}
