import { getPowerLimit } from './ui-common';
import { id as module_id } from '../../../module.json';

/**
 * @param {Application} app
 * @param {HTMLElement} element
 * @param {object} context
 * @param {object} options
 */
export async function injectPsionicistManifestingCard(app, element, context, options) {
    if (!context.actor) {
        return;
    }

    const psionicistClass = context.actor.classes?.psionicist;
    if (!psionicistClass) {
        return;
    }

    const abilityId = psionicistClass.system.spellcasting?.ability ?? 'int';
    const abilityMod = context.actor.system.abilities[abilityId]?.mod ?? 0;
    const profBonus = context.actor.system.attributes.prof;
    const powerLimit = getPowerLimit(context.actor);

    if (powerLimit === null) {
        return;
    }

    const topSection = element.querySelector('.spells .top');
    if (!topSection) {
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

    topSection.insertAdjacentHTML('beforeend', cardHTML);

    const button = topSection.querySelector(`.spellcasting[data-ability="${abilityId}"] button[data-action="spellcasting"]`);
    if (button) {
        button.addEventListener('click', () => {
            context.actor.update({ 'system.attributes.spellcasting': abilityId });
        });
    }
}
