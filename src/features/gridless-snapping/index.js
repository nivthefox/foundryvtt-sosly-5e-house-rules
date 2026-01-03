import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import {
    calculateSnapPosition,
    getMovementSpeed,
    getCurrentMovementAction
} from './snap-calculator';

export function registerGridlessSnappingFeature() {
    logger.info('Registering Gridless Snapping');

    wrapGetDragWaypointPosition();
}

function wrapGetDragWaypointPosition() {
    libWrapper.register(
        module_id,
        'Token.prototype._getDragWaypointPosition',
        function(wrapped, current, changes, {snap = false} = {}) {
            if (!canvas.grid.isGridless) {
                return wrapped(current, changes, {snap});
            }

            const x = Math.round(changes.x ?? current.x);
            const y = Math.round(changes.y ?? current.y);
            const elevation = changes.elevation ?? current.elevation;

            const actor = this.document.actor;
            if (!actor) {
                return {x, y, elevation};
            }

            const movementAction = getCurrentMovementAction(this.document);
            const speed = getMovementSpeed(actor, movementAction);

            if (!speed || speed <= 0) {
                return {x, y, elevation};
            }

            const context = this.mouseInteractionManager?.interactionData?.contexts?.[this.document.id];
            if (!context) {
                return {x, y, elevation};
            }

            const {lastWaypoint, priorDistance} = getPathInfo(this, context);

            const proposed = {x, y, elevation};

            const sceneData = {
                distance: canvas.scene.dimensions.distance,
                size: canvas.scene.dimensions.size
            };

            const snapped = calculateSnapPosition(lastWaypoint, proposed, priorDistance, speed, sceneData);

            if (snapped) {
                return {
                    x: Math.round(snapped.x),
                    y: Math.round(snapped.y),
                    elevation: snapped.elevation
                };
            }

            return {x, y, elevation};
        },
        'MIXED'
    );
}

function getPathInfo(token, context) {
    const origin = context.origin;
    const waypoints = context.waypoints || [];

    if (waypoints.length === 0) {
        return {
            lastWaypoint: {x: origin.x, y: origin.y},
            priorDistance: 0
        };
    }

    const pathToMeasure = [origin, ...waypoints];
    const measurement = token.measureMovementPath(pathToMeasure);
    const priorDistance = measurement?.distance ?? 0;

    const lastWp = waypoints[waypoints.length - 1];

    return {
        lastWaypoint: {x: lastWp.x, y: lastWp.y},
        priorDistance
    };
}
