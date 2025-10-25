import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';

/**
 * Vision-5e Compatibility Feature
 * Patches vision-5e to allow our custom vision mode (Low-Light Vision)
 */

export function registerVision5eCompatibility() {
    if (!game.modules.get('vision-5e')?.active) {
        return;
    }

    logger.info('Registering Vision-5e Compatibility');

    wrapTokenDocumentPrepareSight();

    Hooks.on('renderTokenHUD', (hud, html) => {
        patchVisionModesList(hud, html);
    });
}

function wrapTokenDocumentPrepareSight() {
    libWrapper.register(module_id, 'CONFIG.Token.documentClass.prototype._prepareSight', function(wrapped, ...args) {
        const result = wrapped(...args);

        const sourceVisionMode = this._source?.sight?.visionMode;

        if (this.sight.enabled && sourceVisionMode === 'lowLight') {
            this.sight.range = this._source.sight.range;
            this.sight.angle = this._source.sight.angle;
            this.sight.visionMode = sourceVisionMode;
            this.sight.color = this._source.sight.color !== null ? Color.from(this._source.sight.color) : null;
            this.sight.attenuation = this._source.sight.attenuation;
            this.sight.brightness = this._source.sight.brightness;
            this.sight.saturation = this._source.sight.saturation;
            this.sight.contrast = this._source.sight.contrast;
            this.sight.detectionMode = 'lightPerception';
        }

        return result;
    }, 'WRAPPER');

    logger.info('Wrapped TokenDocument._prepareSight for custom vision modes');
}

function patchVisionModesList(hud, html) {
    const visionModesList = html[0].querySelector('.vision-5e.vision-modes');
    if (!visionModesList) {
        return;
    }

    const token = hud.object.document;
    const customModes = [];

    if (CONFIG.Canvas.visionModes.lowLight && hasDetectionMode(token, 'lightPerception')) {
        customModes.push({
            id: 'lowLight',
            mode: CONFIG.Canvas.visionModes.lowLight
        });
    }

    if (!customModes.length) {
        return;
    }

    for (const {id, mode} of customModes) {
        const isActive = token.sight.visionMode === id;
        const modeElement = document.createElement('div');
        modeElement.className = `vision-5e vision-mode${isActive ? ' active' : ''} flexrow`;
        modeElement.dataset.visionMode = id;
        modeElement.innerHTML = `<span class="vision-5e vision-mode-label">${game.i18n.localize(mode.label)}</span>`;

        modeElement.addEventListener('click', event => {
            event.preventDefault();
            token.updateVisionMode(id);
            hud.clear();
        });

        visionModesList.appendChild(modeElement);
    }
}

function hasDetectionMode(token, detectionId) {
    if (!token.detectionModes) {
        return false;
    }
    return token.detectionModes.some(mode =>
        mode.id === detectionId && mode.enabled && (mode.range === null || mode.range > 0)
    );
}
