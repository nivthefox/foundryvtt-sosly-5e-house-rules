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
    }

    get isEditable() {
        return this.document.isOwner && (this._mode === this.constructor.MODES.EDIT);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['dnd5e2', 'sheet', 'actor', 'location', 'standard-form', 'vertical-tabs'],
            width: 720,
            height: 680,
            resizable: true,
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
        this._prepareItems(context);

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
            if (item.type === 'feat' || item.system.equipped) {
                items.push(this._prepareItemContext(item, context));
            }
        }

        return items.sort((a, b) => a.sort - b.sort);
    }

    _prepareItems(context) {
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
                if (item.type !== 'feat' && !item.system?.equipped) {
                    const preparedItem = this._prepareItemContext(item, context);
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


    _prepareItemContext(item, context) {
        // Generate subtitle based on item type
        let subtitle = '';
        if (item.type === 'weapon') {
            subtitle = `${game.i18n.localize('DND5E.ItemTypeWeapon')}`;
            if (item.system.weaponType) {
                subtitle += ` (${game.i18n.localize(CONFIG.DND5E.weaponTypes[item.system.weaponType])})`;
            }
        } else if (item.type === 'equipment') {
            subtitle = game.i18n.localize('DND5E.ItemTypeEquipment');
            if (item.system.type?.value) {
                subtitle += ` (${game.i18n.localize(CONFIG.DND5E.equipmentTypes[item.system.type.value])})`;
            }
        } else if (item.type === 'consumable') {
            subtitle = game.i18n.localize('DND5E.ItemTypeConsumable');
            if (item.system.type?.value) {
                subtitle += ` (${game.i18n.localize(CONFIG.DND5E.consumableTypes[item.system.type.value])})`;
            }
        } else if (item.type === 'tool') {
            subtitle = game.i18n.localize('DND5E.ItemTypeTool');
        } else if (item.type === 'loot') {
            subtitle = game.i18n.localize('DND5E.ItemTypeLoot');
        } else {
            subtitle = game.i18n.localize(`DND5E.ItemType${item.type.titleCase()}`);
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
            uses: item.system.uses
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

        // Item interactions should work in both modes
        html.on('click', '[data-action]', this._onItemAction.bind(this));
        html.on('click', '[data-toggle-description]', this._onToggleDescription.bind(this));
        html.on('click', '[data-action="increase"]', this._onQuantityChange.bind(this));
        html.on('click', '[data-action="decrease"]', this._onQuantityChange.bind(this));

        // Set up context menu for items
        new dnd5e.applications.ContextMenu5e(html[0], '.item', [], {
            onOpen: this._onOpenContextMenu.bind(this),
            jQuery: true
        });

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


    async _onDropItem(event, data) {
        // Items can be dropped in both play and edit modes
        const item = await Item.implementation.fromDropData(data);
        const itemData = item.toObject();

        if (this.document.uuid === item.parent?.uuid) {
            return this._onSortItem(event, itemData);
        }

        return this._onDropItemCreate(itemData);
    }

    async _onDropItemCreate(itemData) {
        const items = itemData instanceof Array ? itemData : [itemData];
        return this.document.createEmbeddedDocuments('Item', items);
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
        const item = event.currentTarget.closest('.item');
        const description = item.querySelector('.item-description');
        const icon = event.currentTarget.querySelector('i');

        if (description.style.display === 'none' || !description.style.display) {
            description.style.display = 'block';
            icon.classList.remove('fa-expand');
            icon.classList.add('fa-compress');

            // Load the item description if not already loaded
            const wrapper = description.querySelector('.wrapper');
            if (!wrapper.innerHTML.trim()) {
                const itemId = item.dataset.itemId;
                const itemDoc = this.document.items.get(itemId);
                if (itemDoc) {
                    wrapper.innerHTML = itemDoc.system.description?.value || '';
                }
            }
        } else {
            description.style.display = 'none';
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
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
            default:

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
