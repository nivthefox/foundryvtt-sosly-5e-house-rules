export class LightUnionCache {
    constructor() {
        this.invalidate();
    }

    get(sceneId, multiplier, lightSources, createUnion) {
        if (this.matches(sceneId, multiplier, lightSources)) {
            return this.union;
        }

        const lights = collectApplicableLights(lightSources, multiplier);
        this.sceneId = sceneId;
        this.multiplier = multiplier;
        this.lights = lights;
        this.union = createUnion(lights);
        this.valid = true;
        return this.union;
    }

    invalidate() {
        this.sceneId = null;
        this.multiplier = null;
        this.lights = [];
        this.union = null;
        this.valid = false;
    }

    matches(sceneId, multiplier, lightSources) {
        if (!this.valid || this.sceneId !== sceneId || this.multiplier !== multiplier) {
            return false;
        }

        let index = 0;
        for (const light of lightSources) {
            const radius = getExtendedRadius(light, multiplier);
            if (radius <= 0) {
                continue;
            }

            const cached = this.lights[index];
            if (!cached || cached.source !== light || cached.x !== light.x || cached.y !== light.y
                || cached.radius !== radius) {
                return false;
            }
            index++;
        }

        return index === this.lights.length;
    }
}

export function createAnimationFrameDebouncer(callback, scheduleFrame = requestAnimationFrame,
    cancelFrame = cancelAnimationFrame) {
    let frameId = null;

    return {
        schedule() {
            if (frameId !== null) {
                return;
            }

            frameId = scheduleFrame(() => {
                frameId = null;
                callback();
            });
        },

        cancel() {
            if (frameId === null) {
                return;
            }

            cancelFrame(frameId);
            frameId = null;
        }
    };
}

function collectApplicableLights(lightSources, multiplier) {
    const lights = [];
    for (const light of lightSources) {
        const radius = getExtendedRadius(light, multiplier);
        if (radius <= 0) {
            continue;
        }

        lights.push({
            source: light,
            x: light.x,
            y: light.y,
            radius
        });
    }
    return lights;
}

function getExtendedRadius(light, multiplier) {
    if (!light.active) {
        return 0;
    }
    return (light.data.dim || 0) * multiplier;
}
