const FLAG_SCOPE = 'sosly-5e-house-rules';
const FLAG_KEY = 'item-spells';
const PARENT_FLAG_KEY = 'parent-item';

export function getSpellEntryId(entry) {
    return entry.id ?? entry.uuid.split('.').pop();
}

export function getItemSpells(item) {
    return item.getFlag(FLAG_SCOPE, FLAG_KEY) ?? [];
}

export function isSpellLinked(item, spellUuid) {
    const spells = getItemSpells(item);
    return spells.some(spell => spell.uuid === spellUuid);
}

export async function addSpellToItem(item, spellUuid) {
    const spells = getItemSpells(item);

    const newSpell = {
        uuid: spellUuid,
        overrides: {}
    };

    spells.push(newSpell);
    await item.setFlag(FLAG_SCOPE, FLAG_KEY, spells);
}

export async function fetchSpellData(spellList) {
    const spells = [];

    for (const entry of spellList) {
        const spell = await fromUuid(entry.uuid);

        const entryId = getSpellEntryId(entry);

        if (!spell) {
            spells.push({
                id: entryId,
                uuid: entry.uuid,
                name: 'Missing Spell',
                img: 'icons/svg/mystery-man.svg',
                displaySave: false,
                displayAttack: false,
                usesLabel: null,
                consumesLabel: null
            });
            continue;
        }

        const spellData = {
            id: entryId,
            uuid: entry.uuid,
            name: spell.name,
            img: spell.img,
            displaySave: false,
            displayAttack: false,
            saveLabel: null,
            attackLabel: null,
            usesLabel: null,
            consumesLabel: null
        };

        const saveActivity = spell.system.activities?.getByType('save')?.[0];
        if (saveActivity?.labels?.save && saveActivity.save?.dc?.value) {
            spellData.displaySave = true;
            spellData.saveLabel = game.i18n.format('DND5E.SaveDC', {
                dc: saveActivity.save.dc.value,
                ability: ''
            });
        }

        const attackActivity = spell.system.activities?.getByType('attack')?.[0];
        if (attackActivity?.labels?.toHit) {
            spellData.displayAttack = true;
            spellData.attackLabel = attackActivity.labels.toHit;
        }

        if (entry.overrides?.uses?.recovery === 'atwill') {
            spellData.usesLabel = game.i18n.localize('DND5E.SpellPrepAtWill');
        } else if (entry.overrides?.uses?.max) {
            const max = entry.overrides.uses.max;
            const recovery = entry.overrides.uses.recovery;
            if (recovery) {
                const recoveryLabel = CONFIG.DND5E.limitedUsePeriods[recovery]?.abbreviation || recovery;
                spellData.usesLabel = `${max}/${recoveryLabel}`;
            } else {
                spellData.usesLabel = max.toString();
            }
        }

        if (entry.overrides?.consumption?.value) {
            const value = entry.overrides.consumption.value;
            const plural = value > 1 ? 's' : '';
            spellData.consumesLabel = `${value} charge${plural}`;
        }

        spells.push(spellData);
    }

    return spells;
}

export function getParentItemId(spell) {
    return spell.getFlag(FLAG_SCOPE, PARENT_FLAG_KEY);
}

export async function setParentItemId(spell, parentItemId) {
    await spell.setFlag(FLAG_SCOPE, PARENT_FLAG_KEY, parentItemId);
}

export async function removeParentItemId(spell) {
    await spell.unsetFlag(FLAG_SCOPE, PARENT_FLAG_KEY);
}

export async function removeSpellFromItem(item, spellId) {
    const spells = getItemSpells(item);
    const filtered = spells.filter(spell => getSpellEntryId(spell) !== spellId);
    await item.setFlag(FLAG_SCOPE, FLAG_KEY, filtered);
}

export async function createSpellOnActor(actor, spellUuid, parentItemId, parentItem, overrides = {}) {
    const sourceSpell = await fromUuid(spellUuid);

    if (!sourceSpell) {
        return null;
    }

    const spellData = sourceSpell.toObject();

    if (parentItem && Object.keys(overrides).length > 0) {
        const update = createUpdateObject(parentItem, sourceSpell, overrides);
        foundry.utils.mergeObject(spellData, update);
    }

    const createdSpells = await actor.createEmbeddedDocuments('Item', [spellData]);
    const createdSpell = createdSpells[0];

    await setParentItemId(createdSpell, parentItemId);

    return createdSpell;
}

export async function updateItemSpellFlags(item, oldId, newUuid) {
    const spells = getItemSpells(item);
    const spell = spells.find(s => getSpellEntryId(s) === oldId);

    if (!spell) {
        return;
    }

    spell.uuid = newUuid;

    await item.setFlag(FLAG_SCOPE, FLAG_KEY, spells);
}

export function getSpellsForItem(actor, itemId) {
    return actor.items.filter(item => {
        if (item.type !== 'spell') {
            return false;
        }
        return getParentItemId(item) === itemId;
    });
}

export function createUpdateObject(parentItem, spell, overrides = {}) {
    const update = {
        [`flags.${FLAG_SCOPE}.${PARENT_FLAG_KEY}`]: parentItem.id,
        'system.method': 'atwill',
        'system.uses.spent': null
    };

    const tidy5eSectionFlag = spell.flags?.['tidy5e-sheet']?.section;
    if (tidy5eSectionFlag) {
        update['flags.tidy5e-sheet.section'] = null;
    }

    if (overrides.uses?.recovery === 'atwill') {
        update['system.uses.max'] = null;
        update['system.uses.recovery'] = null;
    } else if (overrides.uses?.max) {
        update['system.uses.max'] = overrides.uses.max;
        if (overrides.uses.recovery) {
            update['system.uses.recovery'] = [{period: overrides.uses.recovery}];
        } else {
            update['system.uses.recovery'] = null;
        }
    }

    const consumptionTargets = !overrides.consumption?.value ? false : [{
        type: 'itemUses',
        value: overrides.consumption.value,
        target: parentItem.id,
        scaling: {mode: overrides.consumption.scaling ? 'amount' : ''}
    }];

    for (const activity of spell.system.activities.values()) {
        const actId = activity.id;

        update[`system.activities.${actId}.consumption.spellSlot`] = false;

        if (consumptionTargets) {
            update[`system.activities.${actId}.consumption.targets`] = consumptionTargets;
        }

        if (activity.type === 'save' && overrides.saveActivity && overrides.saveActivity?.calculation !== 'noOverride') {
            update[`system.activities.${actId}.save.dc.calculation`] = overrides.saveActivity.calculation;
            if (overrides.saveActivity.calculation === '' && overrides.saveActivity?.formula) {
                update[`system.activities.${actId}.save.dc.formula`] = overrides.saveActivity.formula;
            }
        }

        if (activity.type === 'attack' && overrides.attackActivity) {
            if (overrides.attackActivity.ability !== 'noOverride') {
                update[`system.activities.${actId}.attack.ability`] = overrides.attackActivity.ability;
            }
            if (overrides.attackActivity.bonus) {
                update[`system.activities.${actId}.attack.bonus`] = overrides.attackActivity.bonus;
            }
            if (overrides.attackActivity.flat) {
                update[`system.activities.${actId}.attack.flat`] = overrides.attackActivity.flat;
            }
        }
    }

    return update;
}
