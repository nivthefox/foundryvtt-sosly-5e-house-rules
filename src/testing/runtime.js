export const EXPECTED_RUNTIME = Object.freeze({
    coreMajor: '13',
    systemId: 'dnd5e',
    systemVersion: '5.1.9',
    moduleId: 'sosly-5e-house-rules'
});

export function assertRuntime(runtime, expected = EXPECTED_RUNTIME) {
    const actualCoreMajor = runtime.coreVersion?.split('.')[0];
    const matches = actualCoreMajor === expected.coreMajor
        && runtime.systemId === expected.systemId
        && runtime.systemVersion === expected.systemVersion
        && runtime.moduleId === expected.moduleId
        && runtime.moduleActive === true;

    if (matches) {
        return;
    }

    throw new Error([
        'Foundry integration runtime mismatch.',
        `Expected Foundry ${expected.coreMajor}.x, ${expected.systemId} ${expected.systemVersion}, and active module ${expected.moduleId}.`,
        `Received Foundry ${runtime.coreVersion ?? 'unknown'}, ${runtime.systemId ?? 'unknown'} ${runtime.systemVersion ?? 'unknown'}, and module ${runtime.moduleId ?? 'missing'} (${runtime.moduleActive ? 'active' : 'inactive'}).`
    ].join(' '));
}
