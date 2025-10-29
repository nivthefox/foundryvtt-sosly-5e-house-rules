import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';

/**
 * Levels Region Visibility Feature
 * Filters region visibility based on current elevation from the Levels module
 */

export function registerLevelsRegionVisibilityFeature() {
    if (!game.modules.get('levels')?.active) {
        return;
    }

    logger.info('Registering Levels Region Visibility');

    Hooks.once('ready', () => {
        wrapRegionIsVisible();
        registerLevelsPerspectiveHook();
    });
}

function wrapRegionIsVisible() {
    libWrapper.register(module_id, 'CONFIG.Region.objectClass.prototype.isVisible', function(wrapped, ...args) {
        const coreResult = wrapped(...args);

        if (!coreResult) {
            return false;
        }

        if (!CONFIG.Levels?.currentToken) {
            return true;
        }

        const currentElevation = CONFIG.Levels.currentToken.losHeight;
        if (currentElevation === undefined || currentElevation === null) {
            return true;
        }

        const regionBottom = this.bottom;
        const regionTop = this.top;

        if (!Number.isFinite(regionBottom) && !Number.isFinite(regionTop)) {
            return true;
        }

        const bottom = Number.isFinite(regionBottom) ? regionBottom : -Infinity;
        const top = Number.isFinite(regionTop) ? regionTop : Infinity;

        return currentElevation >= bottom && currentElevation <= top;
    }, 'WRAPPER');

    logger.info('Wrapped Region.isVisible for elevation-based visibility');
}

function registerLevelsPerspectiveHook() {
    Hooks.on('levelsPerspectiveChanged', () => {
        refreshRegions();
    });

    Hooks.on('updateToken', (token, updates) => {
        if (!('elevation' in updates)) {
            return;
        }

        if (!CONFIG.Levels?.currentToken) {
            return;
        }

        if (token.id !== CONFIG.Levels.currentToken.id) {
            return;
        }

        refreshRegions();
    });

    logger.info('Registered hooks for region refresh on elevation change');
}

function refreshRegions() {
    if (!canvas.regions?.placeables) {
        return;
    }

    for (const region of canvas.regions.placeables) {
        region.renderFlags.set({refreshState: true});
    }
}
