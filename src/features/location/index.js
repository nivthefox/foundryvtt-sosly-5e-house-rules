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
