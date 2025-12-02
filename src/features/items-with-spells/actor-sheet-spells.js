import {id as module_id} from '../../../module.json';
import {getParentItemId} from './utils';

export function registerActorSheetSpells() {
    if (!game.modules.get('lib-wrapper')?.active) {
        console.warn('sosly-5e-house-rules | Items with Spells requires lib-wrapper');
        return;
    }

    libWrapper.register(
        module_id,
        'dnd5e.applications.actor.CharacterActorSheet.prototype._prepareSpellbook',
        prepareItemSpellbook,
        'WRAPPER'
    );

    libWrapper.register(
        module_id,
        'dnd5e.applications.actor.NPCActorSheet.prototype._prepareSpellbook',
        prepareItemSpellbook,
        'WRAPPER'
    );
}

function prepareItemSpellbook(wrapped, context) {
    const spellbook = wrapped(context);
    const atBottom = game.settings.get(module_id, 'items-with-spells-sort-order');
    const order = atBottom ? 2000 : -5;

    const spellsPerItem = new Map();
    const spellsToRemove = new Map();

    for (const [sectionKey, section] of Object.entries(spellbook)) {
        if (!section.items) {
            continue;
        }

        for (const spell of section.items) {
            const parentId = getParentItemId(spell);
            if (!parentId) {
                continue;
            }

            const parentItem = this.actor.items.get(parentId);
            if (!parentItem) {
                continue;
            }

            if (!spellsPerItem.has(parentId)) {
                spellsPerItem.set(parentId, {item: parentItem, spells: []});
            }
            spellsPerItem.get(parentId).spells.push(spell);

            if (!spellsToRemove.has(sectionKey)) {
                spellsToRemove.set(sectionKey, new Set());
            }
            spellsToRemove.get(sectionKey).add(spell);
        }
    }

    for (const [sectionKey, spells] of spellsToRemove) {
        spellbook[sectionKey].items = spellbook[sectionKey].items.filter(s => !spells.has(s));
    }

    const existingSection = Object.values(spellbook)[0];
    const columns = existingSection?.columns ?? [];

    for (const [parentId, data] of spellsPerItem) {
        const sectionKey = `item-${parentId}`;
        spellbook[sectionKey] = {
            label: data.item.name,
            columns,
            order: order,
            usesSlots: false,
            id: sectionKey,
            slot: sectionKey,
            items: data.spells,
            minWidth: 220,
            draggable: true,
            dataset: {type: 'spell', 'item-with-spells-id': parentId}
        };
    }

    return spellbook;
}
