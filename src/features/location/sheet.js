export class LocationSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['dnd5e', 'sheet', 'actor', 'location'],
            width: 720,
            height: 680,
            resizable: true,
            tabs: [
                {
                    navSelector: '.tabs',
                    contentSelector: '.sheet-body',
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

        context.tabs = [
            {id: 'inventory', label: game.i18n.localize('SOSLY.location.tabs.inventory')},
            {id: 'features', label: game.i18n.localize('SOSLY.location.tabs.features')},
            {id: 'details', label: game.i18n.localize('SOSLY.location.tabs.details')}
        ];

        context.inventory = this._prepareItems(context, 'inventory');
        context.features = this._prepareItems(context, 'features');

        context.currencyLabels = {
            pp: game.i18n.localize('DND5E.CurrencyPP'),
            gp: game.i18n.localize('DND5E.CurrencyGP'),
            ep: game.i18n.localize('DND5E.CurrencyEP'),
            sp: game.i18n.localize('DND5E.CurrencySP'),
            cp: game.i18n.localize('DND5E.CurrencyCP')
        };

        context.sizeChoices = Object.entries(system.schema.fields.details.fields.size.choices)
            .map(([key, label]) => ({
                value: key,
                label: game.i18n.localize(label),
                selected: system.details.size === key
            }));

        context.typeChoices = Object.entries(system.schema.fields.details.fields.type.choices)
            .map(([key, label]) => ({
                value: key,
                label: game.i18n.localize(label),
                selected: system.details.type === key
            }));

        context.enrichedDescription = await TextEditor.enrichHTML(system.details.description, {
            secrets: this.document.isOwner,
            documents: true,
            links: true,
            rolls: true,
            rollData: context.rollData,
            async: true
        });

        return context;
    }

    _prepareItems(context, category) {
        const items = [];

        for (const item of this.document.items.values()) {
            if (category === 'inventory' && !item.system.equipped && item.type !== 'feat') {
                items.push(this._prepareItemContext(item, context));
            } else if (category === 'features' && (item.type === 'feat' || item.system.equipped)) {
                items.push(this._prepareItemContext(item, context));
            }
        }

        return items.sort((a, b) => a.sort - b.sort);
    }

    _prepareItemContext(item, context) {
        return {
            id: item.id,
            name: item.name,
            img: item.img,
            type: item.type,
            system: item.system,
            labels: item.labels || {},
            hasUses: item.system.uses?.max > 0,
            isStack: item.system.quantity > 1,
            quantity: item.system.quantity,
            uses: item.system.uses
        };
    }


    activateListeners(html) {
        super.activateListeners(html);

        if (!this.isEditable) {
            return;
        }

        html.on('change', '[data-field]', this._onChangeField.bind(this));
        html.on('click', '[data-action="editItem"]', this._onEditItem.bind(this));
        html.on('click', '[data-action="deleteItem"]', this._onDeleteItem.bind(this));
        html.on('click', '[data-action="rollItem"]', this._onRollItem.bind(this));
    }

    async _onChangeField(event) {
        const field = event.currentTarget.dataset.field;
        const value = event.currentTarget.value;

        const updates = {};
        foundry.utils.setProperty(updates, field, value);

        await this.document.update(updates);
    }


    async _onDropItem(event, data) {
        if (!this.isEditable) {
            return false;
        }

        const item = await Item.implementation.fromDropData(data);
        const itemData = item.toObject();

        if (this.document.uuid === item.parent?.uuid) {
            return this._onSortItem(event, itemData);
        }

        return this._onDropItemCreate(itemData);
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
            window: {title: game.i18n.localize('SOSLY.location.deleteItem.title')},
            content: game.i18n.format('SOSLY.location.deleteItem.content', {name: item.name}),
            modal: true
        });

        if (confirmed) {
            await item.delete();
        }
    }

    async _onRollItem(event) {
        const itemId = event.currentTarget.closest('.item').dataset.itemId;
        const item = this.document.items.get(itemId);
        if (item) {
            await item.roll();
        }
    }

    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);

        if (data.type === 'Item') {
            return this._onDropItem(event, data);
        }

        return super._onDrop(event);
    }
}
