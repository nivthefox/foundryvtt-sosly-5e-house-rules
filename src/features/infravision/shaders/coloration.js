export class InfravisionColorationShader extends ColorationVisionShader {
    static fragmentShader = `
    ${this.SHADER_HEADER}
    ${this.PERCEIVED_BRIGHTNESS}

    void main() {
      ${this.FRAGMENT_BEGIN}
      finalColor = vec3(1.0, 0.2, 0.2);
      ${this.COLORATION_TECHNIQUES}
      ${this.ADJUSTMENTS}
      ${this.FALLOFF}
      ${this.FRAGMENT_END}
    }`;

    static defaultUniforms = {
        ...super.defaultUniforms
    };

    get isRequired() {
        return true;
    }
}
