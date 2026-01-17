import {id as MODULE_ID} from '../../../module.json';
import {Breather as BreatherDialog} from './ui';
import {getRecoverableFeatures} from './class-features';
import {addBreatherDelta, clearBreatherDeltas, getBreatherDeltas} from './deltas';

export class Breather {
    /**
     * Perform a breather action for the given actor
     * @param {Actor} actor - The actor taking a breather
     * @return {Promise<void>}
     */
    async breather(actor) {
        if (actor.type === 'vehicle') {
            return;
        }

        let config = {};

        if (Hooks.call('sosly.preBreather', actor, config) === false) {
            return;
        }

        await actor.setFlag(MODULE_ID, 'breatherDeltas', { actor: [], item: {} });

        const dialogResult = await BreatherDialog.breatherDialog({actor});
        if (dialogResult.completed) {
            config = foundry.utils.mergeObject(config, dialogResult);
            await this._handleFeatureRecovery(actor, config);
            Hooks.call('sosly.breather', actor, config);
        }

        const deltas = getBreatherDeltas(actor);
        await clearBreatherDeltas(actor);

        if (deltas && (deltas.actor.length || Object.keys(deltas.item).length)) {
            await this._displayBreatherResultMessage(actor, config, deltas);
        }
    }

    async _displayBreatherResultMessage(actor, config, deltas) {
        const chatData = {
            content: game.i18n.format('sosly.breather.result.short', { name: actor.name }),
            flavor: `${game.i18n.localize('sosly.breather.title')} (5 ${game.i18n.localize('DND5E.TimeMinute')})`,
            type: 'rest',
            speaker: ChatMessage.getSpeaker({actor, alias: actor.name}),
            system: {
                activations: [],
                deltas,
                type: 'breather'
            }
        };

        ChatMessage.applyRollMode(chatData, game.settings.get('core', 'rollMode'));
        return ChatMessage.create(chatData);
    }

    async _handleFeatureRecovery(actor, config) {
        const recoverableFeatures = getRecoverableFeatures(actor);
        if (!recoverableFeatures.length) {
            return;
        }

        const selectedFeatures = [];
        for (const feature of recoverableFeatures) {
            if (config.features?.[feature.key]) {
                selectedFeatures.push(feature);
            }
        }

        if (!selectedFeatures.length) {
            return;
        }

        const availableHD = actor.system.attributes.hd.value;
        if (selectedFeatures.length > availableHD) {
            ui.notifications.error(game.i18n.localize('sosly.breather.error.insufficientHD') || 'Not enough Hit Dice to recover selected features');
            return;
        }

        for (const _feature of selectedFeatures) {
            await this._spendHitDieWithTracking(actor);
        }

        for (const feature of selectedFeatures) {
            const delta = -feature.recoveryAmount; // negative because we're reducing "spent"
            await addBreatherDelta(actor, 'system.uses.spent', delta, feature.id);
        }

        const updates = selectedFeatures.map(feature => ({
            _id: feature.id,
            'system.uses.spent': Math.max(0, feature.feature.system.uses.spent - feature.recoveryAmount)
        }));

        await actor.updateEmbeddedDocuments('Item', updates);

        config.featuresRecovered = selectedFeatures;
    }

    async _spendHitDieWithTracking(actor) {
        const hd = actor.system.attributes.hd;

        if (!hd.smallestAvailable || hd.value <= 0) {
            return;
        }

        const targetClass = Array.from(hd.classes)
            .filter(c => c.system.hd.denomination === hd.smallestAvailable)
            .find(c => c.system.hd.value > 0);

        if (targetClass) {
            await addBreatherDelta(actor, 'system.hd.spent', 1, targetClass.id);
            await actor.updateEmbeddedDocuments('Item', [{
                _id: targetClass.id,
                'system.hd.spent': targetClass.system.hd.spent + 1
            }]);
        }
    }

    /**
     * Inject breather button into the sheet
     * @param {Application} app - The sheet application
     * @param {HTMLElement} el - The sheet HTML element
     */
    inject(app, el) {
        const buttons = el.querySelector('.sheet-header-buttons');
        if (!buttons) {
            return;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add('breather-button', 'gold-button');
        button.setAttribute('data-tooltip', 'sosly.breather.label');
        button.setAttribute('aria-label', game.i18n.localize('sosly.breather.label'));

        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-face-exhaling');

        button.appendChild(icon);
        buttons.prepend(button);

        button.addEventListener('click', async event => {
            await this.breather(app.actor, event);
        });
    }

    /**
     * Register breather UI hooks
     * @returns {void}
     */
    static register() {
        const breather = new Breather();

        Hooks.on('renderCharacterActorSheet', (app, element) => {
            breather.inject(app, element);
        });

        Hooks.on('renderNPCActorSheet', (app, element) => {
            breather.inject(app, element);
        });
    }
}
