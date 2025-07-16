import {registerBreatherFeature} from './features/breather/index';
import {registerNetworthFeature} from './features/networth/index';
import {registerMadnessFeature} from './features/madness/index';
import {registerImperiledFeature} from './features/imperiled/index';
import {registerConcentrationFeature} from './features/concentration/index';
import {registerMultipleConcentrationFeature} from './features/multiple-concentration/index';
import {registerRestEnhancementsFeature} from './features/rest-enhancements/index';
import {registerToolsFeature} from './features/tools/index';
import {registerItemIdentificationFeature} from './features/item-identification/index';
import {registerEncumbranceFeature} from './features/encumbrance/index';

Hooks.once('init', async () => {
    registerEncumbranceFeature();
    registerBreatherFeature();
    registerNetworthFeature();
    registerMadnessFeature();
    registerImperiledFeature();
    registerConcentrationFeature();
    registerMultipleConcentrationFeature();
    registerRestEnhancementsFeature();
    registerToolsFeature();
    registerItemIdentificationFeature();
    console.log('SoSly 5e House Rules | Initialized');
});
