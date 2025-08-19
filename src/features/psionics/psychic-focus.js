import {logger} from '../../utils/logger';

function isPsychicFocusActivity(activity) {
    const item = activity.item;

    if (item.type !== 'feat' || item.system.type?.value !== 'discipline') {
        return false;
    }

    return activity.name?.toLowerCase().includes('psychic focus');
}

async function managePsychicFocusEffects(activity) {
    const actor = activity.actor;
    if (!actor) return;

    logger.info(`Managing effects for actor: ${actor.name}`);

    const currentItem = activity.item;
    const currentItemId = currentItem.id;

    // Find all psionic discipline items on the actor
    const psionicDisciplines = actor.items.filter(item =>
        item.type === 'feat' && item.system.type?.value === 'discipline'
    );

    logger.info(`Found ${psionicDisciplines.length} psionic disciplines`);

    // Find the Psychic Focus effect on each discipline
    const allPsychicFocusEffects = [];
    for (const discipline of psionicDisciplines) {
        // Look for effects on the discipline item that match the discipline name
        const disciplineFocusEffect = discipline.effects.find(effect =>
            effect.name === discipline.name
        );

        if (disciplineFocusEffect) {
            allPsychicFocusEffects.push({
                effect: disciplineFocusEffect,
                discipline: discipline,
                isCurrent: discipline.id === currentItemId
            });
            logger.info(`Found effect on ${discipline.name}, disabled: ${disciplineFocusEffect.disabled}`);
        }
    }

    if (allPsychicFocusEffects.length === 0) {
        logger.info('No Psychic Focus effects found');
        return;
    }

    const currentDisciplineData = allPsychicFocusEffects.find(data => data.isCurrent);
    const otherDisciplineData = allPsychicFocusEffects.filter(data => !data.isCurrent);

    const activatedEffects = [];
    const deactivatedEffects = [];

    // Disable other discipline effects
    for (const data of otherDisciplineData) {
        if (!data.effect.disabled) {
            await data.effect.update({ disabled: true });
            deactivatedEffects.push(data.discipline.name);
            logger.info(`Disabled effect for ${data.discipline.name}`);
        }
    }

    // Enable current discipline effect
    if (currentDisciplineData && currentDisciplineData.effect.disabled) {
        await currentDisciplineData.effect.update({ disabled: false });
        activatedEffects.push(currentDisciplineData.discipline.name);
        logger.info(`Enabled effect for ${currentDisciplineData.discipline.name}`);
    }

    // Show notifications
    if (deactivatedEffects.length > 0 && activatedEffects.length > 0) {
        ui.notifications.info(`Psychic Focus shifted from ${deactivatedEffects.join(', ')} to ${activatedEffects.join(', ')}`);
    } else if (activatedEffects.length > 0) {
        ui.notifications.info(`Psychic Focus activated: ${activatedEffects.join(', ')}`);
    }
}

function onPreActivityConsumption(activity, usageConfig, messageConfig) {
    logger.info(`Hook fired for activity: ${activity.name} on item: ${activity.item.name}`);
    logger.info(`Item type: ${activity.item.type}, system type: ${activity.item.system.type}`);

    if (!isPsychicFocusActivity(activity)) {
        logger.info('Not a psychic focus activity');
        return true;
    }

    logger.info(`Processing psychic focus activity: ${activity.name}`);
    managePsychicFocusEffects(activity);

    return true;
}

export function registerPsychicFocusManagement() {
    Hooks.on('dnd5e.preActivityConsumption', onPreActivityConsumption);
}
