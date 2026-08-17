import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {rollup} from 'rollup';

test('does not stack Argon wrappers under repeated initialization and panel registration', async () => {
    const listeners = new Map();
    const onceListeners = new Map();
    const registeredPanels = [];

    globalThis.game = {
        modules: new Map([
            ['enhancedcombathud', {active: true}]
        ])
    };
    globalThis.Hooks = {
        on(event, callback) {
            const callbacks = listeners.get(event) ?? [];
            callbacks.push(callback);
            listeners.set(event, callbacks);
        },
        once(event, callback) {
            const callbacks = onceListeners.get(event) ?? [];
            callbacks.push(callback);
            onceListeners.set(event, callbacks);
        }
    };

    const {registerArgonIntegration} = await loadArgonIntegration();
    registerArgonIntegration();

    class CoreHUD {}
    CoreHUD.defineMainPanels = panels => registeredPanels.push(...panels);

    const [initializeArgon] = listeners.get('argonInit');
    initializeArgon(CoreHUD);
    const defineMainPanels = CoreHUD.defineMainPanels;

    initializeArgon(CoreHUD);
    assert.equal(CoreHUD.defineMainPanels, defineMainPanels);
    assert.equal(onceListeners.get('renderCoreHUD').length, 1);

    class Panel {
        async _getButtons() {
            return [];
        }
    }

    CoreHUD.defineMainPanels([Panel]);
    const getButtons = Panel.prototype._getButtons;

    CoreHUD.defineMainPanels([Panel]);
    assert.equal(Panel.prototype._getButtons, getButtons);
    assert.deepEqual(registeredPanels, [Panel, Panel]);
});

async function loadArgonIntegration() {
    const bundle = await rollup({
        input: fileURLToPath(new URL('./ui-argon.js', import.meta.url))
    });
    const {output} = await bundle.generate({format: 'es'});
    await bundle.close();

    const encodedModule = Buffer.from(output[0].code).toString('base64');
    return import(`data:text/javascript;base64,${encodedModule}`);
}
