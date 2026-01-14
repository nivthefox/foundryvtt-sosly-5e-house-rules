import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import {filterSpellSchools} from './spell-filter';

export function registerSpellFilterFeature() {
    logger.info('Registering Spell Filter');

    if (!game.modules.get('lib-wrapper')?.active) {
        logger.warn('Spell Filter requires lib-wrapper');
        return;
    }

    libWrapper.register(
        module_id,
        'dnd5e.applications.actor.CharacterActorSheet.prototype._prepareSpellsContext',
        filterSpellSchools,
        'WRAPPER'
    );

    libWrapper.register(
        module_id,
        'dnd5e.applications.actor.NPCActorSheet.prototype._prepareSpellsContext',
        filterSpellSchools,
        'WRAPPER'
    );
}
