/**
 * Centralized logging utility for SoSly House Rules module
 */
export const logger = {
    debug: (...args) => console.debug('SoSly House Rules |', ...args),
    info: (...args) => console.info('SoSly House Rules |', ...args),
    warn: (...args) => console.warn('SoSly House Rules |', ...args),
    error: (...args) => console.error('SoSly House Rules |', ...args)
};
