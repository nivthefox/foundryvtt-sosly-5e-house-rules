export class ItemListControls {
    constructor(sheet, target = 'inventory') {
        this.sheet = sheet;
        this.target = target;

        this._filters = {
            [target]: { name: '', properties: new Set() }
        };

        this._sortModes = {
            m: {
                icon: 'fa-arrow-down-short-wide',
                label: 'SIDEBAR.SortModeManual',
                comparator: (a, b) => a.sort - b.sort
            },
            a: {
                icon: 'fa-arrow-down-a-z',
                label: 'SIDEBAR.SortModeAlpha',
                comparator: (a, b) => a.name.localeCompare(b.name, game.i18n.lang)
            }
        };
    }

    get sortMode() {
        const flag = `sheetPrefs.location.tabs.${this.target}.sort`;
        return game.user.getFlag('dnd5e', flag) || 'm';
    }

    buildSearchControls() {
        const search = document.createElement('search');
        search.setAttribute('aria-label', 'Search inventory');
        search.setAttribute('data-for', this.target);
        search.innerHTML = `
            <input type="text" class="interface-only" placeholder="Search inventory">
            <ul class="unlist controls">
                <li>
                    <button type="button" class="unbutton filter-control interface-only" data-action="clear"
                            data-tooltip="DND5E.FilterClear" aria-label="${game.i18n.localize('DND5E.FilterClear')}">
                        <i class="fas fa-xmark"></i>
                    </button>
                </li>
                <li class="dropdown">
                    <button type="button" class="unbutton filter-control filter interface-only" data-action="filter"
                            aria-label="${game.i18n.localize('DND5E.Filter')}">
                        <i class="fas fa-filter"></i>
                    </button>
                    <ul class="filter-list unlist">
                        <li>
                            <button type="button" class="filter-item interface-only" data-filter="action">
                                ${game.i18n.localize('DND5E.Action')}
                            </button>
                        </li>
                        <li>
                            <button type="button" class="filter-item interface-only" data-filter="bonus">
                                ${game.i18n.localize('DND5E.BonusAction')}
                            </button>
                        </li>
                        <li>
                            <button type="button" class="filter-item interface-only" data-filter="reaction">
                                ${game.i18n.localize('DND5E.Reaction')}
                            </button>
                        </li>
                        <li>
                            <button type="button" class="filter-item interface-only" data-filter="magical">
                                Magical
                            </button>
                        </li>
                    </ul>
                </li>
                <li>
                    <button type="button" class="unbutton filter-control active interface-only" data-action="sort"
                            data-tooltip="SIDEBAR.SortModeManual" aria-label="${game.i18n.localize('SIDEBAR.SortModeManual')}">
                        <i class="fas fa-arrow-down-short-wide"></i>
                    </button>
                </li>
                <li>
                    <button type="button" class="unbutton filter-control active interface-only" data-action="group"
                            data-tooltip="DND5E.GroupToggle" aria-label="${game.i18n.localize('DND5E.GroupToggle')}">
                        <i class="fas fa-layer-group"></i>
                    </button>
                </li>
            </ul>
        `;

        return search;
    }

    initializeSearchControls(searchElement) {
        if (!searchElement) {
            return;
        }

        const { properties, name } = this._filters[this.target];
        const inputElement = searchElement.querySelector('input[type="text"]');
        const filterItems = searchElement.querySelectorAll('.filter-item');
        const controls = {};
        searchElement.querySelectorAll('.filter-control').forEach(el => controls[el.dataset.action] = el);

        inputElement.value = name;
        for (const item of filterItems) {
            item.classList.toggle('active', properties.has(item.dataset.filter));
            item.addEventListener('click', this._onToggleFilterItem.bind(this));
        }

        const debouncedFilter = foundry.utils.debounce(this._onFilterName.bind(this), 200);
        inputElement.addEventListener('input', debouncedFilter);
        controls.clear?.addEventListener('click', this._onClearFilters.bind(this));
        controls.sort?.addEventListener('click', this._onToggleSort.bind(this));
        controls.group?.addEventListener('click', this._onToggleGroup.bind(this));

        this._initSorting();
        this._initGrouping();
        this._applySorting();
        this._applyGrouping();
    }

    _onToggleFilterItem(event) {
        const target = event.currentTarget;
        const { properties } = this._filters[this.target];
        const filter = target.dataset.filter;

        if (properties.has(filter)) {
            properties.delete(filter);
        } else {
            properties.add(filter);
        }

        target.classList.toggle('active', properties.has(filter));
        this._applyFilters();
    }

    _onFilterName(event) {
        const value = event.target.value;
        this._filters[this.target].name = value;
        this._applyFilters();
    }

    _onClearFilters() {
        const searchElement = this.sheet.element[0].querySelector(`[data-for="${this.target}"]`);
        if (!searchElement) {
            return;
        }

        const inputElement = searchElement.querySelector('input[type="text"]');
        inputElement.value = '';
        this._filters[this.target].name = '';
        this._filters[this.target].properties.clear();
        searchElement.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
        this._applyFilters();
    }

    async _onToggleSort() {
        const flag = `sheetPrefs.location.tabs.${this.target}.sort`;
        const currentMode = this.sortMode;
        const newMode = currentMode === 'm' ? 'a' : 'm';

        await game.user.setFlag('dnd5e', flag, newMode);

        const searchElement = this.sheet.element[0]?.querySelector(`[data-for="${this.target}"]`);
        const sortControl = searchElement?.querySelector('[data-action="sort"]');
        const iconElement = sortControl?.querySelector('i');

        if (iconElement) {
            const { icon, label } = this._sortModes[newMode];
            iconElement.className = `fas ${icon}`;
            sortControl.dataset.tooltip = label;
            sortControl.setAttribute('aria-label', game.i18n.localize(label));
        }

        this._applySorting();
    }

    async _onToggleGroup() {
        const flag = `sheetPrefs.location.tabs.${this.target}.group`;
        const currentValue = game.user.getFlag('dnd5e', flag);
        const newValue = currentValue === false;

        await game.user.setFlag('dnd5e', flag, newValue);

        this._initGrouping();
        this._applyGrouping();
    }

    _initSorting() {
        const searchElement = this.sheet.element[0]?.querySelector(`[data-for="${this.target}"]`);
        if (!searchElement) {
            return;
        }

        const sortControl = searchElement.querySelector('[data-action="sort"]');
        if (!sortControl) {
            return;
        }

        const { icon, label } = this._sortModes[this.sortMode];
        const iconElement = sortControl.querySelector('i');
        if (iconElement) {
            iconElement.className = `fas ${icon}`;
        }

        sortControl.dataset.tooltip = label;
        sortControl.setAttribute('aria-label', game.i18n.localize(label));
    }

    _applySorting() {
        const inventoryList = this.sheet.element[0]?.querySelector(`[data-item-list="${this.target}"]`);
        if (!inventoryList) {
            return;
        }

        const sections = inventoryList.querySelectorAll('.items-section .item-list');
        const { comparator } = this._sortModes[this.sortMode];

        sections.forEach(section => {
            const items = [];
            const itemElements = section.querySelectorAll('.item');

            itemElements.forEach(element => {
                const itemId = element.dataset.itemId;
                const item = this.sheet.document.items.get(itemId);
                if (!item) {
                    return;
                }

                items.push({
                    element,
                    name: item.name,
                    sort: item.sort || 0,
                    item
                });
            });

            items.sort(comparator);

            section.replaceChildren(...items.map(({ element }) => element));
        });
    }

    _applyFilters() {
        const list = this.sheet.element[0].querySelector(`[data-item-list="${this.target}"]`);
        if (!list) {
            return;
        }

        const { name, properties } = this._filters[this.target];
        const filteredItems = this._filterItems(this.sheet.document.items, { name, properties });

        list.querySelectorAll('.item').forEach(element => {
            const itemId = element.dataset.itemId;
            const shouldShow = filteredItems.some(item => item.id === itemId);
            element.style.display = shouldShow ? '' : 'none';
        });
    }

    get grouping() {
        const flag = `sheetPrefs.location.tabs.${this.target}.group`;
        return game.user.getFlag('dnd5e', flag) !== false;
    }

    _initGrouping() {
        const searchElement = this.sheet.element[0]?.querySelector(`[data-for="${this.target}"]`);
        const groupControl = searchElement?.querySelector('[data-action="group"]');
        if (groupControl) {
            groupControl.classList.toggle('active', this.grouping);
        }
    }

    _applyGrouping() {
        const inventoryList = this.sheet.element[0]?.querySelector(`[data-item-list="${this.target}"]`);
        if (!inventoryList) {
            return;
        }

        const grouped = this.grouping;
        const sections = {};

        inventoryList.querySelectorAll('.items-section').forEach(section => {
            const type = section.dataset.type;
            const itemList = section.querySelector('.item-list');
            if (type && itemList) {
                sections[type] = itemList;
            }
        });

        inventoryList.querySelectorAll('.item').forEach(item => {
            const { grouped: groupedType, ungrouped: ungroupedType } = item.dataset;
            const targetType = grouped ? groupedType : ungroupedType;
            const targetSection = sections[targetType];

            if (targetSection) {
                targetSection.appendChild(item);
            }
        });

        this._applyFilters();
        this._applySorting();
    }

    _filterItems(items, filters) {
        const actions = ['action', 'bonus', 'reaction'];

        return items.filter(item => {
            if (filters.name) {
                const name = item.name.toLowerCase();
                const searchTerm = filters.name.toLowerCase();
                if (!name.includes(searchTerm)) {
                    return false;
                }
            }

            for (const property of filters.properties) {
                if (actions.includes(property)) {
                    const activation = item.system?.activation?.type;
                    if (!activation || activation !== property) {
                        return false;
                    }
                } else if (property === 'magical') {
                    const rarity = item.system?.rarity;
                    const isMagical = rarity && rarity !== 'common' && rarity !== 'mundane';
                    const isSpellItem = item.type === 'spell';
                    if (!isMagical && !isSpellItem) {
                        return false;
                    }
                }
            }

            return true;
        });
    }
}
