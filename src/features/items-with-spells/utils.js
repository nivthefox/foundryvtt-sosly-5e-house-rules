const FLAG_SCOPE = 'sosly-5e-house-rules';
const FLAG_KEY = 'item-spells';

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
