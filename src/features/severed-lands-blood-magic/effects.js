/**
 * Create madness effects based on blood magic
 */
export async function createMadnessEffect(actor, effectData) {
    const { effectType, duration, condition, ability, effectName } = effectData;

    let changes = [];
    let flags = {};
    let durationData = {};

    // Set up duration
    if (effectType === 'short-term') {
        if (duration === '1d10 rounds') {
            const roll = new Roll('1d10');
            await roll.evaluate();
            durationData = {
                rounds: roll.total,
                turns: null
            };
            flags['sosly.canRepeatSave'] = true;
        } else {
            const roll = new Roll('1d10');
            await roll.evaluate();
            durationData = {
                seconds: roll.total * 60
            };
        }
    } else if (effectType === 'long-term') {
        const isDays = duration.includes('days');
        const roll = new Roll('1d10');
        await roll.evaluate();

        durationData = {
            seconds: roll.total * (isDays ? 86400 : 3600)
        };
    }

    // Set up effect changes
    if (effectType === 'short-term' && condition) {
        flags['core.statusId'] = condition;

        switch (condition) {
            case 'frightened':
                changes.push({
                    key: 'system.bonuses.abilities.save',
                    mode: 2,
                    value: '-2'
                });
                break;
            case 'incapacitated':
                changes.push({
                    key: 'system.attributes.movement.all',
                    mode: 4,
                    value: '0'
                });
                break;
            case 'stunned':
                changes.push({
                    key: 'system.attributes.movement.all',
                    mode: 4,
                    value: '0'
                });
                changes.push({
                    key: 'system.bonuses.abilities.save',
                    mode: 2,
                    value: '-4'
                });
                break;
        }
    } else if (effectType === 'long-term' && ability) {
        changes.push({
            key: `flags.dnd5e.disadvantage.ability.check.${ability}`,
            mode: 4,
            value: '1'
        });
        changes.push({
            key: `flags.dnd5e.disadvantage.ability.save.${ability}`,
            mode: 4,
            value: '1'
        });
    }

    const effectConfig = {
        name: effectName,
        icon: 'icons/svg/terror.svg',
        origin: actor.uuid,
        disabled: false,
        duration: durationData,
        changes: changes,
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
