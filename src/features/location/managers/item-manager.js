export class LocationItemManager {
    constructor(sheet) {
        this.sheet = sheet;
        this._expanded = new Set();
    }

    get document() {
        return this.sheet.document;
    }

    get element() {
        return this.sheet.element;
    }

    get isEditable() {
        return this.sheet.isEditable;
    }

    activateListeners(html) {
        html.on('click', '[data-toggle-description]', this.onToggleDescription.bind(this));
        html.on('click', '[data-action="increase"]', this.onQuantityChange.bind(this));
        html.on('click', '[data-action="decrease"]', this.onQuantityChange.bind(this));
        html.on('click', '[data-context-menu]', this.onContextMenuClick.bind(this));

        html.on('click', '[data-action="editItem"]', event => {
            event.stopImmediatePropagation();
            this.onEditItem(event);
        });
        html.on('click', '[data-action="deleteItem"]', event => {
            event.stopImmediatePropagation();
            this.onDeleteItem(event);
        });

        html.on('click', '[data-action]', this.onItemAction.bind(this));

        new dnd5e.applications.ContextMenu5e(html[0], '.item', [], {
            onOpen: this.onOpenContextMenu.bind(this),
            jQuery: true
        });

        html.find('.create-child').on('click', this.onCreateChild.bind(this));
        if (this.document.isOwner) {
            html.find('.create-child').prop('disabled', false);
        }
    }

    onDragStart(event) {
        if (event.target.matches('[data-item-id] > .item-row')) {
            return this.onDragItem(event);
        }
        return null;
    }

    onDragItem(event) {
        const { itemId } = event.target.closest('[data-item-id]').dataset;
        const item = this.document.items.get(itemId);
        if (item) {
            event.dataTransfer.setData('text/plain', JSON.stringify(item.toDragData()));
        }
    }

    async onDropItem(event, data) {
        const item = await Item.implementation.fromDropData(data);
        if (!item) {
            return false;
        }

        const dropTarget = event.target.closest('[data-item-id]');
        const targetId = dropTarget?.dataset.itemId;
        const targetItem = targetId ? this.document.items.get(targetId) : null;
        let containerId = null;

        if (targetItem?.type === 'container' && targetItem.id !== item.id) {
            containerId = targetItem.id;
        }

        const parentContainers = await this.getParentContainers(containerId);
        if (containerId && (item.id === containerId || parentContainers.includes(item.id))) {
            ui.notifications.error('DND5E.ContainerRecursiveError', { localize: true });
            return false;
        }

        if (item.parent?.id !== this.document.id) {
            return this.onDropItemCreate(item, event, containerId);
        }

        if (item.system.container !== containerId) {
            return item.update({'system.container': containerId});
        }

        if (!containerId && dropTarget) {
            return this.onSortItem(event, item.toObject());
        }

        return false;
    }

    async onDropItemCreate(itemData, event, containerId = null) {
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
                return this.onDropSingleItem(item, event, containerId);
            }
        });

        return dnd5e.documents.Item5e.createDocuments(toCreate, { parent: this.document, keepId: true });
    }

    async onDropSingleItem(itemData, event, containerId = null) {
        if (itemData.type === 'spell') {
            const scroll = await dnd5e.documents.Item5e.createScrollFromSpell(itemData);
            return scroll?.toObject?.() ?? false;
        }

        if (containerId) {
            itemData.system.container = containerId;
        }

        const result = await this.onDropStackConsumables(itemData, { container: containerId });
        if (result) {
            return false;
        }

        return itemData;
    }

    onDropStackConsumables(itemData, { container = null } = {}) {
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

    onSortItem(event, itemData) {
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

    async onEditItem(event) {
        const itemId = event.currentTarget.closest('.item').dataset.itemId;
        const item = this.document.items.get(itemId);
        if (item) {
            item.sheet.render(true);
        }
    }

    async onDeleteItem(event) {
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

    onItemAction(event) {
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
                return item.sheet.render(true);
            case 'view':
                return item.sheet.render(true);
            case 'delete':
                return item.delete();
            default:
                return item.sheet.render(true);
        }
    }

    async onQuantityChange(event) {
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

    onContextMenuClick(event) {
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

    onOpenContextMenu(element) {
        const item = this.document.items.get(element.closest('[data-item-id]')?.dataset.itemId);
        if (!item) {
            return;
        }

        ui.context.menuItems = this.getContextOptions(item, element);
        Hooks.call('dnd5e.getItemContextOptions', item, ui.context.menuItems);
    }

    getContextOptions(item, element) {
        const compendiumLocked = item.collection?.locked;

        const options = [
            {
                name: 'DND5E.ItemView',
                icon: '<i class="fas fa-eye"></i>',
                callback: li => this.onAction(li[0], 'view')
            },
            {
                name: 'DND5E.ContextMenuActionEdit',
                icon: "<i class='fas fa-edit fa-fw'></i>",
                condition: () => item.isOwner && !compendiumLocked,
                callback: li => this.onAction(li[0], 'edit')
            },
            {
                name: 'DND5E.ContextMenuActionDuplicate',
                icon: "<i class='fas fa-copy fa-fw'></i>",
                condition: () => item.canDuplicate && item.isOwner && !compendiumLocked,
                callback: li => this.onAction(li[0], 'duplicate')
            },
            {
                name: 'DND5E.ContextMenuActionDelete',
                icon: "<i class='fas fa-trash fa-fw'></i>",
                condition: () => item.canDelete && item.isOwner && !compendiumLocked,
                callback: li => this.onAction(li[0], 'delete')
            },
            {
                name: 'DND5E.DisplayCard',
                icon: '<i class="fas fa-message"></i>',
                callback: () => item.displayCard()
            },
            {
                name: this._expanded.has(item.id) ? 'DND5E.Collapse' : 'DND5E.Expand',
                icon: this._expanded.has(item.id) ? '<i class="fas fa-compress fa-fw"></i>' : '<i class="fas fa-expand fa-fw"></i>',
                callback: li => this.onAction(li[0], 'expand')
            }
        ];

        return options;
    }

    async onAction(target, action, { event } = {}) {
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
                return this.onExpand(target, item);
            default:
        }
    }

    async onToggleDescription(event) {
        const button = event.currentTarget;
        const item = this.document.items.get(button.closest('.item').dataset.itemId);
        if (item) {
            return this.onExpand(button, item);
        }
    }

    async onExpand(target, item) {
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

    async getParentContainers(containerId) {
        if (!containerId) {
            return [];
        }

        const containers = [];
        let currentId = containerId;

        while (currentId) {
            const container = this.document.items.get(currentId);
            if (!container) {
                break;
            }
            containers.push(currentId);
            currentId = container.system.container;

            if (containers.includes(currentId)) {
                break;
            }
        }

        return containers;
    }

    onCreateChild(event) {
        const activeTab = this.sheet._tabs?.[0]?.active ?? this.sheet.options.tabs[0].initial;

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
}
