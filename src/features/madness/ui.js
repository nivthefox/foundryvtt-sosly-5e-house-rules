import {id as module_id} from '../../../module.json';

/**
 * Madness Tracking UI Integration
 * Adds madness level tracking to character sheets
 */

/**
 * Add madness tracking to character sheet
 * @param {Application} app - The sheet application
 * @param {HTMLElement} el - The sheet HTML element
 */
function addMadnessTracking(app, el) {
    if (!game.settings.get(module_id, 'madness')) {
        return;
    }

    const card = el.querySelector('.sidebar .card');
    if (!card) return;

    const madnessEl = document.createElement('div');
    madnessEl.classList.add('madness');
    const badgeEl = document.createElement('div');
    badgeEl.classList.add('badge', 'madness-badge');
    const labelEl = document.createElement('div');
    labelEl.classList.add('value');
    labelEl.setAttribute('data-action', 'rollMadness');
    labelEl.textContent = app.actor.flags.sosly?.madness || 0;
    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.classList.add('madness-input', 'hidden');
    inputBox.value = app.actor.flags.sosly?.madness || 0;

    labelEl.addEventListener('click', () => {
        // hide the label and show the input box
        labelEl.classList.add('hidden');
        inputBox.classList.remove('hidden');
        inputBox.focus();
        inputBox.select();
    });

    inputBox.addEventListener('blur', () => {
        // hide the input box and show the label
        const value = parseInt(inputBox.value);
        if (isNaN(value) || value < 0) {
            ui.notifications.error(game.i18n.localize('sosly.madness.invalid'));
            inputBox.value = app.actor.flags.sosly?.madness || 0;
        } else {
            app.actor.update({flags: { sosly: { madness: value } }});
            labelEl.textContent = value;
        }
        inputBox.classList.add('hidden');
        labelEl.classList.remove('hidden');
    });

    badgeEl.append(inputBox);
    badgeEl.append(labelEl);
    madnessEl.append(badgeEl);
    card.prepend(madnessEl);
}

/**
 * Register hooks for madness UI integration
 */
export function registerMadnessHooks() {
    // PCs only
    Hooks.on('renderActorSheet5eCharacter2', (app, html, data) => {
        const el = html[0];
        addMadnessTracking(app, el);
    });
}
