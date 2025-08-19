import {logger} from '../../utils/logger';

/**
 * Tools Registration Feature
 * Registers custom tools and utilities
 */

import { registerTools } from './tools';

export function registerToolsFeature() {
    logger.info('Registering Tools');

    registerTools();
}
