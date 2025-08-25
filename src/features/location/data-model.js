export class LocationData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            location: new fields.StringField({
                required: false,
                blank: true,
                label: 'SOSLY.location.parentLocation'
            }),

            details: new fields.SchemaField({
                description: new fields.HTMLField({
                    required: false,
                    blank: true,
                    label: 'SOSLY.location.description'
                }),
                size: new fields.StringField({
                    required: false,
                    blank: true,
                    choices: {
                        tiny: 'SOSLY.location.size.tiny',
                        small: 'SOSLY.location.size.small',
                        medium: 'SOSLY.location.size.medium',
                        large: 'SOSLY.location.size.large',
                        huge: 'SOSLY.location.size.huge',
                        gargantuan: 'SOSLY.location.size.gargantuan'
                    },
                    initial: 'medium',
                    label: 'SOSLY.location.size.label'
                }),
                type: new fields.StringField({
                    required: false,
                    blank: true,
                    choices: {
                        building: 'SOSLY.location.locationType.building',
                        room: 'SOSLY.location.locationType.room',
                        outdoor: 'SOSLY.location.locationType.outdoor',
                        dungeon: 'SOSLY.location.locationType.dungeon',
                        settlement: 'SOSLY.location.locationType.settlement',
                        region: 'SOSLY.location.locationType.region',
                        plane: 'SOSLY.location.locationType.plane',
                        other: 'SOSLY.location.locationType.other'
                    },
                    initial: 'building',
                    label: 'SOSLY.location.locationType.label'
                })
            }),

            currency: new fields.SchemaField({
                pp: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    initial: 0,
                    min: 0,
                    label: 'DND5E.CurrencyPP'
                }),
                gp: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    initial: 0,
                    min: 0,
                    label: 'DND5E.CurrencyGP'
                }),
                ep: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    initial: 0,
                    min: 0,
                    label: 'DND5E.CurrencyEP'
                }),
                sp: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    initial: 0,
                    min: 0,
                    label: 'DND5E.CurrencySP'
                }),
                cp: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    initial: 0,
                    min: 0,
                    label: 'DND5E.CurrencyCP'
                })
            }),

            present: new fields.ArrayField(
                new fields.SchemaField({
                    id: new fields.DocumentIdField({
                        required: true,
                        label: 'SOSLY.location.present.actorId'
                    }),
                    name: new fields.StringField({
                        required: false,
                        blank: true,
                        label: 'SOSLY.location.present.actorName'
                    }),
                    type: new fields.StringField({
                        required: false,
                        blank: true,
                        label: 'SOSLY.location.present.actorType'
                    })
                }), {
                    label: 'SOSLY.location.present.actors'
                }
            )
        };
    }

    prepareBaseData() {
        if (!this.present) {
            this.present = [];
        }
    }

    prepareDerivedData() {
        this.preparePresentActors();
        this.prepareCurrencyValue();
    }

    preparePresentActors() {
        for (const actor of this.present) {
            if (!actor.name || !actor.type) {
                const foundActor = game.actors.get(actor.id);
                if (foundActor) {
                    actor.name = foundActor.name;
                    actor.type = foundActor.type;
                }
            }
        }
    }

    prepareCurrencyValue() {
        const currency = this.currency;
        this.totalValue = (currency.pp * 10) + currency.gp + (currency.ep * 0.5)
            + (currency.sp * 0.1) + (currency.cp * 0.01);
    }

    async addActor(actorId) {
        const actor = game.actors.get(actorId);
        if (!actor) {
            return false;
        }

        const existing = this.present.find(a => a.id === actorId);
        if (existing) {
            return false;
        }

        const newActor = {
            id: actorId,
            name: actor.name,
            type: actor.type
        };

        const update = {
            system: {
                present: [...this.present, newActor]
            }
        };

        await this.parent.update(update);
        return true;
    }

    async removeActor(actorId) {
        const filtered = this.present.filter(a => a.id !== actorId);

        const update = {
            system: {
                present: filtered
            }
        };

        await this.parent.update(update);
        return true;
    }
}
