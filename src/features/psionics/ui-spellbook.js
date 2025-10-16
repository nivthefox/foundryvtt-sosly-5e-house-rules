export const PSIONIC_SCHOOLS = ['ava', 'awa', 'imm', 'nom', 'sok', 'wuj'];

export function getMinimumPowerPointCost(spell, actor) {
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

    return Math.min(...costs);
}

function extractPowerPointCosts(spell, actor) {
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
        return `${minCost} Power Point${minCost === 1 ? '' : 's'}`;
    }
    return `${minCost}-${maxCost} Power Points`;
}

function isPsionicSpell(spell) {
    return spell.system.level === 99 && PSIONIC_SCHOOLS.includes(spell.system.school);
}

export function addPsionicSubtitles(app, html, data) {
    if (!data.actor) {
        return;
    }

    const el = html[0];
    const psionicSpellElements = el.querySelectorAll('[data-item-level="99"]');

    for (const element of psionicSpellElements) {
        const itemId = element.dataset.itemId;
        if (!itemId) {
            continue;
        }

        const spell = data.actor.items.get(itemId);
        if (!spell || !isPsionicSpell(spell)) {
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
