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

    activateListeners(element) {
        element.querySelectorAll('[data-context-menu]').forEach(el => {
            el.addEventListener('click', this.onContextMenuClick.bind(this));
        });

        new dnd5e.applications.ContextMenu5e(element, '.item', [], {
            onOpen: this.onOpenContextMenu.bind(this),
            jQuery: false
        });

        element.querySelectorAll('.create-child').forEach(btn => {
            if (this.document.isOwner) {
                btn.disabled = false;
            }
        });
    }

    onDragStart(event) {
        if (event.target.matches('[data-item-id] > .item-row')) {
            return this.onDragItem(event);
        }
        return null;
    }

    onDragItem(event) {
        const {itemId} = event.target.closest('[data-item-id]').dataset;
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

        let dropTarget = event.target.closest('[data-item-id]');

        if (!dropTarget) {
            const elementAtCursor = document.elementFromPoint(event.clientX, event.clientY);
            dropTarget = elementAtCursor?.closest('[data-item-id]');
        }
        const targetId = dropTarget?.dataset.itemId;
        const targetItem = targetId ? this.document.items.get(targetId) : null;
        let containerId = null;

        if (targetItem?.type === 'container' && targetItem.id !== item.id) {
            containerId = targetItem.id;
        }

        const parentContainers = await this.getParentContainers(containerId);
        if (containerId && (item.id === containerId || parentContainers.includes(item.id))) {
            ui.notifications.error('DND5E.ContainerRecursiveError', {localize: true});
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

        return dnd5e.documents.Item5e.createDocuments(toCreate, {parent: this.document, keepId: true});
    }

    async onDropSingleItem(itemData, event, containerId = null) {
        if (itemData.type === 'spell') {
            const scroll = await dnd5e.documents.Item5e.createScrollFromSpell(itemData);
            return scroll?.toObject?.() ?? false;
        }

        if (containerId) {
            itemData.system.container = containerId;
        }

        const result = await this.onDropStackConsumables(itemData, {container: containerId});
        if (result) {
            return false;
        }

        return itemData;
    }

    onDropStackConsumables(itemData, {container = null} = {}) {
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

        return [
            {
                name: 'DND5E.ItemView',
                icon: '<i class="fas fa-eye"></i>',
                callback: li => this.onAction(li[0] ?? li, 'view')
            },
            {
                name: 'DND5E.ContextMenuActionEdit',
                icon: "<i class='fas fa-edit fa-fw'></i>",
                condition: () => item.isOwner && !compendiumLocked,
                callback: li => this.onAction(li[0] ?? li, 'edit')
            },
            {
                name: 'DND5E.ContextMenuActionDuplicate',
                icon: "<i class='fas fa-copy fa-fw'></i>",
                condition: () => item.canDuplicate && item.isOwner && !compendiumLocked,
                callback: li => this.onAction(li[0] ?? li, 'duplicate')
            },
            {
                name: 'DND5E.ContextMenuActionDelete',
                icon: "<i class='fas fa-trash fa-fw'></i>",
                condition: () => item.canDelete && item.isOwner && !compendiumLocked,
                callback: li => this.onAction(li[0] ?? li, 'delete')
            },
            {
                name: 'DND5E.DisplayCard',
                icon: '<i class="fas fa-message"></i>',
                callback: () => item.displayCard()
            },
            {
                name: this._expanded.has(item.id) ? 'DND5E.Collapse' : 'DND5E.Expand',
                icon: this._expanded.has(item.id) ? '<i class="fas fa-compress fa-fw"></i>' : '<i class="fas fa-expand fa-fw"></i>',
                callback: li => this.onAction(li[0] ?? li, 'expand')
            }
        ];
    }

    async onAction(target, action) {
        const {itemId} = target.closest('[data-item-id]')?.dataset ?? {};
        const item = this.document.items.get(itemId);
        if (!item) {
            return;
        }

        switch (action) {
            case 'delete':
                return item.deleteDialog();
            case 'duplicate':
                return item.clone({name: game.i18n.format('DOCUMENT.CopyOf', {name: item.name})}, {save: true});
            case 'edit':
                return item.sheet.render(true);
            case 'view':
                return item.sheet.render(true);
            case 'expand':
                return this.onExpand(target, item);
            default:
        }
    }

    async onExpand(target, item) {
        const li = target.closest('[data-item-id]');
        const expandIcon = li.querySelector('[data-toggle-description] i, [data-action="toggleDescription"] i');
        const wrapper = li.querySelector('.item-description .wrapper');

        if (this._expanded.has(item.id)) {
            const summary = wrapper?.querySelector('.item-summary');
            if (summary) {
                summary.style.overflow = 'hidden';
                summary.style.height = summary.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    summary.style.transition = 'height 200ms ease-out';
                    summary.style.height = '0';
                    setTimeout(() => summary.remove(), 200);
                });
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

        const chatData = await item.getChatData({secrets: this.document.isOwner});
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
            ? `<div class="item-properties pills">${filteredProperties.map(prop => `<span class="tag pill transparent pill-xs">${prop}</span>`).join('')}</div>`
            : '';

        const summary = document.createElement('div');
        summary.className = 'item-summary';
        summary.innerHTML = `${chatData.description || ''}${propertiesHTML}`;
        summary.style.height = '0';
        summary.style.overflow = 'hidden';

        wrapper.appendChild(summary);

        requestAnimationFrame(() => {
            summary.style.transition = 'height 200ms ease-out';
            summary.style.height = summary.scrollHeight + 'px';
            setTimeout(() => {
                summary.style.height = '';
                summary.style.overflow = '';
                summary.style.transition = '';
            }, 200);
        });

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
}
