import { prepareEncumbrance } from '../features/encumbrance/encumbrance';

export function registerSoSlyActor() {
    CONFIG.Actor.documentClass = mixinPlayerCharacterSheet(CONFIG.Actor.documentClass);
}

function mixinPlayerCharacterSheet(Actor5e) {
    return class SoSlyActor extends Actor5e {
        prepareDerivedData() {
            super.prepareDerivedData();
            const rollData = this.system.parent.getRollData({deterministic: true});
            prepareEncumbrance.call(this.system, rollData);
        }
    };
}
