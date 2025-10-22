/**
 * Breather Controller
 * Handles breather rest actions and feature recovery
 */

import {Breather as BreatherDialog} from './ui';
import {getRecoverableFeatures} from './class-features';

export class Breather {
    /**
     * Perform a breather action for the given actor
     * @param {Actor} actor - The actor taking a breather
     * @param {Event} event - The click event
     * @return {Promise<void>}
     */
    async breather(actor, event) {
        if (actor.type === 'vehicle') {
            return;
        }

        let config = {};

        if (Hooks.call('sosly.preBreather', actor, config) === false) {
            return;
        }

        // Take note of the initial hit points and number of hit dice the Actor has
        const hd0 = foundry.utils.getProperty(actor, 'system.attributes.hd.value');
        const hp0 = foundry.utils.getProperty(actor, 'system.attributes.hp.value');

        // Display a Dialog for rolling hit dice
        const dialogResult = await BreatherDialog.breatherDialog({actor, canRoll: hd0 > 0});
        if (!dialogResult.completed) {
            // If the dialog was cancelled, return early
            return;
        }
        config = foundry.utils.mergeObject(config, dialogResult);

        // Handle class feature recovery if any were selected
        await this._handleFeatureRecovery(actor, config);

        // Call the breather hook
        if (Hooks.call('sosly.breather', actor, config) === false) {
            return;
        }

        // Calculate deltas
        const dhd = hd0 - foundry.utils.getProperty(actor, 'system.attributes.hd.value');
        const dhp = foundry.utils.getProperty(actor, 'system.attributes.hp.value') - hp0;

        // Create result object for chat message
        const result = {
            type: 'breather',
            dhd: dhd,
            dhp: dhp,
            actor: actor
        };

        // Display a Chat Message summarizing the rest effects
        if (config.chat !== false) {
            await this._displayBreatherResultMessage(actor, config, result);
        }

        // if (!config.dialog && config.autoHD) {
        //     await actor.autoSpendHitDice({threshold: config.autoHDThreshold});
        // }
    }

    /**
     * Display the breather result message in chat
     * @param {Actor} actor - The actor that took the breather
     * @param {object} config - Configuration options
     * @param {object} result - The result of the breather action
     * @return {Promise<void>}
     */
    async _displayBreatherResultMessage(actor, config, result) {
        let {dhd, dhp} = result;
        const diceRestored = dhd !== 0;
        const healthRestored = dhp !== 0;

        const pr = new Intl.PluralRules(game.i18n.lang);
        const message = `sosly.breather.result.${(diceRestored && healthRestored) ? 'full' : 'short'}`;
        let chatData = {
            content: game.i18n.format(message, {
                name: actor.name,
                dice: game.i18n.format(`DND5E.HITDICE.Counted.${pr.select(dhd)}`, {number: dnd5e.utils.formatNumber(dhd)}),
                health: game.i18n.format(`DND5E.HITPOINTS.Counted.${pr.select(dhp)}`, {number: dnd5e.utils.formatNumber(dhp)})
            }),
            flavor: `${game.i18n.localize('sosly.breather.title')} (5 ${game.i18n.localize('DND5E.TimeMinute')})`,
            type: 'rest',
            rolls: result.rolls,
            speaker: ChatMessage.getSpeaker({actor, alias: actor.name}),
            system: {
                activations: [],
                type: result.type
            }
        };

        ChatMessage.applyRollMode(chatData, game.settings.get('core', 'rollMode'));
        return ChatMessage.create(chatData);
    }

    /**
     * Handle feature recovery from the breather dialog
     * @param {Actor5e} actor - The actor recovering features
     * @param {object} config - The dialog configuration
     * @returns {Promise<void>}
     */
    async _handleFeatureRecovery(actor, config) {
        // Get recoverable features
        const recoverableFeatures = getRecoverableFeatures(actor);
        if (!recoverableFeatures.length) {return;}

        // Check which features were selected in the form
        const selectedFeatures = [];
        for (const feature of recoverableFeatures) {
            // dnd5e-checkbox sends "on" when checked, nothing when unchecked
            const isChecked = config.features?.[feature.key];
            if (isChecked) {
                selectedFeatures.push(feature);
            }
        }

        if (!selectedFeatures.length) {return;}

        // Validate hit dice availability
        const availableHD = actor.system.attributes.hd.value;
        if (selectedFeatures.length > availableHD) {
            ui.notifications.error(game.i18n.localize('sosly.breather.error.insufficientHD') || 'Not enough Hit Dice to recover selected features');
            return;
        }

        // Spend hit dice for each selected feature
        // eslint-disable-next-line no-unused-vars
        for (const feature of selectedFeatures) {
            await this._spendHitDie(actor);
        }

        // Update feature uses
        const updates = selectedFeatures.map(feature => ({
            _id: feature.id,
            'system.uses.spent': Math.max(0, feature.feature.system.uses.spent - feature.recoveryAmount)
        }));

        await actor.updateEmbeddedDocuments('Item', updates);

        // Store recovered features in config for hooks/chat
        config.featuresRecovered = selectedFeatures;
    }

    /**
     * Spend a single hit die from the smallest available class
     * @param {Actor5e} actor - The actor spending HD
     * @returns {Promise<void>}
     */
    async _spendHitDie(actor) {
        const hd = actor.system.attributes.hd;

        if (!hd.smallestAvailable || hd.value <= 0) {return;}

        // Find a class that has the smallest HD size and unspent HD
        const targetClass = Array.from(hd.classes)
            .filter(c => c.system.hd.denomination === hd.smallestAvailable)
            .find(c => c.system.hd.value > 0);

        if (targetClass) {
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
        if (!buttons) {return;}

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

        // Register hooks for character and NPC sheets
        Hooks.on('renderActorSheet5eCharacter2', (app, html) => {
            const el = html[0];
            breather.inject(app, el);
        });

        Hooks.on('renderActorSheet5eNPC2', (app, html) => {
            const el = html[0];
            breather.inject(app, el);
        });
    }
}
