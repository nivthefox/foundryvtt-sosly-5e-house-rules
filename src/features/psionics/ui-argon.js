import { PSIONIC_SCHOOLS, getPowerLimit, getMinimumPowerPointCost } from './ui-spellbook';

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
    let actor = null;

    for (const button of atWillCategory.buttons) {
        if (!button.item) {
            nonPsionicButtons.push(button);
            continue;
        }

        if (isPsionicSpell(button.item)) {
            if (!actor) {
                actor = button.actor;
            }
            psionicButtons.push(button);
        } else {
            nonPsionicButtons.push(button);
        }
    }

    if (psionicButtons.length === 0) {
        return categories;
    }

    const powerLimit = getPowerLimit(actor);
    const disciplineGroups = new Map();

    for (const button of psionicButtons) {
        const minCost = getMinimumPowerPointCost(button.item, button.actor);
        if (powerLimit !== null && minCost !== null && minCost > powerLimit) {
            continue;
        }

        const parentDiscipline = getParentDiscipline(button.item, button.actor);

        if (!parentDiscipline) {
            nonPsionicButtons.push(button);
            continue;
        }

        if (!disciplineGroups.has(parentDiscipline.id)) {
            const powerPoints = button.actor.items.find(item => item.system.identifier === 'spell-points');

            const uses = powerPoints
                ? {
                    max: powerPoints.system.uses.max,
                    value: powerPoints.system.uses.max - powerPoints.system.uses.spent
                }
                : { max: Infinity, value: Infinity };

            disciplineGroups.set(parentDiscipline.id, {
                label: parentDiscipline.name,
                buttons: [],
                uses
            });
        }

        disciplineGroups.get(parentDiscipline.id).buttons.push(button);
    }

    atWillCategory.buttons = nonPsionicButtons;

    const disciplineCategories = Array.from(disciplineGroups.values());
    categories.splice(atWillIndex, 0, ...disciplineCategories);

    return categories.filter(category => category.buttons.length > 0);
}

function updatePsionicButtonQuantities(component, element, actor) {
    if (!actor) {
        return;
    }

    const buttons = element.querySelectorAll('.feature-element');
    let hasPsionicButtons = false;

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

        hasPsionicButtons = true;

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

    if (!hasPsionicButtons) {
        return;
    }

    const slotsContainer = element.querySelector('.feature-spell-slots');
    if (!slotsContainer) {
        return;
    }

    const powerPoints = actor.items.find(item => item.system.identifier === 'spell-points');
    if (!powerPoints) {
        return;
    }

    const current = powerPoints.system.uses.max - powerPoints.system.uses.spent;
    const max = powerPoints.system.uses.max;

    slotsContainer.innerHTML = `<span class="power-point-pool">${current}/${max} power points</span>`;
}

function hasPsionicSpells(actor) {
    if (!actor?.items) {
        return false;
    }
    return actor.items.some(item => isPsionicSpell(item));
}

function splitPsionicItems(items, actor) {
    if (!hasPsionicSpells(actor)) {
        return { psionicItems: [], nonPsionicItems: items };
    }

    const psionicItems = [];
    const nonPsionicItems = [];
    const powerLimit = getPowerLimit(actor);

    for (const item of items) {
        if (isPsionicSpell(item)) {
            const minCost = getMinimumPowerPointCost(item, actor);
            if (powerLimit === null || minCost === null || minCost <= powerLimit) {
                psionicItems.push(item);
            }
        } else {
            nonPsionicItems.push(item);
        }
    }

    return { psionicItems, nonPsionicItems };
}

function processPanelButtons(buttons, actor, buttonClass) {
    if (!hasPsionicSpells(actor)) {
        return buttons;
    }

    const spellButtonIndex = buttons.findIndex(b => b.type === 'spell');
    if (spellButtonIndex === -1) {
        return buttons;
    }

    const spellButton = buttons[spellButtonIndex];
    const { psionicItems, nonPsionicItems } = splitPsionicItems(spellButton.items, actor);

    if (psionicItems.length === 0) {
        return buttons;
    }

    if (nonPsionicItems.length === 0) {
        buttons.splice(spellButtonIndex, 1);
    } else {
        spellButton.items = nonPsionicItems;
        spellButton._spells = spellButton.prePrepareSpells();
    }

    const psionicButton = new buttonClass({
        type: 'psionic',
        items: psionicItems,
        color: spellButton.color
    });

    buttons.splice(spellButtonIndex + (nonPsionicItems.length === 0 ? 0 : 1), 0, psionicButton);

    return buttons;
}

export function registerArgonIntegration() {
    if (!game.modules.get('enhancedcombathud')?.active) {
        return;
    }

    let DND5eButtonPanelButtonClass = null;
    let buttonClassPatched = false;
    let needsFirstRerender = false;

    function patchButtonClass(buttonClass) {
        if (buttonClassPatched || !buttonClass) {
            return;
        }
        buttonClassPatched = true;
        DND5eButtonPanelButtonClass = buttonClass;

        const originalPrePrepareSpells = DND5eButtonPanelButtonClass.prototype.prePrepareSpells;
        DND5eButtonPanelButtonClass.prototype.prePrepareSpells = function() {
            if (this.type === 'psionic') {
                this.type = 'spell';
                const result = originalPrePrepareSpells.call(this);
                this.type = 'psionic';
                return result;
            }
            return originalPrePrepareSpells.call(this);
        };

        const originalGetPanel = DND5eButtonPanelButtonClass.prototype._getPanel;
        DND5eButtonPanelButtonClass.prototype._getPanel = async function() {
            if (this.type === 'psionic') {
                if (this._spells) {
                    this._spells = groupPsionicsByDiscipline(this._spells);
                }
                this.type = 'spell';
                const result = await originalGetPanel.call(this);
                this.type = 'psionic';
                return result;
            }
            return originalGetPanel.call(this);
        };

        const labelDescriptor = Object.getOwnPropertyDescriptor(DND5eButtonPanelButtonClass.prototype, 'label');
        Object.defineProperty(DND5eButtonPanelButtonClass.prototype, 'label', {
            get() {
                if (this.type === 'psionic') {
                    return 'Manifest Power';
                }
                return labelDescriptor.get.call(this);
            }
        });

        const iconDescriptor = Object.getOwnPropertyDescriptor(DND5eButtonPanelButtonClass.prototype, 'icon');
        Object.defineProperty(DND5eButtonPanelButtonClass.prototype, 'icon', {
            get() {
                if (this.type === 'psionic') {
                    return 'icons/svg/sun.svg';
                }
                return iconDescriptor.get.call(this);
            }
        });
    }

    Hooks.on('argonInit', CoreHUD => {
        const originalDefineMainPanels = CoreHUD.defineMainPanels;

        CoreHUD.defineMainPanels = function(panels) {
            originalDefineMainPanels.call(this, panels);

            for (const PanelClass of panels) {
                if (!PanelClass.prototype._getButtons) {
                    continue;
                }

                const originalGetButtons = PanelClass.prototype._getButtons;
                PanelClass.prototype._getButtons = async function() {
                    const buttons = await originalGetButtons.call(this);

                    if (!buttonClassPatched && buttons.length > 0) {
                        const spellButton = buttons.find(b => b.type === 'spell');
                        if (spellButton) {
                            needsFirstRerender = true;
                            patchButtonClass(spellButton.constructor);
                        }
                    }

                    if (!DND5eButtonPanelButtonClass) {
                        return buttons;
                    }
                    return processPanelButtons(buttons, this.actor, DND5eButtonPanelButtonClass);
                };
            }
        };

        Hooks.once('renderCoreHUD', (app, html, data) => {
            if (needsFirstRerender) {
                for (const panel of app.components.main) {
                    panel.render(true);
                }
                needsFirstRerender = false;
            }
        });
    });

    Hooks.on('renderAccordionPanelCategoryArgonComponent', updatePsionicButtonQuantities);
}
