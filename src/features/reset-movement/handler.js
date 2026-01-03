import {id as module_id} from '../../../module.json';
import {showApprovalDialog} from './dialog';

function getValidatedToken() {
    const controlled = canvas.tokens?.controlled ?? [];

    if (controlled.length === 0) {
        ui.notifications.warn(game.i18n.localize('sosly.reset-movement.select-token'));
        return null;
    }

    if (controlled.length > 1) {
        ui.notifications.warn(game.i18n.localize('sosly.reset-movement.select-one-token'));
        return null;
    }

    const token = controlled[0];

    if (token.document.movementHistory.length === 0) {
        ui.notifications.info(game.i18n.localize('sosly.reset-movement.no-movement'));
        return null;
    }

    return token;
}

function hasActiveGM() {
    return game.users.some(u => u.isGM && u.active);
}

function sendResetRequest(token, mode) {
    if (!token.document.isOwner) {
        ui.notifications.warn(game.i18n.localize('sosly.reset-movement.not-owner'));
        return;
    }

    if (!hasActiveGM()) {
        ui.notifications.warn(game.i18n.localize('sosly.reset-movement.no-gm'));
        return;
    }

    game.socket.emit(`module.${module_id}`, {
        action: 'resetMovementRequest',
        tokenId: token.document.id,
        sceneId: token.document.parent.id,
        mode: mode,
        userId: game.user.id,
        userName: game.user.name,
        tokenName: token.document.name
    });

    ui.notifications.info(game.i18n.localize('sosly.reset-movement.request-sent'));
}

export async function handleResetToTurnStart() {
    const token = getValidatedToken();
    if (!token) {
        return;
    }

    if (game.user.isGM) {
        await token.document.revertRecordedMovement();
    } else {
        sendResetRequest(token, 'turnStart');
    }
}

export async function handleStepBack() {
    const token = getValidatedToken();
    if (!token) {
        return;
    }

    const lastMovementId = token.document.movementHistory.at(-1)?.movementId;

    if (game.user.isGM) {
        await token.document.revertRecordedMovement(lastMovementId);
    } else {
        sendResetRequest(token, 'stepBack');
    }
}

async function executeReset(sceneId, tokenId, mode) {
    const scene = game.scenes.get(sceneId);
    const token = scene?.tokens.get(tokenId);

    if (!token) {
        return false;
    }

    if (mode === 'turnStart') {
        return token.revertRecordedMovement();
    } else {
        const lastMovementId = token.movementHistory.at(-1)?.movementId;
        return token.revertRecordedMovement(lastMovementId);
    }
}

export async function handleResetMovementSocket(data) {
    switch (data.action) {
        case 'resetMovementRequest':
            if (game.user.isActiveGM) {
                const approved = await showApprovalDialog(data);
                if (approved) {
                    await executeReset(data.sceneId, data.tokenId, data.mode);
                    game.socket.emit(`module.${module_id}`, {
                        action: 'resetMovementApproved',
                        tokenId: data.tokenId,
                        requesterId: data.userId
                    });
                } else {
                    game.socket.emit(`module.${module_id}`, {
                        action: 'resetMovementDenied',
                        tokenId: data.tokenId,
                        requesterId: data.userId
                    });
                }
            }
            break;

        case 'resetMovementApproved':
            if (data.requesterId === game.user.id) {
                ui.notifications.info(game.i18n.localize('sosly.reset-movement.approved'));
            }
            break;

        case 'resetMovementDenied':
            if (data.requesterId === game.user.id) {
                ui.notifications.warn(game.i18n.localize('sosly.reset-movement.denied'));
            }
            break;
    }
}
