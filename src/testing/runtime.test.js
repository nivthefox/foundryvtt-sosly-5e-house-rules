import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {assertRuntime, EXPECTED_RUNTIME} from './runtime.js';

describe('Foundry integration runtime', () => {
    it('accepts the declared runtime', () => {
        assert.doesNotThrow(() => assertRuntime({
            coreVersion: '13.350',
            systemId: EXPECTED_RUNTIME.systemId,
            systemVersion: EXPECTED_RUNTIME.systemVersion,
            moduleId: EXPECTED_RUNTIME.moduleId,
            moduleActive: true
        }));
    });

    it('reports every mismatched runtime value', () => {
        assert.throws(() => assertRuntime({
            coreVersion: '12.343',
            systemId: 'dnd5e',
            systemVersion: '4.4.4',
            moduleId: EXPECTED_RUNTIME.moduleId,
            moduleActive: false
        }), error => {
            assert.match(error.message, /Expected Foundry 13\.x, dnd5e 5\.2\.5/);
            assert.match(error.message, /Received Foundry 12\.343, dnd5e 4\.4\.4/);
            assert.match(error.message, /inactive/);
            return true;
        });
    });
});
