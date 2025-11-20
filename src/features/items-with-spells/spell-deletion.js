import {getSpellsForItem, removeParentItemId} from './utils';

export function registerSpellDeletion() {
    Hooks.on('preDeleteItem', async (item, options, userId) => {
        if (!item.isEmbedded) {
            return;
        }

        if (!item.actor) {
            return;
        }

        const childSpells = getSpellsForItem(item.actor, item.id);

        if (childSpells.length === 0) {
            return;
        }

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: {
                title: game.i18n.localize('sosly.items-with-spells.delete-parent-title')
            },
            content: game.i18n.format('sosly.items-with-spells.delete-parent-confirm', {
                itemName: item.name,
                count: childSpells.length
            }),
            modal: true
        });

        if (confirmed) {
            for (const spell of childSpells) {
                await spell.delete();
            }
        } else {
            for (const spell of childSpells) {
                await removeParentItemId(spell);
            }
        }
    });
}
