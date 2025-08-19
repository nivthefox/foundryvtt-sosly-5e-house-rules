import { addPsionicSubtitles } from './ui-spellbook';
import { reorganizePsionicDisciplines } from './ui-features';
import { registerPsychicFocusManagement } from './psychic-focus';

function setupPsionicOptions() {
    CONFIG.DND5E.featureTypes.discipline = {
        label: 'Psionic Discipline',
        subtypes: {
            ava: 'Avatar',
            awa: 'Awakened',
            imm: 'Immortal',
            nom: 'Nomad',
            sok: 'Soul Knife',
            wuj: 'Wu Jen'
        },
    };
    CONFIG.DND5E.spellLevels[99] = 'Psionic Power';
    CONFIG.DND5E.spellPreparationModes.psionic = {
        label: 'Psionic',
        order: 999
    };
    CONFIG.DND5E.spellSchools.ava = {
        fullKey: 'Discipline - Avatar',
        icon: 'systems/dnd5e/icons/svg/schools/enchantment.svg',
        label: 'Avatar'
    };
    CONFIG.DND5E.spellSchools.awa = {
        fullKey: 'Discipline - Awakened',
        icon: 'systems/dnd5e/icons/svg/schools/illusion.svg',
        label: 'Awakened'
    };
    CONFIG.DND5E.spellSchools.imm = {
        fullKey: 'Discipline - Immortal',
        icon: 'systems/dnd5e/icons/svg/schools/transmutation.svg',
        label: 'Immortal'
    };
    CONFIG.DND5E.spellSchools.nom = {
        fullKey: 'Discipline - Nomad',
        icon: 'systems/dnd5e/icons/svg/schools/conjuration.svg',
        label: 'Nomad'
    };
    CONFIG.DND5E.spellSchools.sok = {
        fullKey: 'Discipline - Soul Knife',
        icon: 'systems/dnd5e/icons/svg/schools/evocation.svg',
        label: 'Soul Knife'
    };
    CONFIG.DND5E.spellSchools.wuj = {
        fullKey: 'Discipline - Wu Jen',
        icon: 'systems/dnd5e/icons/svg/schools/necromancy.svg',
        label: 'Wu Jen'
    };
}

export function registerPsionics() {
    Hooks.once('setup', setupPsionicOptions);
    Hooks.on('renderActorSheet', addPsionicSubtitles);
    Hooks.on('renderActorSheet', reorganizePsionicDisciplines);
    registerPsychicFocusManagement();
}
