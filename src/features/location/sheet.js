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
                {dragSelector: '[data-drag]', dropSelector: null}
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

        context.currencyLabels = {
            pp: game.i18n.localize('DND5E.CurrencyPP'),
            gp: game.i18n.localize('DND5E.CurrencyGP'),
            ep: game.i18n.localize('DND5E.CurrencyEP'),
            sp: game.i18n.localize('DND5E.CurrencySP'),
            cp: game.i18n.localize('DND5E.CurrencyCP')
        };

        // Ensure currency values default to 0
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
            // Location sheets only show actual feats, not equipped items
            if (item.type === 'feat') {
                items.push(this._prepareItemContext(item, context));
            }
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

        // Handle empty items collection and populate inventory
        if (this.document.items?.size > 0) {
            for (const item of this.document.items.values()) {
                // Show all items except feats and items in containers
                if (item.type !== 'feat' && !item.system?.container) {
                    const preparedItem = await this._prepareItemContext(item, context);
                    if (inventory[item.type]) {
                        inventory[item.type].items.push(preparedItem);
                    }
                }
            }
        }

        context.inventory = Object.values(inventory);
        context.inventory.push({ label: 'DND5E.Contents', items: [], dataset: { type: 'all' } });

        // Add categories for inventory sections
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
        // Generate subtitle using the same format as the NPC sheet
        const subtitle = [item.system.type?.label, item.isActive ? item.labels.activation : null].filterJoin(' &bull; ');

        // Compute capacity for containers
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
            capacity
        };
    }


    activateListeners(html) {
        super.activateListeners(html);

        // Currency should always be interactive - force enable
        html.find('[data-action="currency"]').prop('disabled', false);
        html.find('input[name^="system.currency"]').prop('disabled', false);

        // Currency manager should always be available
        html.on('click', '[data-action="currency"]', this._onManageCurrency.bind(this));


        // Enable drag and drop for the sheet
        const form = html[0];
        form.ondrop = this._onDrop.bind(this);
        form.ondragover = this._onDragOver.bind(this);
        form.ondragstart = this._onDragStart.bind(this);

        // Item interactions should work in both modes
        html.on('click', '[data-action]', this._onItemAction.bind(this));
        html.on('click', '[data-toggle-description]', this._onToggleDescription.bind(this));
        html.on('click', '[data-action="increase"]', this._onQuantityChange.bind(this));
        html.on('click', '[data-action="decrease"]', this._onQuantityChange.bind(this));
        html.on('click', '[data-context-menu]', this._onContextMenuClick.bind(this));

        // Set up context menu for items
        new dnd5e.applications.ContextMenu5e(html[0], '.item', [], {
            onOpen: this._onOpenContextMenu.bind(this),
            jQuery: true
        });

        // Create child button (works in both editable and non-editable modes)
        html.find('.create-child').on('click', this._onCreateChild.bind(this));
        // WORKAROUND: Force enable create button for owners
        // Template conditional appears to be overridden by D&D 5e system behavior
        if (this.document.isOwner) {
            html.find('.create-child').prop('disabled', false);
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
        // Handle item dragging
        if (event.target.matches('[data-item-id] > .item-row')) {
            return this._onDragItem(event);
        }

        // Fall back to default behavior
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
        // Items can be dropped in both play and edit modes
        const item = await Item.implementation.fromDropData(data);

        if (this.document.uuid === item.parent?.uuid) {
            return this._onSortItem(event, item.toObject());
        }

        return this._onDropItemCreate(item, event);
    }

    async _onDropItemCreate(itemData, event) {
        let items = itemData instanceof Array ? itemData : [itemData];

        // DON'T convert Documents to objects - createWithContents needs the Documents to access contents!
        // Only convert to filter properly
        const itemsForFiltering = items.map(item => {
            if (item instanceof foundry.abstract.Document) {
                return item.toObject();
            }
            return item;
        });

        // Filter out items already in containers to avoid creating duplicates
        const containers = new Set(itemsForFiltering.filter(i => i.type === 'container').map(i => i._id));
        const filteredItems = [];
        for (let i = 0; i < items.length; i++) {
            const itemData = itemsForFiltering[i];
            if (!containers.has(itemData.system.container)) {
                filteredItems.push(items[i]); // Keep the original Document
            }
        }

        // Use D&D 5e's createWithContents to properly handle container contents
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
        // Create a Consumable spell scroll on the Inventory tab
        if (itemData.type === 'spell') {
            const scroll = await dnd5e.documents.Item5e.createScrollFromSpell(itemData);
            return scroll?.toObject?.() ?? false;
        }

        // Stack identical consumables when possible
        const result = this._onDropStackConsumables(itemData);
        if (result) {
            return false; // Item was stacked, don't create new one
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
        // Handle item sorting within the sheet
        const source = this.document.items.get(itemData._id);
        if (!source) {
            return;
        }

        // Get the drop target
        const dropTarget = event.target.closest('.item');
        if (!dropTarget) {
            return;
        }

        const targetId = dropTarget.dataset.itemId;
        const target = this.document.items.get(targetId);
        if (!target) {
            return;
        }

        // Perform the sort
        const sortUpdates = SortingHelpers.performIntegerSort(source, {
            target,
            siblings: this.document.items.filter(i => i.id !== source.id)
        });

        return this.document.updateEmbeddedDocuments('Item', sortUpdates);
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
        console.log('_onItemAction called', event);
        if (event.target.closest('select')) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        const itemId = event.currentTarget.closest('[data-item-id]')?.dataset.itemId;
        const action = event.currentTarget.dataset.action;
        const item = this.document.items.get(itemId);

        console.log('Item action:', { itemId, action, item });
        console.log('Available item methods:', item ? Object.getOwnPropertyNames(item) : 'no item');

        if (!item) {
            console.warn('No item found for ID:', itemId);
            return;
        }

        switch (action) {
            case 'use':
                console.log('Trying to use item:', item.name);
                // Try different methods to display item to chat
                if (typeof item.displayCard === 'function') {
                    console.log('Using displayCard');
                    return item.displayCard();
                }
                if (typeof item.roll === 'function') {
                    console.log('Using roll');
                    return item.roll();
                }
                if (typeof item.use === 'function') {
                    console.log('Using use');
                    return item.use();
                }
                // Fallback to opening the sheet
                console.log('Fallback to sheet');
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

    _onManageCurrency(event) {
        event.preventDefault();
        new dnd5e.applications.CurrencyManager({ document: this.document }).render({ force: true });
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

    _onToggleDescription(event) {
        event.preventDefault();
        const target = event.currentTarget;
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        const item = this.document.items.get(itemId);

        if (!item) {
            return;
        }

        return this._onExpand(target, item);
    }

    _onContextMenuClick(event) {
        event.preventDefault();
        event.stopPropagation();

        // Trigger a right-click context menu event on the item
        const itemElement = event.target.closest('[data-item-id]');
        if (itemElement) {
            // Use a slight delay to ensure the click event is fully processed first
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

    async _onExpand(target, item) {
        const li = target.closest('[data-item-id]');
        const expandIcon = li.querySelector('[data-toggle-description] i');
        const wrapper = li.querySelector('.item-description .wrapper');

        if (this._expanded.has(item.id)) {
            // Remove the summary and collapse
            const summary = wrapper?.querySelector('.item-summary');
            if (summary) {
                $(summary).slideUp(200, () => summary.remove());
            }
            li.classList.add('collapsed');
            this._expanded.delete(item.id);

            // Update the expand button icon
            if (expandIcon) {
                expandIcon.classList.remove('fa-compress');
                expandIcon.classList.add('fa-expand');
            }
        } else if (wrapper) {
            // Use D&D 5e's built-in chat data which includes all the right properties
            const chatData = await item.getChatData({ secrets: this.document.isOwner });

            // Filter out negative status properties and malformed properties
            const filteredProperties = chatData.properties?.filter(prop => {
                const propLower = prop.toLowerCase();
                return !propLower.includes('not equipped')
                           && !propLower.includes('not proficient')
                           && !propLower.includes('unequipped')
                           && !propLower.includes('undefined')
                           && prop.trim().length > 0;
            }) || [];

            // Only expand if there's either a description or properties to show
            if (chatData.description || filteredProperties.length > 0) {
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

                // Update the expand button icon
                if (expandIcon) {
                    expandIcon.classList.remove('fa-expand');
                    expandIcon.classList.add('fa-compress');
                }
            }
        }
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

        // For inventory tab, allow all inventory item types
        if (activeTab === 'inventory') {
            const inventoryTypes = ['weapon', 'equipment', 'consumable', 'tool', 'container', 'loot'];
            return Item.implementation.createDialog({}, {
                parent: this.document,
                pack: this.document.pack,
                types: inventoryTypes
            });
        }

        // Default to general item creation
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
        const form = this.element[0].querySelector('form');
        if (form) {
            form.className = form.className.replace(/\btab-\w+/g, '');
            form.classList.add(`tab-${active}`);
        }
    }
}
