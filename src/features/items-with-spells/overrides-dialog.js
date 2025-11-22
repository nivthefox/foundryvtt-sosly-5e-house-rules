import {getItemSpells} from './utils';

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class ItemSpellOverrides extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(item, spellId) {
        const id = `sosly-items-with-spells-${item.id}-${spellId}`;

        super({id});

        const itemSpells = getItemSpells(item);
        const spellEntry = itemSpells.find(s => s.id === spellId);

        this.overrides = spellEntry?.overrides ?? {};
        this.spellId = spellId;
        this.item = item;
        this.spellEntry = spellEntry;
    }

    static DEFAULT_OPTIONS = {
        id: 'sosly-items-with-spells-overrides',
        tag: 'form',
        form: {
            handler: ItemSpellOverrides._formHandler,
            closeOnSubmit: false,
            submitOnChange: true
        },
        position: {
            width: 560,
            height: 'auto'
        },
        window: {
            icon: 'fas fa-wand-sparkles',
            title: 'Override Dialog',
            contentClasses: ['dnd5e2', 'sheet', 'item', 'iws']
        }
    };

    static PARTS = {
        form: {
            template: 'modules/sosly-5e-house-rules/templates/features/items-with-spells/overrides-form.hbs'
        },
        footer: {
            template: 'templates/generic/form-footer.hbs'
        }
    };

    get title() {
        if (!this.spell) {
            return 'Configure Overrides';
        }
        return `${this.item.name} - ${this.spell.name}`;
    }

    async _prepareContext() {
        const fieldDefault = new foundry.data.fields.StringField();

        if (!this.spellEntry) {
            return {fieldDefault};
        }

        this.spell = await fromUuid(this.spellEntry.uuid);

        if (!this.spell) {
            return {fieldDefault};
        }

        const spell = this.spell;
        const saveActivity = spell.system.activities.getByType('save');
        const attackActivity = spell.system.activities.getByType('attack');
        const overrides = this.overrides;
        const buttonText = `${game.i18n.localize('Save')} & ${game.i18n.localize('Close')}`;
        const hasUses = this.item.system?.uses?.max > 0;
        const abilitiesArray = Object.entries(CONFIG.DND5E.abilities).map(([value, config]) => ({
            value,
            label: config.label,
            group: game.i18n.localize('DND5E.Abilities')
        }));

        return {
            spell,
            overrides,
            spellStats: {
                saveActivity: saveActivity[0] ?? {},
                attackActivity: attackActivity[0] ?? {},
                hasNoFlatDC: overrides.saveActivity?.calculation ?? '',
                saveAbility: saveActivity[0]?.save?.ability
            },
            options: {
                recoveryPeriods: [
                    {value: '', label: game.i18n.localize('sosly.items-with-spells.form.never')},
                    ...Object.entries(CONFIG.DND5E.limitedUsePeriods)
                        .filter(([, config]) => !config.deprecated)
                        .map(([value, config]) => ({
                            value,
                            label: config.label,
                            group: game.i18n.localize('DND5E.DurationTime')
                        }))
                ],
                abilityOptions: [
                    {value: 'noOverride', label: game.i18n.localize('sosly.items-with-spells.form.no-override')},
                    {rule: true},
                    {
                        value: '',
                        label: game.i18n.format('DND5E.DefaultSpecific', {
                            default: game.i18n.localize('DND5E.Spellcasting').toLowerCase()
                        })
                    },
                    {value: 'none', label: game.i18n.localize('DND5E.None')},
                    {value: 'spellcasting', label: game.i18n.localize('DND5E.SpellAbility')},
                    ...abilitiesArray
                ],
                calculationOptions: [
                    {value: 'noOverride', label: game.i18n.localize('sosly.items-with-spells.form.no-override')},
                    {rule: true},
                    {
                        value: '',
                        label: `${game.i18n.localize('DND5E.Flat')} (${game.i18n.localize('DND5E.SAVE.FIELDS.save.dc.CustomFormula')})`
                    },
                    {value: 'spellcasting', label: game.i18n.localize('DND5E.SpellAbility')},
                    ...abilitiesArray
                ],
                itemUses: [{value: 'itemUses', label: 'DND5E.CONSUMPTION.Type.ItemUses.Label'}],
                parentItem: [{value: this.item.id, label: this.item.name}]
            },
            parentItem: {
                id: this.item.id,
                name: this.item.name,
                isEmbedded: this.item.isEmbedded,
                hasNoUses: !hasUses,
                hasNoUsesHint: hasUses ? false : 'sosly.items-with-spells.form.no-uses-hint'
            },
            buttons: [
                {type: 'submit', icon: 'fa-solid fa-save', label: buttonText}
            ],
            fieldDefault: new foundry.data.fields.StringField(),
            inputs: {
                createCheckboxInput: dnd5e.applications.fields.createCheckboxInput
            }
        };
    }

    static async _formHandler(event, form, formData) {
        const formDataExpanded = foundry.utils.expandObject(formData.object);
        this.overrides = formDataExpanded.overrides;

        if (event instanceof SubmitEvent) {
            await this.saveOverrides();
            this.close();
        } else {
            const focus = this.element?.querySelector(':focus');
            const focusSelector = focus ? `${focus.tagName}[name="${focus.name}"]` : null;
            this.render({focusSelector});
        }
    }

    async saveOverrides() {
        const itemSpells = getItemSpells(this.item);
        const spell = itemSpells.find(s => s.id === this.spellId);

        if (!spell) {
            return;
        }

        spell.overrides = this.overrides;
        await this.item.setFlag('sosly-5e-house-rules', 'item-spells', itemSpells);
        this.item.render();
    }

    _onRender(context, options) {
        super._onRender(context, options);

        this.element.querySelectorAll('.label-top > p.hint').forEach(hint => {
            const label = hint.parentElement.querySelector(':scope > label');
            if (!label) {
                return;
            }
            hint.ariaLabel = hint.innerText;
            hint.dataset.tooltip = hint.innerHTML;
            hint.innerHTML = '';
            label.insertAdjacentElement('beforeend', hint);
        });

        if (options.focusSelector) {
            this.element.querySelector(options.focusSelector)?.focus();
        }
    }
}
