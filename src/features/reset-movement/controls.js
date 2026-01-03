import {handleResetToTurnStart, handleStepBack} from './handler';

export function registerResetMovementControls(controls) {
    const tokenTools = controls.tokens?.tools;
    if (!tokenTools) {
        return;
    }

    const order = Object.keys(tokenTools).length;

    tokenTools.resetToTurnStart = {
        name: 'resetToTurnStart',
        title: 'sosly.reset-movement.reset-to-start',
        icon: 'fa-solid fa-rotate-left',
        button: true,
        order: order,
        onChange: handleResetToTurnStart
    };

    tokenTools.stepBack = {
        name: 'stepBack',
        title: 'sosly.reset-movement.step-back',
        icon: 'fa-solid fa-backward-step',
        button: true,
        order: order + 1,
        onChange: handleStepBack
    };
}
