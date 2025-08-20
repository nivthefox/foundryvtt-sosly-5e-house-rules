/**
 * Create madness effects based on blood magic
 */
export async function createMadnessEffect(actor, effectData) {
    const { effectType, duration, condition, ability, effectName, durationRoll } = effectData;

    let changes = [];
    let flags = {};
    let durationData = {};
    let statuses = [];
    let icon = 'icons/svg/terror.svg';

    // Set up duration based on rolled value
    if (effectType === 'short-term') {
        if (duration === '1d10 rounds') {
            durationData = {
                rounds: durationRoll,
                combat: game.combat?.id || null,
                turns: null
            };
            flags['sosly.canRepeatSave'] = true;
        } else if (duration === '1d10 minutes') {
            durationData = {
                seconds: durationRoll * 60
            };
        }
    } else if (effectType === 'long-term') {
        if (duration === '1d10 hours') {
            durationData = {
                seconds: durationRoll * 3600
            };
        } else if (duration === '1d10 days') {
            durationData = {
                seconds: durationRoll * 86400
            };
        }
    }
    // Indefinite madness has no duration

    // Set up effect changes and statuses
    if (effectType === 'short-term' && condition) {
        statuses.push(condition);

        switch (condition) {
            case 'frightened':
                icon = 'icons/magic/control/fear-fright-monster-purple-blue.webp';
                break;
            case 'incapacitated':
                icon = 'icons/svg/paralysis.svg';
                break;
            case 'stunned':
                icon = 'icons/svg/daze.svg';
                break;
        }
    } else if (effectType === 'long-term' && ability) {
        changes.push({
            key: `flags.dnd5e.disadvantage.ability.check.${ability}`,
            mode: 5,
            value: '1'
        });
        changes.push({
            key: `flags.dnd5e.disadvantage.ability.save.${ability}`,
            mode: 5,
            value: '1'
        });
        icon = 'icons/magic/control/debuff-energy-hold-levitate-yellow.webp';
    } else if (effectType === 'indefinite') {
        icon = 'icons/magic/control/hypnosis-mesmerism-eye.webp';
    }

    const effectConfig = {
        name: effectName,
        icon: icon,
        origin: actor.uuid,
        disabled: false,
        duration: durationData,
        changes: changes,
        statuses: statuses,
        flags: flags
    };

    const effect = await actor.createEmbeddedDocuments('ActiveEffect', [effectConfig]);

    let chatContent = `<p><strong>${actor.name}</strong> gains a madness effect: <em>${effectName}</em></p>`;
    if (effectType === 'short-term' && flags['sosly.canRepeatSave']) {
        chatContent += '<p><em>Can repeat save at start of each turn</em></p>';
    }

    ChatMessage.create({
        content: chatContent,
        speaker: ChatMessage.getSpeaker({ actor })
    });

    return effect[0];
}
