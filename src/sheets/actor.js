import {utils} from '../../../../systems/dnd5e/dnd5e.mjs';
import {id as module_id} from '../../module.json';

export function registerSoSlyActor() {
    CONFIG.Actor.documentClass = mixinPlayerCharacterSheet(CONFIG.Actor.documentClass);

    Hooks.on('updateItem', async (item, changes, options, id) => {
        if (changes.equipped !== undefined) {
            if (options.parent) {
                options.parent.prepareDerivedData();
            }
        }
    });
}

function mixinPlayerCharacterSheet(Actor5e) {
    return class SoSlyActor extends Actor5e {
        prepareDerivedData() {
            super.prepareDerivedData();
            const rollData = this.system.parent.getRollData({deterministic: true});
            prepareEncumbrance.call(this.system, rollData);
        }

        async _preUpdate(changed, options, userId) {
            await super._preUpdate(changed, options, userId);

            if (changed.system?.attributes?.hp) {
                await this.#handleImperiled(changed, options, userId);
            }
        }

        /**
         * Handle applying/removing the imperiled status.
         * @param {object} changed
         * @param {DocumentModificationContext} options
         * @param {User5e} user
         * @returns {Promise<void>}
         */
        async #handleImperiled(changed, options, user) {
            const hp = changed.system.attributes.hp;
            const exhaustion = this.system.attributes.exhaustion;

            const existing = this.effects.get(utils.staticID('dnd5eimperiled'));

            if (hp.value > 0 && existing) {
                await existing.delete();

                const content = await renderTemplate(`modules/${module_id}/templates/Imperiled.hbs`, {
                    text: `${this.name} is no longer imperiled.`
                });
                await ChatMessage.create({
                    user: game.user.id,
                    speaker: {actor: this, alias: this.name},
                    content
                });
                return;
            }

            if (hp.value > 0) {
                return;
            }

            if (!existing && exhaustion < 5) {
                const confirmation = await Dialog.confirm({
                    title: 'Imperiled!',
                    content: `Your character is imperiled!  You can gain a level of Exhaustion to remain conscious. You 
                    currently have ${exhaustion} levels of exhaustion.  Do you want to do this?`,
                });

                if (!confirmation) {
                    const effect = await ActiveEffect.implementation.fromStatusEffect('unconscious');
                    await ActiveEffect.implementation.create(effect, { parent: this, keepId: true});
                    return;
                }

                const effect = await ActiveEffect.implementation.fromStatusEffect('imperiled');
                await ActiveEffect.implementation.create(effect, { parent: this, keepId: true});
                changed.system.attributes.exhaustion = exhaustion + 1;

                const content = await renderTemplate(`modules/${module_id}/templates/Imperiled.hbs`, {
                    text: `${this.name} has gained a level of Exhaustion to remain conscious!`
                });
                await ChatMessage.create({
                    user: game.user.id,
                    speaker: {actor: this, alias: this.name},
                    content
                });
            }
        }
    };
}

/**
 * Calculate encumbrance details for an Actor.
 * Equipped items weigh half as much as carried items.
 * @this {CharacterData|NPCData|VehicleData}
 * @param {object} rollData  The Actor's roll data.
 * @param {object} [options]
 * @param {Function} [options.validateItem]  Determine whether an item's weight should count toward encumbrance.
 */
function prepareEncumbrance(rollData, { validateItem }={}) {
    const config = CONFIG.DND5E.encumbrance;
    const encumbrance = this.attributes.encumbrance ??= {};
    const baseUnits = CONFIG.DND5E.encumbrance.baseUnits[this.parent.type]
        ?? CONFIG.DND5E.encumbrance.baseUnits.default;
    const unitSystem = game.settings.get('dnd5e', 'metricWeightUnits') ? 'metric' : 'imperial';

    // Get the total weight from items
    let weight = this.parent.items
        .filter(item => !['race', 'feat', 'class', 'subclass', 'feature', 'spell'].includes(item.type))
        .filter(item => !item.container && (validateItem?.(item) ?? true))
        .reduce((weight, item) => {
            const isEquipped = item.system.equipped;
            const itemWeight = (item.system.totalWeightIn?.(baseUnits[unitSystem]) ?? 0);
            return weight + (isEquipped ? Math.ceil(itemWeight / 2) : itemWeight);
        }, 0);

    // [Optional] add Currency Weight (for non-transformed actors)
    const currency = this.currency;
    if ( game.settings.get('dnd5e', 'currencyWeight') && currency ) {
        const numCoins = Object.values(currency).reduce((val, denom) => val + Math.max(denom, 0), 0);
        const currencyPerWeight = config.currencyPerWeight[unitSystem];
        weight += utils.convertWeight(
            numCoins / currencyPerWeight,
            config.baseUnits.default[unitSystem],
            baseUnits[unitSystem]
        );
    }

    // Determine the Encumbrance size class
    const keys = Object.keys(CONFIG.DND5E.actorSizes);
    const index = keys.findIndex(k => k === this.traits.size);
    const sizeConfig = CONFIG.DND5E.actorSizes[
        keys[this.parent.flags.dnd5e?.powerfulBuild ? Math.min(index + 1, keys.length - 1) : index]
    ];
    const sizeMod = sizeConfig?.capacityMultiplier ?? sizeConfig?.token ?? 1;
    let maximumMultiplier;

    const calculateThreshold = threshold => {
        let base = this.abilities.str?.value ?? 10;
        const bonus = utils.simplifyBonus(encumbrance.bonuses?.[threshold], rollData)
            + utils.simplifyBonus(encumbrance.bonuses?.overall, rollData);
        let multiplier = utils.simplifyBonus(encumbrance.multipliers[threshold], rollData)
            * utils.simplifyBonus(encumbrance.multipliers.overall, rollData);
        if ( threshold === 'maximum' ) maximumMultiplier = multiplier;
        if ( this.parent.type === 'vehicle' ) base = this.attributes.capacity.cargo;
        else multiplier *= (config.threshold[threshold]?.[unitSystem] ?? 1) * sizeMod;
        return (base * multiplier).toNearest(0.1) + bonus;
    };

    // Populate final Encumbrance values
    encumbrance.value = weight.toNearest(0.1);
    encumbrance.thresholds = {
        encumbered: calculateThreshold('encumbered'),
        heavilyEncumbered: calculateThreshold('heavilyEncumbered'),
        maximum: calculateThreshold('maximum')
    };
    encumbrance.max = encumbrance.thresholds.maximum;
    encumbrance.mod = (sizeMod * maximumMultiplier).toNearest(0.1);
    encumbrance.stops = {
        encumbered: Math.clamp((encumbrance.thresholds.encumbered * 100) / encumbrance.max, 0, 100),
        heavilyEncumbered: Math.clamp((encumbrance.thresholds.heavilyEncumbered * 100) / encumbrance.max, 0, 100)
    };
    encumbrance.pct = Math.clamp((encumbrance.value * 100) / encumbrance.max, 0, 100);
    encumbrance.encumbered = encumbrance.value > encumbrance.heavilyEncumbered;
}
