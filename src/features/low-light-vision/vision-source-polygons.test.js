import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import json from '@rollup/plugin-json';
import {rollup} from 'rollup';

const PointVisionSource = await installVisionSourcePolygonPatch();

test('clears an obsolete extension when the current low-light calculation has no result', () => {
    const originalLight = {id: 'original-light'};
    const originalRestricted = {id: 'original-restricted'};
    const obsoleteExtension = {id: 'obsolete-extension'};
    const source = new PointVisionSource('lowLight', originalLight, originalRestricted);
    source._lowLightExtendedPolygon = obsoleteExtension;

    assert.equal(source._createLightPolygon(), originalLight);
    assert.equal(source._lowLightExtendedPolygon, null);
    assert.equal(source._createRestrictedPolygon(), originalRestricted);
});

test('clears the stored extension when the source leaves low-light mode', () => {
    const originalLight = {id: 'original-light'};
    const originalRestricted = {id: 'original-restricted'};
    const obsoleteExtension = {id: 'obsolete-extension'};
    const source = new PointVisionSource('basic', originalLight, originalRestricted);
    source._lowLightExtendedPolygon = obsoleteExtension;

    assert.equal(source._createLightPolygon(), originalLight);
    assert.equal(source._lowLightExtendedPolygon, null);
    assert.equal(source._createRestrictedPolygon(), originalRestricted);
});

test('cannot restore an obsolete extension after returning to low-light mode', () => {
    const originalLight = {id: 'original-light'};
    const originalRestricted = {id: 'original-restricted'};
    const obsoleteExtension = {id: 'obsolete-extension'};
    const source = new PointVisionSource('basic', originalLight, originalRestricted);
    source._lowLightExtendedPolygon = obsoleteExtension;

    source._createLightPolygon();
    source.visionMode = {id: 'lowLight'};

    assert.equal(source._createRestrictedPolygon(), originalRestricted);
});

async function installVisionSourcePolygonPatch() {
    let setupHook;

    class TestPointVisionSource {
        constructor(mode, originalLight, originalRestricted) {
            this.visionMode = {id: mode};
            this.originalLight = originalLight;
            this.originalRestricted = originalRestricted;
        }

        _createLightPolygon() {
            return this.originalLight;
        }

        _createRestrictedPolygon() {
            return this.originalRestricted;
        }
    }

    class VisionMode {}
    VisionMode.LIGHTING_VISIBILITY = {REQUIRED: 'required'};

    globalThis.foundry = {
        canvas: {
            perception: {VisionMode},
            sources: {PointVisionSource: TestPointVisionSource}
        }
    };
    globalThis.game = {
        settings: {
            get(moduleId, setting) {
                return setting === 'low-light-vision' ? true : 2;
            },
            register() {}
        }
    };
    globalThis.Hooks = {
        on() {},
        once(event, callback) {
            if (event === 'setup') {
                setupHook = callback;
            }
        }
    };
    globalThis.CONFIG = {
        Canvas: {
            detectionModes: {
                lightPerception: {
                    _testPoint() {
                        return false;
                    }
                }
            },
            visionModes: {}
        }
    };
    globalThis.canvas = {effects: {lightSources: null, visionSources: []}};
    globalThis.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = () => {};

    const bundle = await rollup({
        input: fileURLToPath(new URL('./index.js', import.meta.url)),
        plugins: [json()]
    });
    const {output} = await bundle.generate({format: 'es'});
    await bundle.close();

    const encodedModule = Buffer.from(output[0].code).toString('base64');
    const lowLightVision = await import(`data:text/javascript;base64,${encodedModule}`);
    lowLightVision.registerLowLightVisionFeature();
    setupHook();

    return TestPointVisionSource;
}
