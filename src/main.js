import {registerConditions} from './scripts/conditions';
import {registerSoSlyActor} from "./sheets/actor";
import {registerTools} from './scripts/tools';
import {removeIdentifyButton} from './scripts/remove-identify';
import {addBreather} from "./scripts/add-breather";

Hooks.once('init', async () => {
    addBreather();
    registerConditions();
    registerSoSlyActor();
    registerTools();
    removeIdentifyButton();
});
