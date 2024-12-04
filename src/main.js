import {registerConditions} from './scripts/conditions';
import {registerSoSlyActor} from "./sheets/actor";
import {registerTools} from './scripts/tools';
import {removeIdentifyButton} from './scripts/remove-identify';

Hooks.once('init', async () => {
    registerConditions();
    registerSoSlyActor();
    registerTools();
    removeIdentifyButton();
});
