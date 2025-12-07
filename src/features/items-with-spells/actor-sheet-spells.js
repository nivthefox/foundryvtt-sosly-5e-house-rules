import {id as module_id} from '../../../module.json';
import {getParentItemId, getItemSpells} from './utils';
import {ELIGIBLE_ITEM_TYPES} from './constants';

export function registerActorSheetSpells() {
    if (!game.modules.get('lib-wrapper')?.active) {
        console.warn('sosly-5e-house-rules | Items with Spells requires lib-wrapper');
        return;
    }

    libWrapper.register(
        module_id,
        'dnd5e.applications.actor.ActorSheet5eCharacter.prototype._prepareSpellbook',
        prepareItemSpellbook,
        'WRAPPER'
    );

    libWrapper.register(
        module_id,
        'dnd5e.applications.actor.ActorSheet5eNPC.prototype._prepareSpellbook',
        prepareItemSpellbook,
        'WRAPPER'
    );
}

function prepareItemSpellbook(wrapped, data, spells) {
    const atBottom = game.settings.get(module_id, 'items-with-spells-sort-order');
    const order = atBottom ? 20 : -5;

    const nonItemSpells = [];
    const spellsPerItem = new Map();

    for (const spell of spells) {
        const parentId = getParentItemId(spell);

        if (!parentId) {
            nonItemSpells.push(spell);
            continue;
        }

        const parentItem = this.actor.items.get(parentId);

        if (!parentItem) {
            nonItemSpells.push(spell);
            continue;
        }

        if (!spellsPerItem.has(parentId)) {
            spellsPerItem.set(parentId, []);
        }

        spellsPerItem.get(parentId).push(spell);
    }

    const spellbook = wrapped(data, nonItemSpells);

    const itemsWithSpells = this.actor.items.filter(item => {
        if (!ELIGIBLE_ITEM_TYPES.includes(item.type)) {
            return false;
        }

        const spells = getItemSpells(item);
        return spells.length > 0;
    });

    for (const item of itemsWithSpells) {
        const itemSpells = spellsPerItem.get(item.id);

        if (!itemSpells || itemSpells.length === 0) {
            continue;
        }

        for (const spell of itemSpells) {
            const ctx = data.itemContext[spell.id] ??= {};
            ctx.hasUses = spell.hasLimitedUses;
            ctx.hasRecharge = spell.hasRecharge;
        }

        const section = {
            order: order,
            label: item.name,
            usesSlots: false,
            canCreate: false,
            canPrepare: false,
            spells: itemSpells,
            uses: item.system.uses?.value ?? '-',
            slots: item.system.uses?.max ?? '-',
            override: 0,
            dataset: {'item-with-spells-id': item.id},
            prop: `item-${item.id}`
        };

        spellbook.push(section);
    }

    spellbook.sort((a, b) => (a.order - b.order) || a.label.localeCompare(b.label));

    return spellbook;
}
