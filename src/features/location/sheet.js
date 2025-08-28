import {ItemListControls} from '../../shared/item-list-controls.js';
import {LocationItemManager} from './managers/item-manager.js';
import {LocationDataManager} from './managers/data-manager.js';
import {LocationUIManager} from './managers/ui-manager.js';

export class LocationSheet extends ActorSheet {
    static MODES = {
        PLAY: 1,
        EDIT: 2
    };

    static TABS = [
        { tab: 'inventory', label: 'sosly.location.tabs.inventory', svg: 'backpack' }
    ];

    constructor(object, options) {
        super(object, options);
        this._mode = this.constructor.MODES.PLAY;
        this.itemListControls = new ItemListControls(this, 'inventory');
        this.managers = {
            items: new LocationItemManager(this),
            data: new LocationDataManager(this),
            ui: new LocationUIManager(this)
        };
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
        return await this.managers.data.getData();
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

        this.managers.items.activateListeners(html);

        const placeholder = html.find('.item-list-controls-placeholder[data-for="inventory"]')[0];
        if (placeholder) {
            const searchControls = this.itemListControls.buildSearchControls();
            placeholder.replaceWith(searchControls);
            this.itemListControls.initializeSearchControls(searchControls);
        }

        if (this._mode === this.constructor.MODES.PLAY) {
            html.find('.portrait').on('click', this._onShowPortrait.bind(this));
        }

        if (this.document.isOwner) {
            html.on('change', 'input[data-field^="system.currency"]', this._onChangeField.bind(this));
        }

        if (!this.isEditable) {
            return;
        }

        html.on('change', '[data-field]', this._onChangeField.bind(this));
    }

    async _onChangeField(event) {
        const field = event.currentTarget.dataset.field;
        const value = event.currentTarget.value;

        const updates = {};
        foundry.utils.setProperty(updates, field, value);

        await this.document.update(updates);
    }


    _onDragStart(event) {
        const result = this.managers.items.onDragStart(event);
        if (result !== null) {
            return result;
        }
        return super._onDragStart?.(event);
    }


    _onManageCurrency(event) {
        event.preventDefault();
        new dnd5e.applications.CurrencyManager({ document: this.document }).render({ force: true });
    }

    _onShowPortrait() {
        const img = this.document.img;
        if (game.release.generation < 13) {
            new ImagePopout(img, { title: this.document.name, uuid: this.document.uuid }).render(true);
        } else {
            new foundry.applications.apps.ImagePopout({
                src: img,
                uuid: this.document.uuid,
                window: { title: this.document.name }
            }).render({ force: true });
        }
    }

    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);

        if (data.type === 'Item') {
            return this.managers.items.onDropItem(event, data);
        }

        return super._onDrop(event);
    }

    _onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }


    async _renderOuter() {
        return await this.managers.ui.renderOuter();
    }

    async _render(force, options) {
        return await this.managers.ui.render(force, options);
    }

    async _onChangeSheetMode(event) {
        return await this.managers.ui.onChangeSheetMode(event);
    }

    _onChangeTab(event, tabs, active) {
        return this.managers.ui.onChangeTab(event, tabs, active);
    }
}
