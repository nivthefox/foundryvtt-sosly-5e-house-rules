const FLAG_SCOPE = 'sosly-5e-house-rules';
const FLAG_KEY = 'item-spells';
const PARENT_FLAG_KEY = 'parent-item';

export function getItemSpells(item) {
    return item.getFlag(FLAG_SCOPE, FLAG_KEY) ?? [];
}

export function isSpellLinked(item, spellUuid) {
    const spells = getItemSpells(item);
    return spells.some(spell => spell.uuid === spellUuid);
}

export async function addSpellToItem(item, spellUuid) {
    const spells = getItemSpells(item);
    const id = spellUuid.split('.').pop();

    const newSpell = {
        uuid: spellUuid,
        id: id,
        overrides: {}
    };

    spells.push(newSpell);
    await item.setFlag(FLAG_SCOPE, FLAG_KEY, spells);
}

export async function fetchSpellData(spellList) {
    const spells = [];

    for (const entry of spellList) {
        const spell = await fromUuid(entry.uuid);

        if (!spell) {
            spells.push({
                id: entry.id,
                uuid: entry.uuid,
                name: 'Missing Spell',
                img: 'icons/svg/mystery-man.svg',
                displaySave: false,
                displayAttack: false
            });
            continue;
        }

        const spellData = {
            id: entry.id,
            uuid: entry.uuid,
            name: spell.name,
            img: spell.img,
            displaySave: false,
            displayAttack: false,
            saveLabel: null,
            attackLabel: null
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
    const filtered = spells.filter(spell => spell.id !== spellId);
    await item.setFlag(FLAG_SCOPE, FLAG_KEY, filtered);
}

export async function createSpellOnActor(actor, spellUuid, parentItemId) {
    const sourceSpell = await fromUuid(spellUuid);

    if (!sourceSpell) {
        return null;
    }

    const spellData = sourceSpell.toObject();
    const createdSpells = await actor.createEmbeddedDocuments('Item', [spellData]);
    const createdSpell = createdSpells[0];

    await setParentItemId(createdSpell, parentItemId);

    return createdSpell;
}

export async function updateItemSpellFlags(item, oldId, newUuid) {
    const spells = getItemSpells(item);
    const spell = spells.find(s => s.id === oldId);

    if (!spell) {
        return;
    }

    spell.uuid = newUuid;
    spell.id = newUuid.split('.').pop();

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
