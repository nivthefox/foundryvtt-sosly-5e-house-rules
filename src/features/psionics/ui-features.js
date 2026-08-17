const DISCIPLINE_GROUP = 'discipline';
const DISCIPLINE_SECTION_SELECTOR = '[data-sosly-section="psionic-disciplines"]';
const FEATURES_PART_SELECTOR = '[data-application-part="features"]';
const GROUP_KEYS = ['origin', 'activation'];

function isPsionicDiscipline(item) {
    return item.type === 'feat' && item.system.type?.value === 'discipline';
}

function getFeatureRows(featuresPart) {
    return Array.from(featuresPart.querySelectorAll('.item-list > [data-item-id]'));
}

function getNativeSection(featuresPart, groupOrigin) {
    const sections = Array.from(featuresPart.querySelectorAll('.items-section[data-group-origin]'));
    return sections.find(section => {
        return !section.matches(DISCIPLINE_SECTION_SELECTOR)
            && section.dataset.groupOrigin === groupOrigin;
    });
}

function preserveNativeGrouping(row) {
    for (const groupKey of GROUP_KEYS) {
        const groupAttribute = `data-group-${groupKey}`;
        const originalAttribute = `data-sosly-original-group-${groupKey}`;
        if (!row.hasAttribute(originalAttribute)) {
            row.setAttribute(originalAttribute, row.getAttribute(groupAttribute) ?? '');
        }
        row.setAttribute(groupAttribute, DISCIPLINE_GROUP);
    }
}

function restoreNativeGrouping(row, featuresPart) {
    for (const groupKey of GROUP_KEYS) {
        const groupAttribute = `data-group-${groupKey}`;
        const originalAttribute = `data-sosly-original-group-${groupKey}`;
        if (!row.hasAttribute(originalAttribute)) {
            continue;
        }

        const originalGroup = row.getAttribute(originalAttribute);
        if (originalGroup) {
            row.setAttribute(groupAttribute, originalGroup);
        } else {
            row.removeAttribute(groupAttribute);
        }
        row.removeAttribute(originalAttribute);
    }

    const targetSection = getNativeSection(featuresPart, row.dataset.groupOrigin ?? 'other')
        ?? getNativeSection(featuresPart, 'other');
    targetSection?.querySelector('.item-list')?.append(row);
}

function createDisciplineSection(featuresPart) {
    const featuresList = featuresPart.querySelector('[data-item-list="features"]');
    const referenceSection = getNativeSection(featuresPart, 'other')
        ?? featuresPart.querySelector('.items-section');
    const referenceHeader = referenceSection?.querySelector('.items-header');
    const referenceItemList = referenceSection?.querySelector('.item-list');
    if (!featuresList || !referenceSection || !referenceHeader || !referenceItemList) {
        return null;
    }

    const section = referenceSection.cloneNode(false);
    section.hidden = false;
    section.dataset.soslySection = 'psionic-disciplines';
    section.dataset.groupOrigin = DISCIPLINE_GROUP;
    section.dataset.groupActivation = DISCIPLINE_GROUP;

    const header = referenceHeader.cloneNode(true);
    const label = header.querySelector('.item-name');
    if (label) {
        label.textContent = 'Psionic Disciplines';
    }

    const itemList = referenceItemList.cloneNode(false);
    itemList.replaceChildren();
    section.append(header, itemList);
    referenceSection.before(section);
    return section;
}

function setDisciplineSubtitle(row, discipline) {
    const subtitle = row.querySelector('.item-row > .item-name .subtitle');
    const subtype = discipline.system.type?.subtype;
    if (!subtitle || !subtype) {
        return;
    }

    const label = CONFIG.DND5E.featureTypes?.discipline?.subtypes?.[subtype];
    if (label) {
        subtitle.textContent = label;
    }
}

function refreshInventorySections(featuresPart) {
    featuresPart.querySelector('.inventory-element')?._cacheSections?.();
}

export function reorganizePsionicDisciplines(app, element, context) {
    const actor = context.actor;
    if (!actor || actor.type !== 'character') {
        return;
    }

    const featuresPart = element.querySelector(FEATURES_PART_SELECTOR);
    if (!featuresPart) {
        return;
    }

    const disciplines = actor.items.filter(isPsionicDiscipline)
        .sort((left, right) => left.name.localeCompare(right.name));
    const disciplineIds = new Set(disciplines.map(discipline => discipline.id));
    const existingSections = Array.from(featuresPart.querySelectorAll(DISCIPLINE_SECTION_SELECTOR));

    for (const section of existingSections) {
        const rows = Array.from(section.querySelectorAll('.item-list > [data-item-id]'));
        for (const row of rows) {
            if (!disciplineIds.has(row.dataset.itemId)) {
                restoreNativeGrouping(row, featuresPart);
            }
        }
    }

    const matchingRows = getFeatureRows(featuresPart).filter(row => disciplineIds.has(row.dataset.itemId));
    if (!matchingRows.length) {
        for (const section of existingSections) {
            section.remove();
        }
        refreshInventorySections(featuresPart);
        return;
    }

    const disciplineSection = existingSections[0] ?? createDisciplineSection(featuresPart);
    if (!disciplineSection) {
        return;
    }

    const disciplineList = disciplineSection.querySelector('.item-list');
    for (const discipline of disciplines) {
        const rows = getFeatureRows(featuresPart).filter(row => row.dataset.itemId === discipline.id);
        const row = rows.find(candidate => candidate.closest(DISCIPLINE_SECTION_SELECTOR) === disciplineSection)
            ?? rows[0];
        if (!row) {
            continue;
        }

        for (const duplicate of rows) {
            if (duplicate !== row) {
                duplicate.remove();
            }
        }

        preserveNativeGrouping(row);
        setDisciplineSubtitle(row, discipline);
        disciplineList.append(row);
    }

    for (const duplicateSection of existingSections.slice(1)) {
        duplicateSection.remove();
    }

    if (!disciplineList.querySelector('[data-item-id]')) {
        disciplineSection.remove();
    }
    refreshInventorySections(featuresPart);
}
