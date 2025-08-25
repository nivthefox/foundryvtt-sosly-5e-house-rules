export class LocationSheet extends ActorSheet {
    static MODES = {
        PLAY: 1,
        EDIT: 2
    };

    static TABS = [
        { tab: "inventory", label: "sosly.location.tabs.inventory", svg: "backpack" },
        { tab: "features", label: "sosly.location.tabs.features", icon: "fas fa-list" },
        { tab: "details", label: "sosly.location.tabs.details", icon: "fas fa-feather" }
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

        context.inventory = this._prepareItems(context, 'inventory');
        context.features = this._prepareItems(context, 'features');

        context.currencyLabels = {
            pp: game.i18n.localize('DND5E.CurrencyPP'),
            gp: game.i18n.localize('DND5E.CurrencyGP'),
            ep: game.i18n.localize('DND5E.CurrencyEP'),
            sp: game.i18n.localize('DND5E.CurrencySP'),
            cp: game.i18n.localize('DND5E.CurrencyCP')
        };

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
            window: {title: game.i18n.localize('sosly.location.deleteItem.title')},
            content: game.i18n.format('sosly.location.deleteItem.content', {name: item.name}),
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

    async _renderOuter() {
        const html = await super._renderOuter();
        const htmlElement = html[0] || html;
        const header = htmlElement.querySelector('.window-header');
        
        if (!header) {
            return html;
        }
        
        if (this.document.isOwner) {
            const toggle = document.createElement("slide-toggle");
            toggle.checked = this._mode === this.constructor.MODES.EDIT;
            toggle.classList.add("mode-slider");
            toggle.dataset.tooltip = "DND5E.SheetModeEdit";
            toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
            toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
            toggle.addEventListener("dblclick", event => event.stopPropagation());
            header.insertAdjacentElement("afterbegin", toggle);
        }

        const elements = document.createElement("div");
        elements.classList.add("header-elements");
        elements.innerHTML = `
            <div class="source-book">
                <a class="config-button" data-action="source" data-tooltip="DND5E.SOURCE.Action.Configure"
                   aria-label="${game.i18n.localize("DND5E.SOURCE.Action.Configure")}" hidden="">
                    <i class="fas fa-cog"></i>
                </a>
                <span></span>
            </div>
        `;
        htmlElement.querySelector(".window-title")?.insertAdjacentElement("afterend", elements);

        const warningsBtn = document.createElement("a");
        warningsBtn.classList.add("pseudo-header-button", "preparation-warnings");
        warningsBtn.dataset.tooltip = "Warnings";
        warningsBtn.setAttribute("aria-label", "Warnings");
        warningsBtn.setAttribute("hidden", "");
        warningsBtn.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
        const firstButton = header.querySelector(".header-button");
        firstButton?.insertAdjacentElement("beforebegin", warningsBtn);

        const idLink = header.querySelector(".document-id-link");
        if (idLink) {
            firstButton?.insertAdjacentElement("beforebegin", idLink);
            idLink.classList.add("pseudo-header-button");
            idLink.dataset.tooltipDirection = "DOWN";
        }
        header.querySelectorAll(".header-button").forEach(btn => {
            const label = btn.querySelector(":scope > i").nextSibling;
            if (label && label.textContent.trim()) {
                btn.dataset.tooltip = label.textContent.trim();
                btn.setAttribute("aria-label", label.textContent.trim());
                btn.addEventListener("dblclick", event => event.stopPropagation());
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
