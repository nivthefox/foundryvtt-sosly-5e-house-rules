import {ItemListControls} from '../../shared/item-list-controls.js';

export class LocationSheet extends ActorSheet {
    static MODES = {
        PLAY: 1,
        EDIT: 2
    };

    static TABS = [
        { tab: 'inventory', label: 'sosly.location.tabs.inventory', svg: 'backpack' },
        { tab: 'features', label: 'sosly.location.tabs.features', icon: 'fas fa-list' },
        { tab: 'details', label: 'sosly.location.tabs.details', icon: 'fas fa-feather' }
    ];

    constructor(object, options) {
        super(object, options);
        this._mode = this.constructor.MODES.PLAY;
        this._expanded = new Set();
        this.itemListControls = new ItemListControls(this, 'inventory');
    }

    get isEditable() {
        return this.document.isOwner && (this._mode === this.constructor.MODES.EDIT);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['dnd5e2', 'sheet', 'actor', 'location', 'vertical-tabs'],
            width: 720,
            height: 680,
            minWidth: 600,
            minHeight: 500,
            resizable: true,
            scrollY: ['.sheet-body'],
            tabs: [
                {
                    navSelector: '.tabs',
                    contentSelector: '.tab-body',
                    initial: 'inventory'
                }
            ],
            dragDrop: [
                {dragSelector: '.item', dropSelector: null}
            ]
        });
    }

    get template() {
        return 'modules/sosly-5e-house-rules/templates/features/location/location-sheet.hbs';
    }

    async getData() {
        const context = await super.getData();
        const source = this.document.toObject();
        const system = this.document.system;

        context.system = system;
        context.source = source.system;
        context.editable = this.isEditable;
        context.owner = this.document.isOwner;

        context.features = this._prepareFeatures(context);
        await this._prepareItems(context);

        context.filters = this.itemListControls._filters;

        context.currencyLabels = {
            pp: game.i18n.localize('DND5E.CurrencyPP'),
            gp: game.i18n.localize('DND5E.CurrencyGP'),
            ep: game.i18n.localize('DND5E.CurrencyEP'),
            sp: game.i18n.localize('DND5E.CurrencySP'),
            cp: game.i18n.localize('DND5E.CurrencyCP')
        };

        if (!context.system.currency) {
            context.system.currency = {};
        }
        ['pp', 'gp', 'ep', 'sp', 'cp'].forEach(denomination => {
            if (context.system.currency[denomination] === undefined) {
                context.system.currency[denomination] = 0;
            }
        });

        context.typeChoices = Object.entries(system.schema.fields.details.fields.type.choices)
            .map(([key, label]) => ({
                value: key,
                label: game.i18n.localize(label),
                selected: system.details.type === key
            }));

        const description = system.details.description || '<p/>';
        context.enrichedDescription = await TextEditor.enrichHTML(description, {
            secrets: this.document.isOwner,
            documents: true,
            links: true,
            rolls: true,
            rollData: context.rollData,
            async: true
        });

        return context;
    }

    _prepareFeatures(context) {
        const items = [];

        for (const item of this.document.items.values()) {
            if (item.type !== 'feat') {
                continue;
            }
            items.push(this._prepareItemContext(item, context));
        }

        return items.sort((a, b) => a.sort - b.sort);
    }

    async _prepareItems(context) {
        const inventory = {};
        const inventoryTypes = Object.entries(CONFIG.Item?.dataModels || {})
            .filter(([, model]) => model.metadata?.inventoryItem)
            .sort(([, lhs], [, rhs]) => (lhs.metadata.inventoryOrder - rhs.metadata.inventoryOrder));

        for (const [type] of inventoryTypes) {
            inventory[type] = {
                label: `${CONFIG.Item.typeLabels[type]}Pl`,
                items: [],
                dataset: { type }
            };
        }

        if (!this.document.items?.size) {
            context.inventory = Object.values(inventory);
            context.inventory.push({ label: 'DND5E.Contents', items: [], dataset: { type: 'all' } });
            return;
        }

        for (const item of this.document.items.values()) {
            if (item.type === 'feat' || item.system?.container) {
                continue;
            }
            const preparedItem = await this._prepareItemContext(item, context);
            if (inventory[item.type]) {
                inventory[item.type].items.push(preparedItem);
            }
        }

        context.inventory = Object.values(inventory);
        context.inventory.push({ label: 'DND5E.Contents', items: [], dataset: { type: 'all' } });

        context.inventory.forEach(section => {
            section.categories = [
                { activityPartial: 'dnd5e.activity-column-price' },
                { activityPartial: 'dnd5e.activity-column-weight' },
                { activityPartial: 'dnd5e.activity-column-quantity' },
                { activityPartial: 'dnd5e.activity-column-uses' }
            ];
        });
    }


    async _prepareItemContext(item, context) {
        const subtitle = [item.system.type?.label, item.isActive ? item.labels.activation : null].filterJoin(' &bull; ');

        let capacity = null;
        if (item.type === 'container') {
            try {
                capacity = await item.system.computeCapacity();
            } catch (error) {
                console.error('Error computing container capacity for', item.name, error);
            }
        }

        return {
            id: item.id,
            name: item.name,
            img: item.img,
            type: item.type,
            system: item.system,
            labels: {
                subtitle: subtitle,
                ...(item.labels || {})
            },
            hasUses: item.system.uses?.max > 0,
            isStack: item.system.quantity > 1,
            quantity: item.system.quantity,
            uses: {
                value: item.system.uses?.value ?? item.system.uses?.max ?? 0,
                max: item.system.uses?.max ?? 0
            },
            capacity,
            sort: item.sort || 0
        };
    }


    activateListeners(html) {
        super.activateListeners(html);

        html.find('[data-action="currency"]').prop('disabled', false);
        html.find('input[name^="system.currency"]').prop('disabled', false);


        html.on('click', '[data-action="currency"]', this._onManageCurrency.bind(this));

        const form = html[0];
        form.ondrop = this._onDrop.bind(this);
        form.ondragover = this._onDragOver.bind(this);
        form.ondragstart = this._onDragStart.bind(this);

        html.on('click', '[data-action]', this._onItemAction.bind(this));
        html.on('click', '[data-toggle-description]', this._onToggleDescription.bind(this));
        html.on('click', '[data-action="increase"]', this._onQuantityChange.bind(this));
        html.on('click', '[data-action="decrease"]', this._onQuantityChange.bind(this));
        html.on('click', '[data-context-menu]', this._onContextMenuClick.bind(this));

        new dnd5e.applications.ContextMenu5e(html[0], '.item', [], {
            onOpen: this._onOpenContextMenu.bind(this),
            jQuery: true
        });

        html.find('.create-child').on('click', this._onCreateChild.bind(this));
        if (this.document.isOwner) {
            html.find('.create-child').prop('disabled', false);
        }

        const placeholder = html.find('.item-list-controls-placeholder[data-for="inventory"]')[0];
        if (placeholder) {
            const searchControls = this.itemListControls.buildSearchControls();
            placeholder.replaceWith(searchControls);
            this.itemListControls.initializeSearchControls(searchControls);
        }

        if (!this.isEditable) {
            return;
        }

        html.on('change', '[data-field]', this._onChangeField.bind(this));
        html.on('click', '[data-action="editItem"]', this._onEditItem.bind(this));
        html.on('click', '[data-action="deleteItem"]', this._onDeleteItem.bind(this));
    }

    async _onChangeField(event) {
        const field = event.currentTarget.dataset.field;
        const value = event.currentTarget.value;

        const updates = {};
        foundry.utils.setProperty(updates, field, value);

        await this.document.update(updates);
    }


    _onDragStart(event) {
        if (event.target.matches('[data-item-id] > .item-row')) {
            return this._onDragItem(event);
        }

        return super._onDragStart?.(event);
    }

    _onDragItem(event) {
        const { itemId } = event.target.closest('[data-item-id]').dataset;
        const item = this.document.items.get(itemId);
        if (item) {
            event.dataTransfer.setData('text/plain', JSON.stringify(item.toDragData()));
        }
    }

    async _onDropItem(event, data) {
        const item = await Item.implementation.fromDropData(data);

        if (this.document.uuid === item.parent?.uuid) {
            return this._onSortItem(event, item.toObject());
        }

        return this._onDropItemCreate(item, event);
    }

    async _onDropItemCreate(itemData, event) {
        let items = itemData instanceof Array ? itemData : [itemData];

        const itemsForFiltering = items.map(item => {
            if (item instanceof foundry.abstract.Document) {
                return item.toObject();
            }
            return item;
        });

        const containers = new Set(itemsForFiltering.filter(i => i.type === 'container').map(i => i._id));
        const filteredItems = [];
        for (let i = 0; i < items.length; i++) {
            const itemData = itemsForFiltering[i];
            if (!containers.has(itemData.system.container)) {
                filteredItems.push(items[i]);
            }
        }

        const toCreate = await dnd5e.documents.Item5e.createWithContents(filteredItems, {
            transformFirst: item => {
                if (item instanceof foundry.abstract.Document) {
                    item = item.toObject();
                }
                return this._onDropSingleItem(item, event);
            }
        });

        return dnd5e.documents.Item5e.createDocuments(toCreate, { parent: this.document, keepId: true });
    }

    async _onDropSingleItem(itemData, event) {
        if (itemData.type === 'spell') {
            const scroll = await dnd5e.documents.Item5e.createScrollFromSpell(itemData);
            return scroll?.toObject?.() ?? false;
        }

        const result = this._onDropStackConsumables(itemData);
        if (result) {
            return false;
        }

        return itemData;
    }

    _onDropStackConsumables(itemData, { container = null } = {}) {
        const droppedSourceId = itemData._stats?.compendiumSource ?? itemData.flags.core?.sourceId;
        if (itemData.type !== 'consumable' || !droppedSourceId) {
            return null;
        }

        const similarItem = this.document.sourcedItems?.get(droppedSourceId)
            ?.filter(i => (i.system.container === container) && (i.name === itemData.name))?.first();
        if (!similarItem) {
            return null;
        }

        return similarItem.update({
            'system.quantity': similarItem.system.quantity + Math.max(itemData.system.quantity, 1)
        });
    }

    _onSortItem(event, itemData) {
        const source = this.document.items.get(itemData._id);
        if (!source) {
            return;
        }

        const dropTarget = event.target.closest('.item');
        if (!dropTarget) {
            return;
        }

        const targetId = dropTarget.dataset.itemId;
        const target = this.document.items.get(targetId);
        if (!target) {
            return;
        }

        const sortUpdates = SortingHelpers.performIntegerSort(source, {
            target,
            siblings: this.document.items.filter(i => i.id !== source.id)
        });

        const updateData = sortUpdates.map(update => ({
            _id: update.target.id,
            sort: update.update.sort
        }));

        return this.document.updateEmbeddedDocuments('Item', updateData);
    }

    async _onEditItem(event) {
        const itemId = event.currentTarget.closest('.item').dataset.itemId;
        const item = this.document.items.get(itemId);
        if (item) {
            item.sheet.render(true);
        }
    }

    async _onDeleteItem(event) {
        const itemId = event.currentTarget.closest('.item').dataset.itemId;
        const item = this.document.items.get(itemId);
        if (!item) {
            return;
        }

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: {title: game.i18n.localize('sosly.location.deleteItem.title')},
            content: game.i18n.format('sosly.location.deleteItem.content', {name: item.name}),
            modal: true
        });

        if (confirmed) {
            await item.delete();
        }
    }

    _onItemAction(event) {
        if (event.target.closest('select')) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        const itemId = event.currentTarget.closest('[data-item-id]')?.dataset.itemId;
        const action = event.currentTarget.dataset.action;
        const item = this.document.items.get(itemId);


        if (!item) {
            return;
        }

        switch (action) {
            case 'use':
                if (typeof item.displayCard === 'function') {
                    return item.displayCard();
                }
                if (typeof item.roll === 'function') {
                    return item.roll();
                }
                if (typeof item.use === 'function') {
                    return item.use();
                }
                return item.sheet.render(true);
            case 'edit':
            case 'editItem':
                return item.sheet.render(true);
            case 'view':
                return item.sheet.render(true);
            case 'delete':
            case 'deleteItem':
                return item.delete();
            default:
                return item.sheet.render(true);
        }
    }

    async _onQuantityChange(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const action = button.dataset.action;
        const input = button.parentElement.querySelector('input[data-name="system.quantity"]');
        const itemId = button.closest('.item').dataset.itemId;
        const item = this.document.items.get(itemId);

        if (!item || !input) {
            return;
        }

        let newValue = parseInt(input.value) || 0;
        if (action === 'increase') {
            newValue += 1;
        } else if (action === 'decrease') {
            newValue = Math.max(0, newValue - 1);
        }

        input.value = newValue;
        return item.update({ 'system.quantity': newValue });
    }

    _onContextMenuClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const itemElement = event.target.closest('[data-item-id]');
        if (itemElement) {
            setTimeout(() => {
                itemElement.dispatchEvent(new PointerEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    button: 2
                }));
            }, 10);
        }
    }

    _onOpenContextMenu(element) {
        const item = this.document.items.get(element.closest('[data-item-id]')?.dataset.itemId);
        if (!item) {
            return;
        }

        ui.context.menuItems = this._getContextOptions(item, element);
        Hooks.call('dnd5e.getItemContextOptions', item, ui.context.menuItems);
    }

    _getContextOptions(item, element) {
        const compendiumLocked = item.collection?.locked;

        const options = [
            {
                name: 'DND5E.ItemView',
                icon: '<i class="fas fa-eye"></i>',
                callback: li => this._onAction(li[0], 'view')
            },
            {
                name: 'DND5E.ContextMenuActionEdit',
                icon: "<i class='fas fa-edit fa-fw'></i>",
                condition: () => item.isOwner && !compendiumLocked,
                callback: li => this._onAction(li[0], 'edit')
            },
            {
                name: 'DND5E.ContextMenuActionDuplicate',
                icon: "<i class='fas fa-copy fa-fw'></i>",
                condition: () => item.canDuplicate && item.isOwner && !compendiumLocked,
                callback: li => this._onAction(li[0], 'duplicate')
            },
            {
                name: 'DND5E.ContextMenuActionDelete',
                icon: "<i class='fas fa-trash fa-fw'></i>",
                condition: () => item.canDelete && item.isOwner && !compendiumLocked,
                callback: li => this._onAction(li[0], 'delete')
            },
            {
                name: 'DND5E.DisplayCard',
                icon: '<i class="fas fa-message"></i>',
                callback: () => item.displayCard()
            },
            {
                name: this._expanded.has(item.id) ? 'DND5E.Collapse' : 'DND5E.Expand',
                icon: this._expanded.has(item.id) ? '<i class="fas fa-compress fa-fw"></i>' : '<i class="fas fa-expand fa-fw"></i>',
                callback: li => this._onAction(li[0], 'expand')
            }
        ];

        return options;
    }

    async _onAction(target, action, { event } = {}) {
        const { itemId } = target.closest('[data-item-id]')?.dataset ?? {};
        const item = this.document.items.get(itemId);
        if (!item) {
            return;
        }

        switch (action) {
            case 'delete':
                return item.deleteDialog();
            case 'duplicate':
                return item.clone({ name: game.i18n.format('DOCUMENT.CopyOf', { name: item.name }) }, { save: true });
            case 'edit':
                return item.sheet.render(true);
            case 'view':
                return item.sheet.render(true);
            case 'expand':
                return this._onExpand(target, item);
            default:
        }
    }

    async _onToggleDescription(event) {
        const button = event.currentTarget;
        const item = this.document.items.get(button.closest('.item').dataset.itemId);
        if (item) {
            return this._onExpand(button, item);
        }
    }

    async _onExpand(target, item) {
        const li = target.closest('[data-item-id]');
        const expandIcon = li.querySelector('[data-toggle-description] i');
        const wrapper = li.querySelector('.item-description .wrapper');

        if (this._expanded.has(item.id)) {
            const summary = wrapper?.querySelector('.item-summary');
            if (summary) {
                $(summary).slideUp(200, () => summary.remove());
            }
            li.classList.add('collapsed');
            this._expanded.delete(item.id);

            if (expandIcon) {
                expandIcon.classList.remove('fa-compress');
                expandIcon.classList.add('fa-expand');
            }
            return;
        }

        if (!wrapper) {
            return;
        }

        const chatData = await item.getChatData({ secrets: this.document.isOwner });
        const filteredProperties = chatData.properties?.filter(prop => {
            const propLower = prop.toLowerCase();
            return !propLower.includes('not equipped')
                       && !propLower.includes('not proficient')
                       && !propLower.includes('unequipped')
                       && !propLower.includes('undefined')
                       && prop.trim().length > 0;
        }) || [];

        if (!chatData.description && filteredProperties.length === 0) {
            return;
        }

        const propertiesHTML = filteredProperties.length > 0
            ? `<div class="item-properties pills">${filteredProperties.map(prop => `<span class="tag pill transparent pill-xs">${prop}</span>`).join('')}</div>` : '';

        const summaryHTML = `<div class="item-summary">
                                ${chatData.description || ''}
                            
                                ${propertiesHTML}
                            </div>`;
        const summary = $(summaryHTML);
        $(wrapper).append(summary.hide());
        summary.slideDown(200);
        li.classList.remove('collapsed');
        this._expanded.add(item.id);

        if (expandIcon) {
            expandIcon.classList.remove('fa-expand');
            expandIcon.classList.add('fa-compress');
        }
    }

    _onManageCurrency(event) {
        event.preventDefault();
        new dnd5e.applications.CurrencyManager({ document: this.document }).render({ force: true });
    }

    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);

        if (data.type === 'Item') {
            return this._onDropItem(event, data);
        }

        return super._onDrop(event);
    }

    _onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    _onCreateChild(event) {
        const activeTab = this._tabs?.[0]?.active ?? this.options.tabs[0].initial;

        if (activeTab === 'features') {
            return Item.implementation.createDialog({}, {
                parent: this.document,
                pack: this.document.pack,
                types: ['feat']
            });
        }

        if (activeTab === 'inventory') {
            const inventoryTypes = ['weapon', 'equipment', 'consumable', 'tool', 'container', 'loot'];
            return Item.implementation.createDialog({}, {
                parent: this.document,
                pack: this.document.pack,
                types: inventoryTypes
            });
        }

        return Item.implementation.createDialog({}, {
            parent: this.document,
            pack: this.document.pack
        });
    }

    async _renderOuter() {
        const html = await super._renderOuter();
        const htmlElement = html[0] || html;
        const header = htmlElement.querySelector('.window-header');

        if (!header) {
            return html;
        }

        if (this.document.isOwner) {
            const toggle = document.createElement('slide-toggle');
            toggle.checked = this._mode === this.constructor.MODES.EDIT;
            toggle.classList.add('mode-slider');
            toggle.dataset.tooltip = 'DND5E.SheetModeEdit';
            toggle.setAttribute('aria-label', game.i18n.localize('DND5E.SheetModeEdit'));
            toggle.addEventListener('change', this._onChangeSheetMode.bind(this));
            toggle.addEventListener('dblclick', event => event.stopPropagation());
            header.insertAdjacentElement('afterbegin', toggle);
        }

        const elements = document.createElement('div');
        elements.classList.add('header-elements');
        elements.innerHTML = `
            <div class="source-book">
                <a class="config-button" data-action="source" data-tooltip="DND5E.SOURCE.Action.Configure"
                   aria-label="${game.i18n.localize('DND5E.SOURCE.Action.Configure')}" hidden="">
                    <i class="fas fa-cog"></i>
                </a>
                <span></span>
            </div>
        `;
        htmlElement.querySelector('.window-title')?.insertAdjacentElement('afterend', elements);

        const warningsBtn = document.createElement('a');
        warningsBtn.classList.add('pseudo-header-button', 'preparation-warnings');
        warningsBtn.dataset.tooltip = 'Warnings';
        warningsBtn.setAttribute('aria-label', 'Warnings');
        warningsBtn.setAttribute('hidden', '');
        warningsBtn.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
        const firstButton = header.querySelector('.header-button');
        firstButton?.insertAdjacentElement('beforebegin', warningsBtn);

        const idLink = header.querySelector('.document-id-link');
        if (idLink) {
            firstButton?.insertAdjacentElement('beforebegin', idLink);
            idLink.classList.add('pseudo-header-button');
            idLink.dataset.tooltipDirection = 'DOWN';
        }
        header.querySelectorAll('.header-button').forEach(btn => {
            const label = btn.querySelector(':scope > i').nextSibling;
            if (label && label.textContent.trim()) {
                btn.dataset.tooltip = label.textContent.trim();
                btn.setAttribute('aria-label', label.textContent.trim());
                btn.addEventListener('dblclick', event => event.stopPropagation());
                label.remove();
            }
        });

        return html;
    }

    async _render(force, options) {
        await super._render(force, options);

        const nav = this.element[0].querySelector('.tabs');
        const windowHeader = this.element[0].querySelector('.window-header');
        if (nav && windowHeader) {
            nav.remove();
            this.element[0].insertBefore(nav, windowHeader);
        }
    }

    async _onChangeSheetMode(event) {
        const { MODES } = this.constructor;
        const toggle = event.currentTarget;
        this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
        await this.submit();
        this.render();
    }

    _onChangeTab(event, tabs, active) {
        super._onChangeTab(event, tabs, active);

        // Update the form class to match the active tab for styling
        const form = this.form;
        if (form) {
            form.className = form.className.replace(/\btab-\w+/g, '');
            form.classList.add(`tab-${active}`);
        }
    }
}
