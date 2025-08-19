const PSIONIC_SCHOOLS = ['ava', 'awa', 'imm', 'nom', 'sok', 'wuj'];

function extractPowerPointCosts(spell) {
    if (!spell.system.activities) return null;

    const costs = [];
    for (const activity of spell.system.activities) {
        if (!activity.consumption?.targets) continue;

        for (const target of activity.consumption.targets) {
            if (target.type === 'itemUses' && target.target === 'Compendium.sosly-5e-house-rules.classes.Item.yXFJ10Lf7yDyu5OM') {
                const cost = parseInt(target.value);
                if (!isNaN(cost)) costs.push(cost);
            }
        }
    }

    if (costs.length === 0) return null;

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
    if (!data.actor) return;

    const psionicSpells = html.find('[data-item-level="99"]').filter((index, element) => {
        const itemId = element.dataset.itemId;
        if (!itemId) return false;

        const spell = data.actor.items.get(itemId);
        return spell && isPsionicSpell(spell);
    });

    psionicSpells.each((index, element) => {
        const itemId = element.dataset.itemId;
        const spell = data.actor.items.get(itemId);
        if (!spell) return;

        const powerPointCosts = extractPowerPointCosts(spell);
        if (!powerPointCosts) return;

        const subtitleElement = element.querySelector('.name-stacked .subtitle');
        if (!subtitleElement) return;

        const existingText = subtitleElement.textContent.trim();
        const newText = existingText ? `${existingText} • ${powerPointCosts}` : powerPointCosts;
        subtitleElement.textContent = newText;
    });
}
