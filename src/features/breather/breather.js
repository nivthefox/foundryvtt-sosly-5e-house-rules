const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

import {findBestHitDie, formatHitDieOptions} from './calculations';

class BreatherDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: 'breather-dialog',
        position: { width: 400, height: 'auto' },
        window: {
            minimizable: false,
            resizable: false
        },
        actions: {
            rest: BreatherDialog.rest,
            cancel: BreatherDialog.cancel,
            rollHitDie: BreatherDialog.rollHitDie
        }
    };

    static PARTS = {
        form: {
            template: 'modules/sosly-5e-house-rules/templates/features/breather/breather-form.hbs'
        }
    };

    constructor(actor, resolve, reject) {
        super({
            window: {
                title: `${game.i18n.localize('sosly.breather.label')}: ${actor.name}`
            }
        });
        this.actor = actor;
        this.resolve = resolve;
        this.reject = reject;
    }

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

        if (partId === 'form') {
            const breatherContext = this.#prepareBreatherContext();
            return foundry.utils.mergeObject(context, breatherContext);
        }

        return context;
    }

    #prepareBreatherContext() {
        const context = {};
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
            context.denomination = findBestHitDie(context.availableHD);
            context.hdOptions = formatHitDieOptions(context.availableHD, game.i18n.localize('DND5E.available'));
        }

        return context;
    }

    static async rest(event, target) {
        // Create a chat message for the breather rest
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const content = `<p><strong>${this.actor.name}</strong> takes a breather.</p>`;

        await ChatMessage.create({
            speaker,
            content,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });

        this.resolve({ completed: true });
        this.close({ skipReject: true });
    }

    static async cancel(event, target) {
        this.reject();
        this.close();
    }

    static async rollHitDie(event, target) {
        const form = target.closest('form');
        const denom = form.elements.hd.value;
        await this.actor.rollHitDie({ denomination: denom });
        await this.render(false);
    }

    async close(options = {}) {
        if (!options.skipReject) this.reject();
        return super.close(options);
    }
}

export class Breather {
    static async breatherDialog({actor} = {}) {
        return new Promise((resolve, reject) => {
            new BreatherDialog(actor, resolve, reject).render({ force: true });
        });
    }
}
