import {id as module_id} from '../../../module.json';

/**
 * Madness Save Dialog for Blood Magic
 */
export async function showMadnessSaveDialog(actor, spellLevel) {
    const dc = 10 + spellLevel;
    const spellcastingAbility = actor.system.attributes.spellcasting || 'int';
    const abilityLabel = CONFIG.DND5E.abilities[spellcastingAbility]?.label || 'Intelligence';

    const content = game.i18n.format('sosly.severedLandsBloodMagic.save.content', {
        ability: abilityLabel,
        dc: dc
    });

    const renderedContent = await renderTemplate(`modules/${module_id}/templates/features/severed-lands-blood-magic/madness-save-dialog.hbs`, {
        content
    });

    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: {
            title: game.i18n.localize('sosly.severedLandsBloodMagic.save.title'),
        },
        content: renderedContent
    });

    if (!confirmed) {
        return null;
    }

    const result = await actor.rollAbilitySave(spellcastingAbility);

    return result;
}

/**
 * Show consequence choice dialog (Madness vs Exhaustion)
 */
export async function showConsequenceDialog() {
    const madnessLabel = game.i18n.localize('sosly.severedLandsBloodMagic.consequence.madness');
    const exhaustionLabel = game.i18n.localize('sosly.severedLandsBloodMagic.consequence.exhaustion');

    const content = await renderTemplate(`modules/${module_id}/templates/features/severed-lands-blood-magic/consequence-choice-dialog.hbs`, {
        message: game.i18n.localize('sosly.severedLandsBloodMagic.consequence.choose')
    });

    const result = await foundry.applications.api.DialogV2.wait({
        window: {
            title: game.i18n.localize('sosly.severedLandsBloodMagic.consequence.title'),
        },
        content: content,
        buttons: [
            {
                action: 'madness',
                label: madnessLabel,
                default: true,
                callback: () => 'madness'
            },
            {
                action: 'exhaustion',
                label: exhaustionLabel,
                callback: () => 'exhaustion'
            }
        ]
    });

    return result;
}

/**
 * Show DM madness selection dialog
 */
export async function showDMMadnessDialog(madnessPoints) {
    let effectType;
    let duration;
    let durationFormula;

    if (madnessPoints <= 2) {
        effectType = 'short-term';
        duration = '1d10 rounds';
        durationFormula = '1d10';
    } else if (madnessPoints <= 4) {
        effectType = 'short-term';
        duration = '1d10 minutes';
        durationFormula = '1d10';
    } else if (madnessPoints <= 6) {
        effectType = 'long-term';
        duration = '1d10 hours';
        durationFormula = '1d10';
    } else if (madnessPoints <= 8) {
        effectType = 'long-term';
        duration = '1d10 days';
        durationFormula = '1d10';
    } else {
        effectType = 'indefinite';
        duration = 'Permanent';
        durationFormula = null;
    }

    // Roll duration now
    let durationRoll = null;
    if (durationFormula) {
        const roll = new Roll(durationFormula);
        await roll.evaluate();
        durationRoll = roll.total;
    }

    const shortTermOptions = [
        { value: 'frightened', label: 'Frightened', description: 'Character is frightened of a creature or situation' },
        { value: 'incapacitated', label: 'Incapacitated', description: 'Character is overwhelmed and cannot take actions' },
        { value: 'stunned', label: 'Stunned', description: 'Character is stunned by horrifying visions' }
    ];

    const abilityOptions = Object.entries(CONFIG.DND5E.abilities).map(([key, config]) => ({
        value: key,
        label: config.label
    }));


    const durationText = durationRoll ? `${duration} (rolled: ${durationRoll})` : duration;

    const templateData = {
        madnessPoints,
        effectTypeLabel: game.i18n.localize(`sosly.severedLandsBloodMagic.dmSelect.${effectType}`),
        durationText,
        isShortTerm: effectType === 'short-term',
        isLongTerm: effectType === 'long-term',
        conditionOptions: effectType === 'short-term' ? shortTermOptions : null,
        abilityOptions: effectType === 'long-term' ? abilityOptions : null,
        defaultEffectName: `Madness: ${effectType === 'short-term' ? 'Frightened' : effectType === 'long-term' ? 'Ability Impaired' : 'Indefinite'}`
    };

    const content = await renderTemplate(`modules/${module_id}/templates/features/severed-lands-blood-magic/dm-madness-selection-dialog.hbs`, templateData);

    const result = await foundry.applications.api.DialogV2.wait({
        window: {
            title: game.i18n.localize('sosly.severedLandsBloodMagic.dmSelect.title'),
        },
        content: content,
        buttons: [
            {
                action: 'ok',
                label: 'Create Effect',
                default: true,
                callback: (event, button, dialog) => {
                    const formData = new FormData(dialog.querySelector('form'));
                    return {
                        effectType,
                        duration,
                        durationRoll,
                        condition: formData.get('condition'),
                        ability: formData.get('ability'),
                        effectName: formData.get('effectName') || `Madness: ${effectType}`
                    };
                }
            },
            {
                action: 'cancel',
                label: 'Cancel',
                callback: () => false
            }
        ],
        render: (event, dialog) => {
            // Set up event listeners after dialog renders
            const conditionSelect = dialog.querySelector('select[name="condition"]');
            const abilitySelect = dialog.querySelector('select[name="ability"]');
            const effectNameInput = dialog.querySelector('#effectName');

            if (conditionSelect && effectNameInput) {
                conditionSelect.addEventListener('change', function() {
                    const condition = this.value;
                    if (condition) {
                        const capitalizedCondition = condition.charAt(0).toUpperCase() + condition.slice(1);
                        effectNameInput.value = `Madness: ${capitalizedCondition}`;
                    }
                });
            }

            if (abilitySelect && effectNameInput) {
                abilitySelect.addEventListener('change', function() {
                    const ability = this.value;
                    if (ability) {
                        const abilityLabel = this.options[this.selectedIndex].text;
                        effectNameInput.value = `Madness: ${abilityLabel} Impaired`;
                    }
                });
            }
        }
    });

    return result;
}
