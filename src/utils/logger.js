/**
 * Centralized logging utility for SoSly House Rules module
 */
export const logger = {
    debug: msg => console.debug(`SoSly House Rules | ${msg}`),
    info: msg => console.info(`SoSly House Rules | ${msg}`),
    warn: msg => console.warn(`SoSly House Rules | ${msg}`),
    error: msg => console.error(`SoSly House Rules | ${msg}`)
};
