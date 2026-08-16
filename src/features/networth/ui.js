/**
 * Net Worth UI Integration
 * Adds net worth display to character sheets
 */

import { calculateNetWorth } from './calculator';

const NET_WORTH_SELECTOR = ':scope > .net-worth';

function createNetworthDisplay() {
    const networthEl = document.createElement('div');
    networthEl.classList.add('net-worth');

    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-coins');
    icon.setAttribute('data-tooltip', 'sosly.networth');
    icon.setAttribute('aria-label', 'Net Worth');

    const content = document.createElement('span');

    networthEl.appendChild(icon);
    networthEl.appendChild(content);

    return networthEl;
}

/**
 * Add net worth display to character sheet
 * @param {Application} app - The sheet application
 * @param {HTMLElement} el - The sheet HTML element
 */
function addNetworthDisplay(app, el) {
    const currencies = el.querySelector('.inventory-element .currency');

    if (!currencies) {
        return;
    }

    const displays = currencies.querySelectorAll(NET_WORTH_SELECTOR);
    const networthEl = displays[0] ?? createNetworthDisplay();

    for (const duplicate of Array.from(displays).slice(1)) {
        duplicate.remove();
    }

    networthEl.querySelector('span').textContent = calculateNetWorth(app.actor).toLocaleString();

    if (networthEl.parentElement !== currencies) {
        currencies.appendChild(networthEl);
    }
}

/**
 * Register hooks for net worth UI integration
 */
export function registerNetworthHooks() {
    // PCs
    Hooks.on('renderCharacterActorSheet', (app, element, context, options) => {
        addNetworthDisplay(app, element);
    });

    // NPCs
    Hooks.on('renderNPCActorSheet', (app, element, context, options) => {
        addNetworthDisplay(app, element);
    });

    // Locations
    Hooks.on('renderLocationSheet', (app, element, context, options) => {
        addNetworthDisplay(app, element);
    });
}
