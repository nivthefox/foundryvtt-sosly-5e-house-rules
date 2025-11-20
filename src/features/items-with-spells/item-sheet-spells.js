import {ELIGIBLE_ITEM_TYPES} from './constants';
import {getItemSpells, isSpellLinked, addSpellToItem, fetchSpellData, removeSpellFromItem} from './utils';

export function registerItemSheetSpells() {
    if (!dnd5e?.applications?.item?.ItemSheet5e2) {
        console.warn('sosly-5e-house-rules | Items with Spells feature requires D&D 5e v4+');
        return;
    }

    dnd5e.applications.item.ItemSheet5e2.TABS.push({
        tab: 'sosly-items-with-spells',
        label: 'TYPES.Item.spellPl',
        condition: item => {
            if (!ELIGIBLE_ITEM_TYPES.includes(item.type)) {
                return false;
            }
            if (!game.user.isGM && item.system.identified === false) {
                return false;
            }
            return true;
        }
    });

    Hooks.on('renderItemSheetV2', async (app, [html]) => {
        if (!ELIGIBLE_ITEM_TYPES.includes(app.item.type)) {
            return;
        }

        const sheetBody = html.querySelector('.sheet-body');
        if (!sheetBody) {
            return;
        }

        let spellsTab = html.querySelector('.tab[data-tab="sosly-items-with-spells"]');
        if (!spellsTab) {
            const activeClass = app._tabs?.[0]?.active === 'sosly-items-with-spells' ? 'active' : '';
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `<div class="tab sosly-items-with-spells ${activeClass}" data-group="primary" data-tab="sosly-items-with-spells"></div>`;
            spellsTab = wrapper.firstElementChild;
            sheetBody.appendChild(spellsTab);
        }

        const itemSpells = getItemSpells(app.item);
        const spells = await fetchSpellData(itemSpells);

        const templatePath = 'modules/sosly-5e-house-rules/templates/features/items-with-spells/spells-tab.hbs';
        const rendered = await renderTemplate(templatePath, {spells});

        spellsTab.innerHTML = '';
        const contentWrapper = document.createElement('div');
        contentWrapper.innerHTML = rendered;
        const content = contentWrapper.firstElementChild;
        spellsTab.appendChild(content);

        const contentZone = spellsTab.querySelector('.sosly-items-with-spells-content');

        if (app.isEditable && contentZone) {
            contentZone.addEventListener('drop', async event => {
                event.preventDefault();
                event.stopPropagation();
                await handleDrop(event, app);
            });
            contentZone.addEventListener('dragover', event => {
                event.preventDefault();
            });
        }

        if (contentZone) {
            contentZone.addEventListener('click', async event => {
                const editButton = event.target.closest('.item-control[data-action="edit"]');
                const deleteButton = event.target.closest('.item-control[data-action="delete"]');

                if (editButton) {
                    await handleEdit(event, app);
                } else if (deleteButton) {
                    await handleDelete(event, app);
                }
            });
        }
    });
}

async function handleDrop(event, app) {
    const data = TextEditor.getDragEventData(event);

    if (data.type !== 'Item') {
        return;
    }

    const spell = await fromUuid(data.uuid);

    if (!spell || spell.type !== 'spell') {
        return;
    }

    if (isSpellLinked(app.item, data.uuid)) {
        ui.notifications.warn(game.i18n.localize('SOSLY.items-with-spells.duplicate'));
        return;
    }

    await addSpellToItem(app.item, data.uuid);
    app.render();
}

async function handleEdit(event, app) {
    const spellRow = event.target.closest('[data-item-id]');

    if (!spellRow) {
        return;
    }

    const spellId = spellRow.dataset.itemId;
    const itemSpells = getItemSpells(app.item);
    const spellEntry = itemSpells.find(s => s.id === spellId);

    if (!spellEntry) {
        return;
    }

    const spell = await fromUuid(spellEntry.uuid);

    if (!spell) {
        ui.notifications.warn('Spell not found');
        return;
    }

    spell.sheet.render(true);
}

async function handleDelete(event, app) {
    const spellRow = event.target.closest('[data-item-id]');

    if (!spellRow) {
        return;
    }

    const spellId = spellRow.dataset.itemId;
    const itemSpells = getItemSpells(app.item);
    const spellEntry = itemSpells.find(s => s.id === spellId);

    if (!spellEntry) {
        return;
    }

    const spell = await fromUuid(spellEntry.uuid);
    const spellName = spell?.name ?? 'this spell';

    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: {
            title: game.i18n.localize('sosly.items-with-spells.delete-confirm-title')
        },
        content: game.i18n.format('sosly.items-with-spells.delete-confirm', {
            spellName: spellName,
            itemName: app.item.name
        }),
        modal: true
    });

    if (!confirmed) {
        return;
    }

    await removeSpellFromItem(app.item, spellId);

    if (spell && spell.isEmbedded) {
        await spell.delete();
    }

    app.render();
}
