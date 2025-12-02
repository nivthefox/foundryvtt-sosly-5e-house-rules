import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';

function isPsionicDiscipline(item) {
    return item.type === 'feat' && item.system.type?.value === 'discipline';
}

async function createPsionicDisciplinesSection(element) {
    const featuresSection = element.querySelector('.features-list');
    if (!featuresSection) {
        return null;
    }

    const sectionData = {
        label: 'Psionic Disciplines',
        categories: [
            {classes: 'item-uses', label: 'DND5E.Uses'},
            {classes: 'item-recovery', label: 'DND5E.Recovery'},
            {classes: 'item-controls'}
        ]
    };

    try {
        const sectionHtml = await renderTemplate(
            `modules/${module_id}/templates/features/psionics/disciplines-section.hbs`,
            sectionData
        );

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sectionHtml;
        const section = tempDiv.firstElementChild;

        const otherSection = element.querySelector('[data-type="other"]');
        if (otherSection) {
            otherSection.parentNode.insertBefore(section, otherSection);
        } else {
            const sections = element.querySelectorAll('.items-section');
            const lastSection = sections[sections.length - 1];
            if (lastSection) {
                lastSection.parentNode.insertBefore(section, lastSection.nextSibling);
            } else {
                featuresSection.appendChild(section);
            }
        }

        return section;
    } catch (error) {
        logger.warn(`Failed to create Psionic Disciplines section: ${error}`);
        return null;
    }
}

export async function reorganizePsionicDisciplines(app, element, context, options) {
    if (!context.actor) {
        return;
    }

    if (context.actor.type !== 'character') {
        return;
    }

    if (!element.querySelector('.features-list')) {
        return;
    }

    const psionicDisciplines = context.actor.items.filter(isPsionicDiscipline);
    if (!psionicDisciplines.length) {
        return;
    }

    const otherFeaturesSection = element.querySelector('[data-type="other"]');
    const disciplinesSection = await createPsionicDisciplinesSection(element);
    if (!disciplinesSection) {
        return;
    }

    const itemList = disciplinesSection.querySelector('.item-list');

    psionicDisciplines
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(discipline => {
            const itemElement = element.querySelector(`[data-item-id="${discipline.id}"]`);
            if (!itemElement) {
                return;
            }

            itemElement.setAttribute('data-grouped', 'discipline');

            const subtitleElement = itemElement.querySelector('.item-row > .item-name .subtitle');
            if (subtitleElement && discipline.system.type?.subtype) {
                const disciplineSubtype = CONFIG.DND5E
                    .featureTypes?.discipline?.subtypes?.[discipline.system.type.subtype];
                if (disciplineSubtype) {
                    subtitleElement.textContent = disciplineSubtype;
                }
            }

            itemList.appendChild(itemElement);
        });

    if (!disciplinesSection.querySelector('.item-list li')) {
        disciplinesSection.remove();
    }

    if (otherFeaturesSection && !otherFeaturesSection.querySelector('.item-list li')) {
        otherFeaturesSection.remove();
    }
}
