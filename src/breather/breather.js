export class Breather extends Dialog {
    constructor(actor, dialogData = {}, options = {}) {
        super(dialogData, options);

        this.actor = actor;
        this.denom = null;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: 'modules/sosly-5e-house-rules/templates/breather.hbs',
            classes: ['sosly', 'dnd5e', 'dialog'],
            height: 'auto'
        });
    }

    getData() {
        const context = super.getData();
        context.isGroup = this.actor.type === 'group';

        if (this.actor.type === 'npc') {
            const hd = this.actor.system.attributes.hd;
            context.availableHD = { [`d${hd.denomination}`]: hd.value };
            context.canRoll = hd.value > 0;
            context.denomination = `d${hd.denomination}`;
            context.hdOptions = [{
                value: context.denomination,
                label: `${context.denomination} (${hd.value} ${game.i18n.localize('DND5E.available')})`
            }];
        }

        else if (foundry.utils.hasProperty(this.actor, 'system.attributes.hd')) {
            context.availableHD = this.actor.system.attributes.hd.bySize;
            context.canRoll = this.actor.system.attributes.hd.value > 0;

            const dice = Object.entries(context.availableHD);
            context.denomination = (context.availableHD[this.denom] > 0)
                ? this.denom
                : dice.find(([k, v]) => v > 0)?.[0];

            context.hdOptions = Object.entries(context.availableHD).map(([value, number]) => ({
                value, label: `${value} (${number} ${game.i18n.localize('DND5E.available')})`
            }));
        }

        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);
        console.log('here');

        const button = html.find('#roll-hd');
        button.click(this._onRollHitDie.bind(this));
    }

    async _onRollHitDie(event) {
        event.preventDefault();
        const button = event.currentTarget;
        this.denom = button.form.hd.value;
        await this.actor.rollHitDie({ denomination: this.denom });
        this.render();
    }

    static async breatherDialog({actor} = {}) {
        return new Promise((resolve, reject) => {
            const dialogue = new Breather(actor, {
                title: `${game.i18n.localize('sosly.breather.label')}: ${actor.name}`,
                buttons: {
                    rest: {
                        icon: '<i class="fas fa-face-exhaling"></i>',
                        label: game.i18n.localize('DND5E.Rest'),
                        callback: html => {
                            const formData = new FormDataExtended(html.find('form')[0]);
                            resolve(formData.object);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize('Cancel'),
                        callback: reject
                    }
                },
                close: reject
            });
            dialogue.render(true);
        });
    }
}
