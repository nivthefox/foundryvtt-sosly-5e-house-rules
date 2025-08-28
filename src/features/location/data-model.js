const { MappingField } = dnd5e.dataModels.fields;

export class LocationData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            location: new fields.StringField({
                required: false,
                blank: true,
                label: 'sosly.location.parentLocation'
            }),

            details: new fields.SchemaField({
                type: new fields.StringField({
                    required: false,
                    blank: true,
                    choices: {
                        building: 'sosly.location.locationType.building',
                        room: 'sosly.location.locationType.room',
                        outdoor: 'sosly.location.locationType.outdoor',
                        dungeon: 'sosly.location.locationType.dungeon',
                        settlement: 'sosly.location.locationType.settlement',
                        region: 'sosly.location.locationType.region',
                        plane: 'sosly.location.locationType.plane',
                        other: 'sosly.location.locationType.other'
                    },
                    initial: 'building',
                    label: 'sosly.location.locationType.label'
                })
            }),

            currency: new MappingField(new fields.NumberField({
                required: true,
                nullable: false,
                integer: true,
                min: 0,
                initial: 0
            }), {
                initialKeys: CONFIG.DND5E.currencies,
                initialKeysOnly: true,
                label: 'DND5E.Currency'
            }),

            present: new fields.ArrayField(
                new fields.SchemaField({
                    id: new fields.DocumentIdField({
                        required: true,
                        label: 'sosly.location.present.actorId'
                    }),
                    name: new fields.StringField({
                        required: false,
                        blank: true,
                        label: 'sosly.location.present.actorName'
                    }),
                    type: new fields.StringField({
                        required: false,
                        blank: true,
                        label: 'sosly.location.present.actorType'
                    })
                }), {
                    label: 'sosly.location.present.actors'
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
        this.totalValue = 0;
        for (const [denomination, amount] of Object.entries(this.currency)) {
            const conversion = CONFIG.DND5E.currencies[denomination]?.conversion ?? 1;
            this.totalValue += amount / conversion;
        }
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
