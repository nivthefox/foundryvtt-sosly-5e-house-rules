import {utils} from '../../../../systems/dnd5e/dnd5e.mjs';
import {id as module_id} from '../../module.json';

export function registerConditions() {
    setupStatusEffects();
    setupConditionTypes();

    Hooks.on('combatTurnChange', async (combat, previous, next) => {
        handleImperiled(combat, previous, next);
    });
}

const conditionTypes = {
    imperiled: {
        label: 'Imperiled',
        icon: 'icons/svg/stoned.svg',
        reference: 'Compendium.sosly-5e-house-rules.house-rules.JournalEntry.OosZQsAJrULa2WcY.JournalEntryPage.wWUvr8XTV3xFqI4R'
    }
};

const statusEffects = {
    imperiled: {
        id: 'imperiled',
        img: 'icons/svg/stoned.svg',
        name: 'Imperiled',
        order: 1,
    }
};

function setupStatusEffects() {
    CONFIG.statusEffects = Object.entries(statusEffects).reduce((arr, [id, data]) => {
        const original = CONFIG.statusEffects.find(s => s.id === id);
        addEffect(arr, foundry.utils.mergeObject(original ?? {}, { id, ...data }, { inplace: false }));
        return arr;
    }, CONFIG.statusEffects);

    CONFIG.statusEffects.sort((lhs, rhs) =>
        lhs.order || rhs.order ? (lhs.order ?? Infinity) - (rhs.order ?? Infinity)
            : lhs.name.localeCompare(rhs.name, game.i18n.lang)
    );
}

function setupConditionTypes() {
    for ( const [id, {label: name, ...data}] of Object.entries(conditionTypes) ) {
        CONFIG.DND5E.conditionTypes[id] = { id, label: name, name, ...data };
        addEffect(CONFIG.statusEffects, { id, name, ...data });
    }
}

const addEffect = (effects, {special, ...data}) => {
    data = foundry.utils.deepClone(data);
    data._id = utils.staticID(`dnd5e${data.id}`);
    data.img = data.icon ?? data.img;
    delete data.icon;
    effects.push(data);
    if ( special ) CONFIG.specialStatusEffects[special] = data.id;
};

async function handleImperiled(combat, previous, next) {
    if (previous === null) {
        return;
    }

    const actorId = combat.combatants.get(previous.combatantId).actorId;
    const actor = game.actors.get(actorId);

    const exhaustion = actor.system.attributes.exhaustion;
    const existing = actor.effects.get(utils.staticID('dnd5eimperiled'));

    if (!existing) {
        return;
    }

    if (exhaustion >= 5) {
        await existing.delete();
        const effect = await ActiveEffect.implementation.fromStatusEffect('unconscious');
        await ActiveEffect.implementation.create(effect, { parent: actor, keepId: true});

        const content = await renderTemplate(`modules/${module_id}/templates/Imperiled.hbs`, {
            text: `${actor.name} falls unconscious and is no longer imperiled.`
        });
        await ChatMessage.create({
            user: game.user.id,
            speaker: {actor, alias: actor.name},
            content
        });
        return;
    }

    const confirmContent = game.i18n?.format('sosly.imperiled.confirmation', {exhaustion});
    const confirmation = await Dialog.confirm({
        title: 'Imperiled!',
        content: confirmContent
    });

    if (!confirmation) {
        await existing.delete();
        const effect = await ActiveEffect.implementation.fromStatusEffect('unconscious');
        await ActiveEffect.implementation.create(effect, { parent: actor, keepId: true});

        const content = await renderTemplate(`modules/${module_id}/templates/Imperiled.hbs`, {
            text: `${actor.name} falls unconscious and is no longer imperiled.`
        });
        await ChatMessage.create({
            user: game.user.id,
            speaker: {actor, alias: actor.name},
            content
        });
        return;
    }

    const change = {
        system: {
            attributes: {
                exhaustion: exhaustion + 1
            }
        }
    };
    actor.update(change);
    const content = await renderTemplate(`modules/${module_id}/templates/Imperiled.hbs`, {
        text: `${actor.name} has gained a level of Exhaustion to remain conscious!`
    });
    await ChatMessage.create({
        user: game.user.id,
        speaker: {actor, alias: actor.name},
        content
    });
}
