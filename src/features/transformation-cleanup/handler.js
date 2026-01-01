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

    setTimeout(() => {
        const existingActors = allActorsToDelete.filter(id => game.actors.get(id));

        if (existingActors.length === 0) {return;}

        if (!game.users.activeGM) {
            logger.warn('Transformation Cleanup: No GM online to process deletion');
            ui.notifications.warn(game.i18n.localize('sosly.transformation-cleanup.no-gm'));
            return;
        }

        game.socket.emit('module.sosly-5e-house-rules', {
            action: 'deleteTransformationActors',
            actorIds: existingActors
        });
        logger.info(`Transformation Cleanup: Requested deletion of ${existingActors.length} temporary actor(s)`);
    }, 500);
}

export async function handleTransformationCleanupSocket(data) {
    if (!game.user.isGM) {return;}

    if (data.action !== 'deleteTransformationActors') {return;}

    if (!Array.isArray(data.actorIds) || data.actorIds.length === 0) {return;}

    const existingActors = data.actorIds.filter(id => game.actors.get(id));

    if (existingActors.length === 0) {return;}

    try {
        await Actor.implementation.deleteDocuments(existingActors);
        logger.info(`Transformation Cleanup: Deleted ${existingActors.length} temporary actor(s)`);
    } catch (error) {
        logger.warn(`Transformation Cleanup: Failed to delete temporary actors - ${error}`);
    }
}
