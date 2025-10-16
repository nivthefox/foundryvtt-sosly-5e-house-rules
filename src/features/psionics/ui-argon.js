import { PSIONIC_SCHOOLS } from './ui-spellbook';

function isPsionicSpell(spell) {
    return spell.system.level === 99 && PSIONIC_SCHOOLS.includes(spell.system.school);
}

function getPowerPointCostRange(spell, actor) {
    if (!spell.system.activities) {
        return null;
    }

    const powerPointsItems = actor.items.filter(item => item.system.identifier === 'spell-points');
    if (!powerPointsItems.length) {
        return null;
    }

    const powerPointsIds = new Set(powerPointsItems.map(item => item.id));

    const costs = [];
    for (const activity of spell.system.activities) {
        if (!activity.consumption?.targets) {
            continue;
        }

        for (const target of activity.consumption.targets) {
            if (target.type === 'itemUses' && powerPointsIds.has(target.target)) {
                const cost = parseInt(target.value);
                if (!isNaN(cost)) {
                    costs.push(cost);
                }
            }
        }
    }

    if (costs.length === 0) {
        return null;
    }

    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);

    if (minCost === maxCost) {
        return `${minCost}`;
    }
    return `${minCost}-${maxCost}`;
}

function updatePsionicButtonQuantities(component, element, actor) {
    if (!actor) {
        return;
    }

    const buttons = element.querySelectorAll('.feature-element');
    for (const button of buttons) {
        const img = button.style.backgroundImage;
        if (!img) {
            continue;
        }

        const imgUrl = img.slice(5, -2);
        const item = actor.items.find(i => i.img === imgUrl);
        if (!item || !isPsionicSpell(item)) {
            continue;
        }

        const costRange = getPowerPointCostRange(item, actor);
        if (costRange === null) {
            continue;
        }

        const quantitySpan = button.querySelector('.quantity-1 span');
        if (!quantitySpan) {
            continue;
        }

        quantitySpan.innerHTML = `<span class="psionic-cost">${costRange}</span>`;
    }
}

export function registerArgonIntegration() {
    if (!game.modules.get('enhancedcombathud')?.active) {
        return;
    }

    Hooks.on('renderAccordionPanelCategoryArgonComponent', updatePsionicButtonQuantities);
}
