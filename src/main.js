import {registerConditions} from './scripts/conditions';
import {registerSettings} from './settings/settings';
import {registerSoSlyActor} from "./sheets/actor";
import {registerTools} from './scripts/tools';
import {removeIdentifyButton} from './scripts/remove-identify';

Hooks.once('init', async () => {
    registerSettings();
    registerConditions();
    registerSoSlyActor();
    registerTools();
    removeIdentifyButton();
    console.log('SoSly 5e House Rules | Initialized');
});
