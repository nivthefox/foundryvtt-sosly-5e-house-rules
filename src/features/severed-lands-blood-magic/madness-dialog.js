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
    let effectType; let duration;

    if (madnessPoints <= 2) {
        effectType = 'short-term';
        duration = '1d10 rounds';
    } else if (madnessPoints <= 4) {
        effectType = 'short-term';
        duration = '1d10 minutes';
    } else if (madnessPoints <= 6) {
        effectType = 'long-term';
        duration = '1d10 hours';
    } else if (madnessPoints <= 8) {
        effectType = 'long-term';
        duration = '1d10 days';
    } else {
        effectType = 'indefinite';
        duration = 'Permanent';
    }

    const shortTermOptions = [
        { value: 'frightened', label: 'Frightened' },
        { value: 'incapacitated', label: 'Incapacitated' },
        { value: 'stunned', label: 'Stunned' }
    ];

    const abilityOptions = Object.entries(CONFIG.DND5E.abilities).map(([key, config]) => ({
        value: key,
        label: config.label
    }));

    let conditionOptions = '';
    let abilitySelect = '';

    if (effectType === 'short-term') {
        conditionOptions = shortTermOptions.map(opt =>
            `<option value="${opt.value}">${opt.label}</option>`
        ).join('');
    } else if (effectType === 'long-term') {
        abilitySelect = abilityOptions.map(opt =>
            `<option value="${opt.value}">${opt.label}</option>`
        ).join('');
    }

    const content = `
        <div>
            <p><strong>Effect Type:</strong> ${game.i18n.localize(`sosly.severedLandsBloodMagic.dmSelect.${effectType}`)}</p>
            <p><strong>Duration:</strong> ${duration}</p>
            
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
                <input type="text" name="effectName" placeholder="Custom madness effect name" />
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
                label: 'OK',
                default: true,
                callback: (event, button, dialog) => {
                    const formData = new FormData(dialog.querySelector('form'));
                    return {
                        effectType,
                        duration,
                        condition: formData.get('condition'),
                        ability: formData.get('ability'),
                        effectName: formData.get('effectName') || `${effectType} Madness`
                    };
                }
            },
            {
                action: 'cancel',
                label: 'Cancel',
                callback: () => null
            }
        ]
    });

    return result;
}
