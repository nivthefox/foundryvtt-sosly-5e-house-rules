import assert from 'node:assert/strict';
import test from 'node:test';

import {createAnimationFrameDebouncer, LightUnionCache} from './light-union-cache.js';

test('reuses a light union while its inputs remain unchanged', () => {
    const cache = new LightUnionCache();
    const sources = [createLight(), createLight({x: 200})];
    let builds = 0;
    const createUnion = () => ({build: ++builds});

    const first = cache.get('scene-a', 2, sources, createUnion);
    const second = cache.get('scene-a', 2, sources, createUnion);

    assert.equal(second, first);
    assert.equal(builds, 1);
});

test('rebuilds when scene, multiplier, or the applicable light set changes', () => {
    const cache = new LightUnionCache();
    const light = createLight();
    const sources = [light];
    let builds = 0;
    const createUnion = () => ++builds;

    cache.get('scene-a', 2, sources, createUnion);
    light.x = 150;
    cache.get('scene-a', 2, sources, createUnion);
    light.data.dim = 40;
    cache.get('scene-a', 2, sources, createUnion);
    light.active = false;
    cache.get('scene-a', 2, sources, createUnion);
    light.active = true;
    sources.push(createLight({x: 300}));
    cache.get('scene-a', 2, sources, createUnion);
    sources.pop();
    cache.get('scene-a', 2, sources, createUnion);
    cache.get('scene-a', 3, sources, createUnion);
    cache.get('scene-b', 3, sources, createUnion);

    assert.equal(builds, 8);
});

test('invalidation releases the cached light sources', () => {
    const cache = new LightUnionCache();
    const sources = [createLight()];
    let builds = 0;

    cache.get('scene-a', 2, sources, () => ++builds);
    cache.invalidate();
    cache.get('scene-a', 2, sources, () => ++builds);

    assert.equal(builds, 2);
});

test('coalesces refresh requests into one animation frame', () => {
    let scheduledCallback;
    let refreshes = 0;
    const debouncer = createAnimationFrameDebouncer(
        () => refreshes++,
        callback => {
            scheduledCallback = callback;
            return 1;
        },
        () => {}
    );

    debouncer.schedule();
    debouncer.schedule();
    debouncer.schedule();
    assert.equal(refreshes, 0);

    scheduledCallback();
    assert.equal(refreshes, 1);

    debouncer.schedule();
    scheduledCallback();
    assert.equal(refreshes, 2);
});

test('cancels a pending animation-frame refresh', () => {
    let cancelledFrame;
    let refreshes = 0;
    const debouncer = createAnimationFrameDebouncer(
        () => refreshes++,
        () => 42,
        frameId => cancelledFrame = frameId
    );

    debouncer.schedule();
    debouncer.cancel();

    assert.equal(cancelledFrame, 42);
    assert.equal(refreshes, 0);
});

function createLight({active = true, dim = 30, x = 100, y = 100} = {}) {
    return {
        active,
        data: {dim},
        x,
        y
    };
}
