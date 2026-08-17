import { getPowerLimit } from './ui-common';
import { id as module_id } from '../../../module.json';

const MANIFESTING_CARD_SELECTOR = '[data-sosly-card="psionic-manifesting"]';
const SPELLBOOK_TOP_SELECTOR = '[data-application-part="spells"] > .top';
const manifestingRenderTokens = new WeakMap();

function removeManifestingCards(element) {
    for (const card of element.querySelectorAll(MANIFESTING_CARD_SELECTOR)) {
        card.remove();
    }
}

/**
 * @param {Application} app
 * @param {HTMLElement} element
 * @param {object} context
 * @param {object} options
 */
export async function injectPsionicistManifestingCard(app, element, context, options) {
    const renderToken = Symbol('psionic-manifesting-render');
    manifestingRenderTokens.set(app, renderToken);

    if (!context.actor) {
        removeManifestingCards(element);
        return;
    }

    const psionicistClass = context.actor.classes?.psionicist;
    if (!psionicistClass) {
        removeManifestingCards(element);
        return;
    }

    const abilityId = psionicistClass.system.spellcasting?.ability ?? 'int';
    const abilityMod = context.actor.system.abilities[abilityId]?.mod ?? 0;
    const profBonus = context.actor.system.attributes.prof;
    const powerLimit = getPowerLimit(context.actor);

    if (powerLimit === null) {
        removeManifestingCards(element);
        return;
    }

    const attack = abilityMod + profBonus;
    const save = 8 + abilityMod + profBonus;
    const isPrimary = context.actor.system.attributes.spellcasting === abilityId;

    const templateData = {
        abilityId,
        isPrimary,
        powerLimit,
        abilityMod: `${abilityMod >= 0 ? '+' : ''}${abilityMod}`,
        attackBonus: `${attack >= 0 ? '+' : ''}${attack}`,
        saveDC: save
    };

    const cardHTML = await renderTemplate(
        `modules/${module_id}/templates/features/psionics/manifesting-card.hbs`,
        templateData
    );

    if (manifestingRenderTokens.get(app) !== renderToken) {
        return;
    }

    const topSection = element.querySelector(SPELLBOOK_TOP_SELECTOR);
    if (!topSection) {
        removeManifestingCards(element);
        return;
    }

    const template = document.createElement('template');
    template.innerHTML = cardHTML.trim();
    const card = template.content.firstElementChild;
    if (!card) {
        removeManifestingCards(element);
        return;
    }

    removeManifestingCards(element);
    topSection.appendChild(card);

    const button = card.querySelector('button[data-action="spellcasting"]');
    if (button) {
        button.addEventListener('click', () => {
            context.actor.update({ 'system.attributes.spellcasting': abilityId });
        });
    }
}
