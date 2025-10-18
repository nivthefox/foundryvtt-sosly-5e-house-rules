export const PSIONIC_SCHOOLS = ['ava', 'awa', 'imm', 'nom', 'sok', 'wuj'];

export function isPsionicSpell(spell) {
    return PSIONIC_SCHOOLS.includes(spell.system.school) && (spell.system.level === 0 || spell.system.level === 99);
}

export function getPowerPointItemIds(actor) {
    const powerPointsItems = actor.items.filter(item => item.system.identifier === 'spell-points');
    if (!powerPointsItems.length) {
        return null;
    }
    return new Set(powerPointsItems.map(item => item.id));
}

export function getPowerLimit(actor) {
    const psionicistClass = actor.classes?.psionicist;
    if (!psionicistClass) {
        return null;
    }

    const level = psionicistClass.system?.levels;
    if (!level) {
        return null;
    }

    const powerLimitAdvancement = psionicistClass.advancement?.byType?.ScaleValue?.find(adv => adv.title === 'Power Limit');
    if (!powerLimitAdvancement) {
        return null;
    }

    return powerLimitAdvancement.valueForLevel(level)?.value ?? null;
}

export function getMinimumPowerPointCost(spell, actor) {
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

    return Math.min(...costs);
}
