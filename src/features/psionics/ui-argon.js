import { PSIONIC_SCHOOLS } from './ui-spellbook';

function isPsionicSpell(spell) {
    return spell.system.level === 99 && PSIONIC_SCHOOLS.includes(spell.system.school);
}

function getPowerPointCostRange(spell, actor) {
    if (!spell.system.activities) {
        return null;
    }

    const powerPointsItems = actor.items.filter(item => item.system.identifier === 'spell-points');
    if (!powerPointsItems.length) {
        return null;
    }

    const powerPointsIds = new Set(powerPointsItems.map(item => item.id));

    const costs = [];
    for (const activity of spell.system.activities) {
        if (!activity.consumption?.targets) {
            continue;
        }

        for (const target of activity.consumption.targets) {
            if (target.type === 'itemUses' && powerPointsIds.has(target.target)) {
                const cost = parseInt(target.value);
                if (!isNaN(cost)) {
                    costs.push(cost);
                }
            }
        }
    }

    if (costs.length === 0) {
        return null;
    }

    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);

    if (minCost === maxCost) {
        return `${minCost}`;
    }
    return `${minCost}-${maxCost}`;
}

function getParentDiscipline(spell, actor) {
    if (!game.modules.get('items-with-spells-5e')?.active) {
        return null;
    }

    const ItemsWithSpells5e = game.modules.get('items-with-spells-5e').api;
    if (!ItemsWithSpells5e) {
        return null;
    }

    const parentId = ItemsWithSpells5e.getSpellParentId(spell);
    if (!parentId) {
        return null;
    }

    const disciplineId = parentId.split('.').pop();
    return actor.items.get(disciplineId);
}

function groupPsionicsByDiscipline(categories) {
    if (!categories || !Array.isArray(categories)) {
        return categories;
    }

    const atWillIndex = categories.findIndex(c => c.label === 'DND5E.SpellPrepAtWill');
    if (atWillIndex === -1) {
        return categories;
    }

    const atWillCategory = categories[atWillIndex];
    const psionicButtons = [];
    const nonPsionicButtons = [];

    for (const button of atWillCategory.buttons) {
        if (!button.item) {
            nonPsionicButtons.push(button);
            continue;
        }

        if (isPsionicSpell(button.item)) {
            psionicButtons.push(button);
        } else {
            nonPsionicButtons.push(button);
        }
    }

    if (psionicButtons.length === 0) {
        return categories;
    }

    const disciplineGroups = new Map();
    for (const button of psionicButtons) {
        const parentDiscipline = getParentDiscipline(button.item, button.actor);

        if (!parentDiscipline) {
            nonPsionicButtons.push(button);
            continue;
        }

        if (!disciplineGroups.has(parentDiscipline.id)) {
            disciplineGroups.set(parentDiscipline.id, {
                label: parentDiscipline.name,
                buttons: [],
                uses: { max: Infinity, value: Infinity }
            });
        }

        disciplineGroups.get(parentDiscipline.id).buttons.push(button);
    }

    atWillCategory.buttons = nonPsionicButtons;

    const disciplineCategories = Array.from(disciplineGroups.values());
    categories.splice(atWillIndex, 0, ...disciplineCategories);

    return categories;
}

function updatePsionicButtonQuantities(component, element, actor) {
    if (!actor) {
        return;
    }

    const buttons = element.querySelectorAll('.feature-element');
    for (const button of buttons) {
        const img = button.style.backgroundImage;
        if (!img) {
            continue;
        }

        const imgUrl = img.slice(5, -2);
        const item = actor.items.find(i => i.img === imgUrl);
        if (!item || !isPsionicSpell(item)) {
            continue;
        }

        const costRange = getPowerPointCostRange(item, actor);
        if (costRange === null) {
            continue;
        }

        const quantitySpan = button.querySelector('.quantity-1 span');
        if (!quantitySpan) {
            continue;
        }

        quantitySpan.innerHTML = `<span class="psionic-cost">${costRange}</span>`;
    }
}

let buttonPanelButtonClass = null;

export function registerArgonIntegration() {
    if (!game.modules.get('enhancedcombathud')?.active) {
        return;
    }

    let DND5eButtonPanelButtonClass = null;

    Hooks.on('argonInit', CoreHUD => {
        const originalDefineMainPanels = CoreHUD.defineMainPanels;

        CoreHUD.defineMainPanels = function(panels) {
            originalDefineMainPanels.call(this, panels);

            Hooks.once('renderDND5eActionActionPanelArgonComponent', panel => {
                const spellButton = panel.buttons?.find(b => b.type === 'spell');
                if (!spellButton) {
                    return;
                }

                DND5eButtonPanelButtonClass = spellButton.constructor;
                const originalGetPanel = DND5eButtonPanelButtonClass.prototype._getPanel;

                DND5eButtonPanelButtonClass.prototype._getPanel = async function() {
                    if (this.type === 'spell' && this._spells) {
                        this._spells = groupPsionicsByDiscipline(this._spells);
                    }
                    return originalGetPanel.call(this);
                };
            });
        };
    });

    Hooks.on('renderAccordionPanelCategoryArgonComponent', updatePsionicButtonQuantities);
}
