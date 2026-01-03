const BASE_SNAP_THRESHOLD = 15;

export function calculateSnapPosition(lastWaypoint, proposed, priorDistance, speed, sceneData) {
    if (!speed || speed <= 0) {
        return null;
    }

    const dx = proposed.x - lastWaypoint.x;
    const dy = proposed.y - lastWaypoint.y;
    const finalSegmentPx = Math.hypot(dx, dy);

    if (finalSegmentPx === 0) {
        return null;
    }

    const pxPerFoot = sceneData.size / sceneData.distance;
    const priorDistancePx = priorDistance * pxPerFoot;
    const totalDistancePx = priorDistancePx + finalSegmentPx;

    const speedPx = speed * pxPerFoot;
    const totalDistanceInSpeeds = totalDistancePx / speedPx;
    const nearestMultiple = Math.round(totalDistanceInSpeeds);

    if (nearestMultiple === 0) {
        return null;
    }

    const snapTotalPx = nearestMultiple * speedPx;
    const threshold = getScaledThreshold();

    if (Math.abs(totalDistancePx - snapTotalPx) <= threshold) {
        const neededFinalSegmentPx = snapTotalPx - priorDistancePx;

        if (neededFinalSegmentPx <= 0) {
            return null;
        }

        const angle = Math.atan2(dy, dx);
        return {
            x: lastWaypoint.x + (Math.cos(angle) * neededFinalSegmentPx),
            y: lastWaypoint.y + (Math.sin(angle) * neededFinalSegmentPx),
            elevation: proposed.elevation
        };
    }

    return null;
}

export function getMovementSpeed(actor, movementAction) {
    if (!actor) {
        return 0;
    }

    const movement = actor.system?.attributes?.movement;
    if (!movement) {
        return 0;
    }

    const speed = movement[movementAction] ?? movement.walk ?? 0;
    return speed;
}

export function getCurrentMovementAction(tokenDocument) {
    return canvas.tokens._dragMovementAction
        ?? tokenDocument?.movementAction
        ?? CONFIG.Token.movement.defaultAction
        ?? 'walk';
}

function getScaledThreshold() {
    const scale = canvas.stage?.scale?.x ?? 1;
    return BASE_SNAP_THRESHOLD / scale;
}
