export class InfravisionBackgroundShader extends BackgroundVisionShader {
    static fragmentShader = `
    ${this.SHADER_HEADER}
    ${this.PERCEIVED_BRIGHTNESS}

    void main() {
      ${this.FRAGMENT_BEGIN}
      ${this.ADJUSTMENTS}
      ${this.BACKGROUND_TECHNIQUES}
      ${this.FALLOFF}
      ${this.FRAGMENT_END}

      float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor.rgb = vec3(luminance) * 0.05;
    }`;

    static defaultUniforms = {
        ...super.defaultUniforms
    };

    get isRequired() {
        return true;
    }
}
