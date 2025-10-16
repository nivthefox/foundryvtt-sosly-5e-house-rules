import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';

export function handleTransformationCleanup(actor, options) {
    if (!game.settings.get(module_id, 'transformation-cleanup')) {return;}

    if (actor.type !== 'character') {return;}

    if (!actor.isPolymorphed) {return;}

    if (game.user.isGM) {return;}

    const previousActorIds = actor.getFlag('dnd5e', 'previousActorIds') ?? [];
    const originalActorId = actor.getFlag('dnd5e', 'originalActor');

    if (!previousActorIds.length) {return;}

    const actorsToDelete = previousActorIds.filter(id => {
        const tempActor = game.actors.get(id);
        return tempActor && tempActor.id !== originalActorId;
    });

    const allActorsToDelete = [...actorsToDelete, actor.id];

    if (allActorsToDelete.length === 0) {return;}

    setTimeout(async () => {
        try {
            const existingActors = allActorsToDelete.filter(id => game.actors.get(id));

            if (existingActors.length > 0) {
                await Actor.implementation.deleteDocuments(existingActors);
                logger.info(`Transformation Cleanup: Deleted ${existingActors.length} temporary actor(s)`);
            }
        } catch (error) {
            logger.warn(`Transformation Cleanup: Failed to delete temporary actors - ${error}`);
        }
    }, 500);
}
