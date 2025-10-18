import { isPsionicSpell, getPowerPointItemIds, getPowerLimit, getMinimumPowerPointCost } from './ui-common';

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

export function addPsionicSubtitles(app, html, data) {
    if (!data.actor) {
        return;
    }

    const el = html[0];
    const psionicPowerElements = el.querySelectorAll('[data-item-level="99"]');
    const psionicTalentElements = el.querySelectorAll('[data-item-level="0"]');
    const powerLimit = getPowerLimit(data.actor);

    for (const element of [...psionicPowerElements, ...psionicTalentElements]) {
        const itemId = element.dataset.itemId;
        if (!itemId) {
            continue;
        }

        const spell = data.actor.items.get(itemId);
        if (!spell || !isPsionicSpell(spell)) {
            continue;
        }

        const minCost = getMinimumPowerPointCost(spell, data.actor);
        if (powerLimit !== null && minCost !== null && minCost > powerLimit) {
            element.remove();
            continue;
        }

        const powerPointCosts = extractPowerPointCosts(spell, data.actor);
        if (!powerPointCosts) {
            continue;
        }

        const subtitleElement = element.querySelector('.item-row > .item-name .name-stacked .subtitle');
        if (!subtitleElement) {
            continue;
        }

        const existingText = subtitleElement.textContent.trim();
        const newText = existingText ? `${existingText} • ${powerPointCosts}` : powerPointCosts;
        subtitleElement.textContent = newText;
    }
}
