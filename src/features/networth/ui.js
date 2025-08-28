/**
 * Net Worth UI Integration
 * Adds net worth display to character sheets
 */

import { calculateNetWorth } from './calculator';

/**
 * Add net worth display to character sheet
 * @param {Application} app - The sheet application
 * @param {HTMLElement} el - The sheet HTML element
 */
function addNetworthDisplay(app, el) {
    const networth = calculateNetWorth(app.actor);
    const currencies = el.querySelector('.tab.inventory .middle');

    if (!currencies) return;

    const networthEl = document.createElement('div');
    networthEl.classList.add('net-worth');

    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-coins');
    icon.setAttribute('data-tooltip', 'sosly.networth');
    icon.setAttribute('aria-label', 'Net Worth');

    const content = document.createElement('span');
    content.textContent = networth.toLocaleString();

    networthEl.appendChild(icon);
    networthEl.appendChild(content);

    currencies.appendChild(networthEl);
}

/**
 * Register hooks for net worth UI integration
 */
export function registerNetworthHooks() {
    // PCs
    Hooks.on('renderActorSheet5eCharacter2', (app, html, data) => {
        const el = html[0];
        addNetworthDisplay(app, el);
    });

    // NPCs
    Hooks.on('renderActorSheet5eNPC2', (app, html, data) => {
        const el = html[0];
        addNetworthDisplay(app, el);
    });

    // Locations
    Hooks.on('renderLocationSheet', (app, html, data) => {
        const el = html[0];
        addNetworthDisplay(app, el);
    });
}
