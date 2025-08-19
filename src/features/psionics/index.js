import {logger} from '../../utils/logger';

/**
 * Psionics Registration Feature
 * Registers psionics and related utilities
 */

import { registerPsionics } from './psionics';

export function registerPsionicsFeature() {
    logger.info('Registering Psionics');

    registerPsionics();
}
