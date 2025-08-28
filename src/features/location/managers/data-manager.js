export class LocationDataManager {
    constructor(sheet) {
        this.sheet = sheet;
    }

    get document() {
        return this.sheet.document;
    }

    async getData() {
        const context = await ActorSheet.prototype.getData.call(this.sheet);
        const source = this.document.toObject();
        const system = this.document.system;

        context.system = system;
        context.source = source.system;
        context.editable = this.sheet.isEditable;
        context.owner = this.document.isOwner;

        context.features = this.prepareFeatures(context);
        await this.prepareItems(context);

        context.filters = this.sheet.itemListControls._filters;

        this.prepareCurrencyLabels(context);
        this.prepareTypeChoices(context);
        await this.prepareDescription(context);

        return context;
    }

    prepareFeatures(context) {
        const items = [];

        for (const item of this.document.items.values()) {
            if (item.type !== 'feat') {
                continue;
            }
            items.push(this.prepareItemContext(item, context));
        }

        return items.sort((a, b) => a.sort - b.sort);
    }

    async prepareItems(context) {
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
            const preparedItem = await this.prepareItemContext(item, context);
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

    async prepareItemContext(item, context) {
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

    prepareCurrencyLabels(context) {
        context.currencyLabels = {};

        for (const denomination of Object.keys(CONFIG.DND5E.currencies)) {
            const config = CONFIG.DND5E.currencies[denomination];
            context.currencyLabels[denomination] = game.i18n.localize(config.label);
        }

        if (!context.system.currency) {
            context.system.currency = {};
        }
        for (const denomination of Object.keys(CONFIG.DND5E.currencies)) {
            if (context.system.currency[denomination] === undefined) {
                context.system.currency[denomination] = 0;
            }
        }
    }

    prepareTypeChoices(context) {
        const system = this.document.system;
        const typeChoices = system.schema.fields.details.fields.type.choices;

        context.locationTypeChoices = Object.entries(typeChoices).reduce((choices, [key, label]) => {
            choices[key] = game.i18n.localize(label);
            return choices;
        }, {});

        context.locationTypeLabel = system.details.type
            ? game.i18n.localize(typeChoices[system.details.type])
            : '';
    }

    async prepareDescription(context) {
        const system = this.document.system;
        const description = system.details.description || '<p/>';
        context.enrichedDescription = await TextEditor.enrichHTML(description, {
            secrets: this.document.isOwner,
            documents: true,
            links: true,
            rolls: true,
            rollData: context.rollData,
            async: true
        });
    }
}
