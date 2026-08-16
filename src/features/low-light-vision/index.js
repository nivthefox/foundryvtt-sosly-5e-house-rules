import {id as module_id} from '../../../module.json';
import {logger} from '../../utils/logger';
import {createAnimationFrameDebouncer, LightUnionCache} from './light-union-cache';
import {registerLowLightVisionSettings} from './settings';
import {LowLightVisionMode} from './vision-mode';

const {PointVisionSource} = foundry.canvas.sources;
const CIRCLE_SEGMENTS = 32;
const extendedLightUnionCache = new LightUnionCache();
const visionRefreshDebouncer = createAnimationFrameDebouncer(refreshLowLightVision);

/**
 * Low-Light Vision Feature
 * Extends dim light perception to 2x normal range
 */
export function registerLowLightVisionFeature() {
    logger.info('Registering Low-Light Vision');

    registerLowLightVisionSettings();

    if (!game.settings.get(module_id, 'low-light-vision')) {
        return;
    }

    Hooks.once('setup', () => {
        CONFIG.Canvas.visionModes.lowLight = new LowLightVisionMode();
        registerExtendedLightGeometryLifecycle();
        patchVisionSourcePolygons();
        patchLightPerceptionDetection();
        logger.info('Low-Light Vision mode registered');
    });
}

function patchLightPerceptionDetection() {
    const lightPerception = CONFIG.Canvas.detectionModes.lightPerception;
    const originalTestPoint = lightPerception._testPoint.bind(lightPerception);

    lightPerception._testPoint = function(visionSource, mode, target, test) {
        if (originalTestPoint(visionSource, mode, target, test)) {
            return true;
        }

        if (visionSource.visionMode?.id !== 'lowLight') {
            return false;
        }

        return testInsideExtendedLight(test.point);
    };
}

function testInsideExtendedLight(point) {
    const multiplier = game.settings.get(module_id, 'low-light-vision-multiplier');

    for (const light of canvas.effects.lightSources) {
        if (!light.active) {
            continue;
        }

        const extendedDim = (light.data.dim || 0) * multiplier;
        if (extendedDim <= 0) {
            continue;
        }

        const dist = Math.hypot(light.x - point.x, light.y - point.y);
        if (dist <= extendedDim) {
            return true;
        }
    }

    return false;
}

function patchVisionSourcePolygons() {
    const originalCreateLightPolygon = PointVisionSource.prototype._createLightPolygon;
    const originalCreateRestrictedPolygon = PointVisionSource.prototype._createRestrictedPolygon;

    PointVisionSource.prototype._createLightPolygon = function() {
        const original = originalCreateLightPolygon.call(this);

        if (this.visionMode?.id !== 'lowLight') {
            this._lowLightExtendedPolygon = null;
            return original;
        }

        const extended = calculateExtendedLightPolygon(this);
        this._lowLightExtendedPolygon = extended;
        if (!extended) {
            return original;
        }

        return extended;
    };

    PointVisionSource.prototype._createRestrictedPolygon = function() {
        const original = originalCreateRestrictedPolygon.call(this);

        if (this.visionMode?.id !== 'lowLight' || !this._lowLightExtendedPolygon) {
            return original;
        }

        return this._lowLightExtendedPolygon;
    };
}

function calculateExtendedLightPolygon(source) {
    if (!canvas.effects?.lightSources) {
        return null;
    }

    const multiplier = game.settings.get(module_id, 'low-light-vision-multiplier');
    const unionResult = extendedLightUnionCache.get(
        canvas.scene?.id,
        multiplier,
        canvas.effects.lightSources,
        calculateExtendedLightUnion
    );

    if (!unionResult?.length) {
        return null;
    }

    const losPath = polygonToClipperPath(source.los);
    const intersectClipper = new ClipperLib.Clipper();
    intersectClipper.AddPaths(unionResult, ClipperLib.PolyType.ptSubject, true);
    intersectClipper.AddPath(losPath, ClipperLib.PolyType.ptClip, true);

    const result = new ClipperLib.Paths();
    intersectClipper.Execute(
        ClipperLib.ClipType.ctIntersection,
        result,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
    );

    if (result.length === 0) {
        return null;
    }

    return clipperPathToPolygon(result[0], source);
}

function calculateExtendedLightUnion(lights) {
    if (lights.length === 0) {
        return null;
    }

    const clipper = new ClipperLib.Clipper();
    for (const light of lights) {
        const circlePath = approximateCircle(light.x, light.y, light.radius, CIRCLE_SEGMENTS);
        clipper.AddPath(circlePath, ClipperLib.PolyType.ptSubject, true);
    }

    const unionResult = new ClipperLib.Paths();
    clipper.Execute(
        ClipperLib.ClipType.ctUnion,
        unionResult,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
    );

    if (unionResult.length === 0) {
        return null;
    }

    return unionResult;
}

function registerExtendedLightGeometryLifecycle() {
    Hooks.on('createAmbientLight', handleExtendedLightDocumentChange);
    Hooks.on('updateAmbientLight', handleExtendedLightDocumentChange);
    Hooks.on('deleteAmbientLight', handleExtendedLightDocumentChange);
    Hooks.on('createToken', handleTokenLightDocumentChange);
    Hooks.on('updateToken', handleTokenLightUpdate);
    Hooks.on('deleteToken', handleTokenLightDocumentChange);
    Hooks.on('updateScene', handleSceneLightingUpdate);
    Hooks.on('canvasTearDown', clearExtendedLightGeometry);
}

function handleExtendedLightDocumentChange(document) {
    if (!belongsToCurrentScene(document)) {
        return;
    }
    invalidateExtendedLightGeometry();
}

function handleTokenLightDocumentChange(document) {
    if (!belongsToCurrentScene(document) || (document.light?.dim || 0) <= 0) {
        return;
    }
    invalidateExtendedLightGeometry();
}

function handleTokenLightUpdate(document, changes = {}) {
    if (!belongsToCurrentScene(document) || !tokenUpdateAffectsExtendedLight(document, changes)) {
        return;
    }
    invalidateExtendedLightGeometry();
}

function tokenUpdateAffectsExtendedLight(document, changes) {
    if ('light' in changes) {
        return true;
    }

    const positionOrVisibilityChanged = ('x' in changes) || ('y' in changes) || ('hidden' in changes);
    return positionOrVisibilityChanged && (document.light?.dim || 0) > 0;
}

function handleSceneLightingUpdate(scene, changes = {}) {
    if (scene !== canvas.scene) {
        return;
    }

    const lightingChanged = ('darkness' in changes) || ('grid' in changes) || ('dimensions' in changes);
    if (!lightingChanged) {
        return;
    }
    invalidateExtendedLightGeometry();
}

function belongsToCurrentScene(document) {
    return canvas.ready && document.parent === canvas.scene;
}

function invalidateExtendedLightGeometry() {
    extendedLightUnionCache.invalidate();
    visionRefreshDebouncer.schedule();
}

function clearExtendedLightGeometry() {
    extendedLightUnionCache.invalidate();
    visionRefreshDebouncer.cancel();
}

function refreshLowLightVision() {
    if (!canvas.ready || !hasActiveLowLightVisionSource()) {
        return;
    }
    canvas.perception.update({initializeVision: true});
}

function hasActiveLowLightVisionSource() {
    for (const source of canvas.effects.visionSources) {
        if (source.visionMode?.id === 'lowLight') {
            return true;
        }
    }
    return false;
}

function approximateCircle(cx, cy, radius, segments) {
    const path = [];
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        path.push({
            X: Math.round(cx + (Math.cos(angle) * radius)),
            Y: Math.round(cy + (Math.sin(angle) * radius))
        });
    }
    return path;
}

function polygonToClipperPath(polygon) {
    const path = [];
    const points = polygon.points;
    for (let i = 0; i < points.length; i += 2) {
        path.push({
            X: Math.round(points[i]),
            Y: Math.round(points[i + 1])
        });
    }
    return path;
}

function clipperPathToPolygon(path, source) {
    const points = [];
    for (const point of path) {
        points.push(point.X, point.Y);
    }
    const polygon = new PIXI.Polygon(points);
    polygon.origin = {x: source.data.x, y: source.data.y};
    polygon.config = source.los.config;
    return polygon;
}
