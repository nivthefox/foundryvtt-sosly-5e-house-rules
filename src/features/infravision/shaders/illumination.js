const {IlluminationVisionShader} = foundry.canvas.rendering.shaders;

export class InfravisionIlluminationShader extends IlluminationVisionShader {
    static fragmentShader = `
    ${this.SHADER_HEADER}
    ${this.PERCEIVED_BRIGHTNESS}

    void main() {
      ${this.FRAGMENT_BEGIN}

      if (depth > 0.0) {
        float luminance = dot(framebufferColor, vec3(0.299, 0.587, 0.114));
        framebufferColor = vec3(luminance) * vec3(1.0, 0.3, 0.3);
      }

      gl_FragColor = vec4(framebufferColor, 1.0);
    }`;

    static defaultUniforms = {
        ...super.defaultUniforms
    };

    get isRequired() {
        return true;
    }
}
