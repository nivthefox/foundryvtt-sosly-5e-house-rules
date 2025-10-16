import { getPowerLimit } from './ui-spellbook';

/**
 * @param {Application} app
 * @param {jQuery} html
 * @param {object} context
 */
export async function injectPsionicistManifestingCard(app, html, context) {
    if (!context.actor) {
        return;
    }

    const psionicistClass = context.actor.classes?.psionicist;
    if (!psionicistClass) {
        return;
    }

    const intMod = context.actor.system.abilities.int.mod;
    const profBonus = context.actor.system.attributes.prof;
    const powerLimit = getPowerLimit(context.actor);

    if (powerLimit === null) {
        return;
    }

    const el = html[0];
    const topSection = el.querySelector('.spells .top');
    if (!topSection) {
        return;
    }

    const attack = intMod + profBonus;
    const save = 8 + intMod + profBonus;

    const templateData = {
        powerLimit,
        abilityMod: `${intMod >= 0 ? '+' : ''}${intMod}`,
        attackBonus: `${attack >= 0 ? '+' : ''}${attack}`,
        saveDC: save
    };

    const cardHTML = await renderTemplate(
        'modules/sosly-5e-house-rules/templates/features/psionics/manifesting-card.hbs',
        templateData
    );

    topSection.insertAdjacentHTML('beforeend', cardHTML);
}
