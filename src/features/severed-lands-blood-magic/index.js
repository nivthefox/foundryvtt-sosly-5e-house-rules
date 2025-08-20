/**
 * Severed Lands Blood Magic Feature
 * Automates blood magic mechanics including madness saves, blood surge, and hungry magic
 */

import { registerSeveredLandsBloodMagicSettings } from './settings';
import { registerSpellHandler } from './spell-handler';
import { registerRecoveryHandler } from './recovery';
import { registerChatHandler } from './chat-handler';

export function registerSeveredLandsBloodMagicFeature() {
    console.log('SoSly 5e House Rules | Registering Severed Lands Blood Magic');

    registerSeveredLandsBloodMagicSettings();
    registerSpellHandler();
    registerRecoveryHandler();
    registerChatHandler();
}
