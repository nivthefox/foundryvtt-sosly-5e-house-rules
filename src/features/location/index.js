import {logger} from '../../utils/logger';
import {registerLocationSettings} from './settings';
import {LocationData} from './data-model';
import {LocationSheet} from './sheet';

export function registerLocationFeature() {
    if (!game.settings.get('sosly-5e-house-rules', 'location.enabled')) {
        return;
    }

    logger.info('Registering Location Actor Subtype');

    const moduleID = 'sosly-5e-house-rules';
    const typeLocation = 'sosly-5e-house-rules.location';

    Object.assign(CONFIG.Actor.dataModels, {
        [typeLocation]: LocationData
    });

    CONFIG.Actor.typeLabels.location = 'sosly.location.actorType';

    Actors.registerSheet(moduleID, LocationSheet, {
        types: [typeLocation],
        makeDefault: true,
        label: 'sosly.location.sheet'
    });
}

Hooks.once('init', () => {
    registerLocationSettings();
});

Hooks.on('dnd5e.dropItemSheetData', (containerItem, sheet, data) => {
    if (containerItem.parent?.type !== 'sosly-5e-house-rules.location') {
        return;
    }
    
    const processAsync = async () => {
        const droppedItem = await Item.implementation.fromDropData(data);
        if (!droppedItem) {
            return;
        }
        
        if (droppedItem.parent?.id === containerItem.parent?.id) {
            await droppedItem.update({'system.container': containerItem.id});
        }
    };
    
    processAsync();
    return false;
});
