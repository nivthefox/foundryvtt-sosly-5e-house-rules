import {chromium} from "@playwright/test";
import {cleanupChatMessages, cleanupTestActors, loginUser} from "./foundry-helpers.js";

/**
 * Global setup  that runs once before all tests begin
 * Ensures the Foundry VTT environment is ready for testing
 */
export default async function globalTeardown(cfg) {
    console.log('Running global setup...');
}
