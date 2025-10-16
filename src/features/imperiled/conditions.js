/**
 * Imperiled Condition Setup
 * Registers the imperiled status effect and condition type
 */


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
    data._id = dnd5e.utils.staticID(`dnd5e${data.id}`);
    data.img = data.icon ?? data.img;
    delete data.icon;
    effects.push(data);
    if ( special ) {CONFIG.specialStatusEffects[special] = data.id;}
};

export function registerImperiledConditions() {
    setupStatusEffects();
    setupConditionTypes();
}
