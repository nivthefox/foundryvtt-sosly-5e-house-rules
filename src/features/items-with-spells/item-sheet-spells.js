import {ELIGIBLE_ITEM_TYPES} from './constants';

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

        const templatePath = 'modules/sosly-5e-house-rules/templates/features/items-with-spells/spells-tab.hbs';
        const rendered = await renderTemplate(templatePath, {});

        const contentWrapper = document.createElement('div');
        contentWrapper.innerHTML = rendered;
        const content = contentWrapper.firstElementChild;
        spellsTab.appendChild(content);
    });
}
