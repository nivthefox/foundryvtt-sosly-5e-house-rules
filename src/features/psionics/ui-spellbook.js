import { isPsionicSpell, getPowerPointItemIds, getPowerLimit, getMinimumPowerPointCost } from './ui-common';

const PSIONIC_COST_SELECTOR = '[data-sosly-psionic-cost]';

function extractPowerPointCosts(spell, actor) {
    if (!spell.system.activities) {
        return null;
    }

    const powerPointsIds = getPowerPointItemIds(actor);
    if (!powerPointsIds) {
        return null;
    }

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
        return `${minCost} Power Point${minCost === 1 ? '' : 's'}`;
    }
    return `${minCost}-${maxCost} Power Points`;
}

function reconcilePowerPointSubtitle(itemEl, powerPointCosts) {
    const subtitleElement = itemEl.querySelector('.item-row > .item-name .name-stacked .subtitle');
    if (!subtitleElement) {
        return;
    }

    let annotation = subtitleElement.querySelector(PSIONIC_COST_SELECTOR);
    if (!powerPointCosts) {
        annotation?.remove();
        return;
    }

    if (!annotation) {
        annotation = subtitleElement.ownerDocument.createElement('span');
        annotation.dataset.soslyPsionicCost = '';
        subtitleElement.append(annotation);
    }

    const baseSubtitle = Array.from(subtitleElement.childNodes)
        .filter(node => node !== annotation)
        .map(node => node.textContent)
        .join('')
        .trim();
    annotation.textContent = `${baseSubtitle ? ' • ' : ''}${powerPointCosts}`;
}

export function addPsionicSubtitles(app, element, context, options) {
    if (!context.actor) {
        return;
    }

    const itemElements = element.querySelectorAll('[data-item-id]');
    const powerLimit = getPowerLimit(context.actor);

    for (const itemEl of itemElements) {
        const itemId = itemEl.dataset.itemId;
        if (!itemId) {
            continue;
        }

        const spell = context.actor.items.get(itemId);
        if (!spell || !isPsionicSpell(spell)) {
            continue;
        }

        const minCost = getMinimumPowerPointCost(spell, context.actor);
        if (powerLimit !== null && minCost !== null && minCost > powerLimit) {
            itemEl.remove();
            continue;
        }

        const powerPointCosts = extractPowerPointCosts(spell, context.actor);
        reconcilePowerPointSubtitle(itemEl, powerPointCosts);
    }
}
