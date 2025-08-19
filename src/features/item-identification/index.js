import {logger} from '../../utils/logger';

/**
 * Item Identification Feature
 * Manages item identification mechanics
 */

import { removeIdentifyButton } from './remove-identify';

export function registerItemIdentificationFeature() {
    logger.info('Registering Item Identification');

    removeIdentifyButton();
}
