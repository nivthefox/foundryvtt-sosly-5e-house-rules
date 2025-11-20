import {ELIGIBLE_ITEM_TYPES} from './constants';
import {getItemSpells, isSpellLinked, addSpellToItem, fetchSpellData} from './utils';

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

        if (app.isEditable) {
            const dropZone = spellsTab.querySelector('.sosly-items-with-spells-content');
            if (dropZone) {
                dropZone.addEventListener('drop', async event => {
                    event.preventDefault();
                    event.stopPropagation();
                    await handleDrop(event, app);
                });
                dropZone.addEventListener('dragover', event => {
                    event.preventDefault();
                });
            }
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
