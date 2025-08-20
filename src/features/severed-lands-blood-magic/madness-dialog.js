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

    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: {
            title: game.i18n.localize('sosly.severedLandsBloodMagic.save.title'),
        },
        content: `<p>${content}</p>`
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

    const content = `
        <div style="text-align: center; margin: 20px 0;">
            <p>${game.i18n.localize('sosly.severedLandsBloodMagic.consequence.choose')}</p>
        </div>
    `;

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
    let effectType; let duration; let durationFormula;

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

    let conditionOptions = '';
    let abilitySelect = '';

    if (effectType === 'short-term') {
        conditionOptions = shortTermOptions.map(opt =>
            `<option value="${opt.value}">${opt.label} - ${opt.description}</option>`
        ).join('');
    } else if (effectType === 'long-term') {
        abilitySelect = abilityOptions.map(opt =>
            `<option value="${opt.value}">${opt.label}</option>`
        ).join('');
    }

    const durationText = durationRoll ? `${duration} (rolled: ${durationRoll})` : duration;

    const content = `
        <div>
            <p><strong>Madness Level:</strong> ${madnessPoints}</p>
            <p><strong>Effect Type:</strong> ${game.i18n.localize(`sosly.severedLandsBloodMagic.dmSelect.${effectType}`)}</p>
            <p><strong>Duration:</strong> ${durationText}</p>
            
            ${effectType === 'short-term' ? `
                <div class="form-group">
                    <label>Condition Type:</label>
                    <select name="condition">${conditionOptions}</select>
                </div>
            ` : ''}
            
            ${effectType === 'long-term' ? `
                <div class="form-group">
                    <label>Ability (Disadvantage):</label>
                    <select name="ability">${abilitySelect}</select>
                </div>
            ` : ''}
            
            <div class="form-group">
                <label>Effect Name:</label>
                <input type="text" name="effectName" id="effectName" placeholder="Custom madness effect name" value="Madness: ${effectType === 'short-term' ? 'Frightened' : effectType === 'long-term' ? 'Ability Impaired' : 'Indefinite'}" />
            </div>
        </div>
    `;

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
