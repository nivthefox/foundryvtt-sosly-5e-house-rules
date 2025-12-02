const {DetectionMode} = foundry.canvas.perception;
const {GlowOverlayFilter} = foundry.canvas.rendering.filters;

export class InfravisionDetectionMode extends DetectionMode {
    constructor() {
        super({
            id: 'infravision',
            label: 'Infravision',
            type: DetectionMode.DETECTION_TYPES.SIGHT,
            walls: true,
            angle: true
        });
    }

    static getDetectionFilter() {
        if (!this._detectionFilter) {
            this._detectionFilter = GlowOverlayFilter.create({
                glowColor: [1, 0.2, 0.2, 1]
            });
        }
        return this._detectionFilter;
    }

    _canDetect(visionSource, target) {
        const source = visionSource.object;

        if (!target?.actor?.system?.details?.type
            || target.document.hasStatusEffect(CONFIG.specialStatusEffects.DEFEATED)
            || target.document.hasStatusEffect(CONFIG.specialStatusEffects.OBJECT)
            || target.document.hasStatusEffect(CONFIG.specialStatusEffects.PETRIFIED)) {
            return false;
        }

        const type = target.actor.system.details.type.value;

        if (type === 'construct' || type === 'undead') {
            return false;
        }

        if (source.document.hasStatusEffect(CONFIG.specialStatusEffects.DEFEATED)
            || source.document.hasStatusEffect(CONFIG.specialStatusEffects.PETRIFIED)
            || source.document.hasStatusEffect(CONFIG.specialStatusEffects.UNCONSCIOUS)
            || source.document.hasStatusEffect(CONFIG.specialStatusEffects.BLIND)) {
            return false;
        }

        return super._canDetect(visionSource, target);
    }
}
