import {registerSoSlyActor} from "./sheets/actor";
import {registerBreatherFeature} from './features/breather/index';
import {registerNetworthFeature} from './features/networth/index';
import {registerMadnessFeature} from './features/madness/index';
import {registerImperiledFeature} from './features/imperiled/index';
import {registerConcentrationFeature} from './features/concentration/index';
import {registerRestEnhancementsFeature} from './features/rest-enhancements/index';
import {registerToolsFeature} from './features/tools/index';
import {registerItemIdentificationFeature} from './features/item-identification/index';

Hooks.once('init', async () => {
    registerSoSlyActor();
    registerBreatherFeature();
    registerNetworthFeature();
    registerMadnessFeature();
    registerImperiledFeature();
    registerConcentrationFeature();
    registerRestEnhancementsFeature();
    registerToolsFeature();
    registerItemIdentificationFeature();
    console.log('SoSly 5e House Rules | Initialized');
});
