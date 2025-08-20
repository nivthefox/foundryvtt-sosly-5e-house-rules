import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';

function isPsionicDiscipline(item) {
    return item.type === 'feat' && item.system.type?.value === 'discipline';
}

async function createPsionicDisciplinesSection(html) {
    const featuresSection = html.find('.features-list').first();
    if (!featuresSection.length) return null;

    const sectionData = {
        label: 'Psionic Disciplines',
        categories: [
            { classes: 'item-uses', label: 'DND5E.Uses' },
            { classes: 'item-recovery', label: 'DND5E.Recovery' },
            { classes: 'item-controls' }
        ]
    };

    try {
        const sectionHtml = await renderTemplate(
            `modules/${module_id}/templates/features/psionics/disciplines-section.hbs`,
            sectionData
        );

        const $section = $(sectionHtml);

        // Find insertion point
        const otherSection = html.find('[data-type="other"]').first();
        if (otherSection.length) {
            $section.insertBefore(otherSection);
        } else {
            const lastSection = html.find('.items-section').last();
            if (lastSection.length) {
                $section.insertAfter(lastSection);
            } else {
                featuresSection.append($section);
            }
        }

        return $section;
    } catch (error) {
        logger.warn(`Failed to create Psionic Disciplines section: ${error}`);
        return null;
    }
}

export async function reorganizePsionicDisciplines(app, html, data) {
    if (!data.actor) return;

    if (data.actor.type !== 'character') return;

    if (!html.find('.features-list').length) return;

    const psionicDisciplines = data.actor.items.filter(isPsionicDiscipline);
    if (!psionicDisciplines.length) return;

    const otherFeaturesSection = html.find('[data-type="other"]').first();
    const disciplinesSection = await createPsionicDisciplinesSection(html);
    if (!disciplinesSection) return;

    psionicDisciplines
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(discipline => {
            const itemElement = html.find(`[data-item-id="${discipline.id}"]`);
            if (itemElement.length) {
                itemElement.attr('data-grouped', 'discipline');

                // Set subtitle to just the discipline type (only the main item subtitle, not activity subtitles)
                const subtitleElement = itemElement.find('.item-row > .item-name .subtitle').first();
                if (subtitleElement.length && discipline.system.type?.subtype) {
                    const disciplineSubtype = CONFIG.DND5E
                        .featureTypes?.discipline?.subtypes?.[discipline.system.type.subtype];
                    if (disciplineSubtype) {
                        subtitleElement.text(disciplineSubtype);
                    }
                }

                itemElement.detach().appendTo(disciplinesSection.find('.item-list'));
            }
        });

    if (disciplinesSection.find('.item-list li').length === 0) {
        disciplinesSection.remove();
    }

    if (otherFeaturesSection.find('.item-list li').length === 0) {
        otherFeaturesSection.remove();
    }
}
