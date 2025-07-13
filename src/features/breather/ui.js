/**
 * Breather UI Integration
 * Adds breather buttons to character sheets
 */

import { performBreather } from './rest-handler';

/**
 * Add breather button to character sheet
 * @param {Application} app - The sheet application
 * @param {HTMLElement} el - The sheet HTML element
 */
function addBreatherButton(app, el) {
    if (!game.settings.get('sosly-5e-house-rules', 'breather')) {
        return;
    }

    const buttons = el.querySelector('.sheet-header-buttons');
    if (!buttons) return;

    const button = document.createElement('button');
    button.classList.add('breather-button', 'gold-button');
    button.setAttribute('data-tooltip', 'sosly.breather.label');
    button.setAttribute('aria-label', game.i18n.localize('sosly.breather.label'));

    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-face-exhaling');

    button.appendChild(icon);
    buttons.prepend(button);

    button.addEventListener('click', async event => {
        await performBreather(app.actor, event);
    });
}

/**
 * Register hooks for breather UI integration
 */
export function registerBreatherUI() {
    // PCs
    Hooks.on('renderActorSheet5eCharacter2', (app, html, data) => {
        const el = html[0];
        addBreatherButton(app, el);
    });

    // NPCs
    Hooks.on('renderActorSheet5eNPC2', (app, html, data) => {
        const el = html[0];
        addBreatherButton(app, el);
    });
}
