import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import {registerAttunementLimitsSettings} from './settings';

/**
 * Attunement Limits Feature
 * Sets maximum attuned items equal to proficiency bonus instead of the default 3.
 */

export function registerAttunementLimitsFeature() {
    logger.info('Registering Attunement Limits');

    registerAttunementLimitsSettings();

    if (!game.settings.get(module_id, 'attunementLimits')) {
        return;
    }

    // Wrap prepareDerivedData for Character data model
    // WRAPPER mode calls original first, then we modify attunement.max
    libWrapper.register(
        module_id,
        'dnd5e.dataModels.actor.CharacterData.prototype.prepareDerivedData',
        function(wrapped, ...args) {
            wrapped(...args);
            if (this.attributes.prof != null) {
                this.attributes.attunement.max = this.attributes.prof;
            }
        },
        'WRAPPER'
    );

    // Wrap prepareDerivedData for NPC data model
    libWrapper.register(
        module_id,
        'dnd5e.dataModels.actor.NPCData.prototype.prepareDerivedData',
        function(wrapped, ...args) {
            wrapped(...args);
            if (this.attributes.prof != null) {
                this.attributes.attunement.max = this.attributes.prof;
            }
        },
        'WRAPPER'
    );
}
