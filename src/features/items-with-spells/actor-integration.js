import {getItemSpells, createSpellOnActor, updateItemSpellFlags} from './utils';

export function registerActorIntegration() {
    Hooks.on('createItem', async (item, options, userId) => {
        if (!item.isEmbedded) {
            return;
        }

        if (!item.actor) {
            return;
        }

        const itemSpells = getItemSpells(item);

        if (itemSpells.length === 0) {
            return;
        }

        for (const spellEntry of itemSpells) {
            const createdSpell = await createSpellOnActor(
                item.actor,
                spellEntry.uuid,
                item.id,
                item,
                spellEntry.overrides || {}
            );

            if (!createdSpell) {
                continue;
            }

            await updateItemSpellFlags(item, spellEntry.id, createdSpell.uuid);
        }
    });
}
