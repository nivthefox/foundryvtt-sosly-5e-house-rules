import {LocationItemManager} from './managers/item-manager';
import {LocationDataManager} from './managers/data-manager';
import {LocationUIManager} from './managers/ui-manager';

const {HandlebarsApplicationMixin} = foundry.applications.api;
const {ActorSheetV2} = foundry.applications.sheets;

export class LocationSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    static MODES = {
        PLAY: 1,
        EDIT: 2
    };

    static DEFAULT_OPTIONS = {
        classes: ['dnd5e2', 'sheet', 'actor', 'location', 'vertical-tabs'],
        position: {
            width: 720,
            height: 680
        },
        window: {
            resizable: true,
            contentClasses: ['standard-form']
        },
        form: {
            submitOnChange: true
        },
        elements: {
            inventory: '.inventory-element'
        },
        actions: {
            currency: LocationSheet.#onManageCurrency,
            showPortrait: LocationSheet.#onShowPortrait,
            editItem: LocationSheet.#onEditItem,
            deleteItem: LocationSheet.#onDeleteItem,
            use: LocationSheet.#onUseItem,
            increase: LocationSheet.#onQuantityIncrease,
            decrease: LocationSheet.#onQuantityDecrease,
            toggleDescription: LocationSheet.#onToggleDescription,
            createChild: LocationSheet.#onCreateChild
        }
    };

    static PARTS = {
        sheet: {
            template: 'modules/sosly-5e-house-rules/templates/features/location/location-sheet.hbs',
            root: true,
            scrollable: ['.sheet-body']
        }
    };

    static TABS = {
        primary: {
            tabs: [
                {id: 'inventory', icon: 'fa-solid fa-backpack', label: 'sosly.location.tabs.inventory'}
            ],
            initial: 'inventory'
        }
    };

    constructor(options = {}) {
        super(options);
        this._mode = this.constructor.MODES.PLAY;
        this._filters = {};
        this.managers = {
            items: new LocationItemManager(this),
            data: new LocationDataManager(this),
            ui: new LocationUIManager(this)
        };
    }

    get isEditable() {
        return this.document.isOwner;
    }

    get isEditMode() {
        return this._mode === this.constructor.MODES.EDIT;
    }

    _filterChildren(collection, properties) {
        if (collection !== 'items') {
            return [];
        }
        let items = Array.from(this.document.items);
        for (const property of properties) {
            if (property === 'action') {
                items = items.filter(i => i.system.activation?.type === 'action');
            } else if (property === 'bonus') {
                items = items.filter(i => i.system.activation?.type === 'bonus');
            } else if (property === 'reaction') {
                items = items.filter(i => i.system.activation?.type === 'reaction');
            }
        }
        return items;
    }

    _sortChildren(collection, sort) {
        if (collection !== 'items') {
            return [];
        }
        const items = Array.from(this.document.items);
        if (sort === 'a') {
            return items.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
        }
        return items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return await this.managers.data.prepareContext(context);
    }

    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        this.managers.ui.onFirstRender(this.element);
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const element = this.element;

        element.querySelectorAll('[data-action="currency"]').forEach(el => el.disabled = false);
        element.querySelectorAll('input[name^="system.currency"]').forEach(el => el.disabled = false);

        this.managers.items.activateListeners(element);
        this.managers.ui.onRender(element);

        if (this._mode === this.constructor.MODES.PLAY) {
            element.querySelectorAll('.portrait').forEach(el => {
                el.addEventListener('click', this.#onShowPortraitClick.bind(this));
            });
        }

        if (this.document.isOwner) {
            element.querySelectorAll('input[data-field^="system.currency"]').forEach(el => {
                el.addEventListener('change', this.#onChangeField.bind(this));
            });
        }

        if (this.isEditable) {
            element.querySelectorAll('[data-field]').forEach(el => {
                el.addEventListener('change', this.#onChangeField.bind(this));
            });
        }
    }

    #onChangeField(event) {
        const field = event.currentTarget.dataset.field;
        const value = event.currentTarget.value;

        const updates = {};
        foundry.utils.setProperty(updates, field, value);
        this.document.update(updates);
    }

    #onShowPortraitClick() {
        const img = this.document.img;
        new foundry.applications.apps.ImagePopout({
            src: img,
            uuid: this.document.uuid,
            window: {title: this.document.name}
        }).render({force: true});
    }

    _canDragStart(selector) {
        return this.document.isOwner;
    }

    _canDragDrop(selector) {
        return this.document.isOwner;
    }

    async _onDragStart(event) {
        return super._onDragStart(event);
    }

    _onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    async _onDropItem(event, item) {
        return this.managers.items.onDropItem(event, item.toDragData());
    }

    async onChangeSheetMode(event) {
        return await this.managers.ui.onChangeSheetMode(event);
    }

    static #onManageCurrency(event, target) {
        event.preventDefault();
        new dnd5e.applications.CurrencyManager({document: this.document}).render({force: true});
    }

    static #onShowPortrait(event, target) {
        const img = this.document.img;
        new foundry.applications.apps.ImagePopout({
            src: img,
            uuid: this.document.uuid,
            window: {title: this.document.name}
        }).render({force: true});
    }

    static #onEditItem(event, target) {
        event.stopImmediatePropagation();
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        const item = this.document.items.get(itemId);
        if (item) {
            item.sheet.render(true);
        }
    }

    static async #onDeleteItem(event, target) {
        event.stopImmediatePropagation();
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
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

    static #onUseItem(event, target) {
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        const item = this.document.items.get(itemId);
        if (!item) {
            return;
        }

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
    }

    static async #onQuantityIncrease(event, target) {
        event.preventDefault();
        const input = target.parentElement.querySelector('input[data-name="system.quantity"]');
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        const item = this.document.items.get(itemId);

        if (!item || !input) {
            return;
        }

        const newValue = (parseInt(input.value) || 0) + 1;
        input.value = newValue;
        return item.update({'system.quantity': newValue});
    }

    static async #onQuantityDecrease(event, target) {
        event.preventDefault();
        const input = target.parentElement.querySelector('input[data-name="system.quantity"]');
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        const item = this.document.items.get(itemId);

        if (!item || !input) {
            return;
        }

        const newValue = Math.max(0, (parseInt(input.value) || 0) - 1);
        input.value = newValue;
        return item.update({'system.quantity': newValue});
    }

    static #onToggleDescription(event, target) {
        const item = this.document.items.get(target.closest('[data-item-id]')?.dataset.itemId);
        if (item) {
            return this.managers.items.onExpand(target, item);
        }
    }

    static #onCreateChild(event, target) {
        const inventoryTypes = ['weapon', 'equipment', 'consumable', 'tool', 'container', 'loot'];
        return Item.implementation.createDialog({}, {
            parent: this.document,
            pack: this.document.pack,
            types: inventoryTypes
        });
    }
}
