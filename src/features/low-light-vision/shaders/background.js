/**
 * Custom background shader for Low-Light Vision
 * Extends dim light perception to double the normal radius
 */
export class LowLightBackgroundShader extends BackgroundVisionShader {
    static fragmentShader = `
    ${this.SHADER_HEADER}
    ${this.PERCEIVED_BRIGHTNESS}

    uniform float lightPositions[60];
    uniform float lightBrightRadii[30];
    uniform float lightDimRadii[30];
    uniform int lightCount;
    uniform vec2 canvasPosition;
    uniform vec2 canvasPivot;
    uniform float canvasScale;
    uniform float dimMultiplier;
    uniform bool useGrayscale;

    void main() {
      ${this.FRAGMENT_BEGIN}
      ${this.ADJUSTMENTS}
      ${this.BACKGROUND_TECHNIQUES}

      ${this.FALLOFF}
      ${this.FRAGMENT_END}

      vec2 screenPos = vSamplerUvs * screenDimensions;
      float minDistRatio = 999.0;

      for (int i = 0; i < 30; i++) {
        if (i >= lightCount) {
          break;
        }

        vec2 lightWorldPos = vec2(lightPositions[i * 2], lightPositions[i * 2 + 1]);
        vec2 lightScreenPos = ((lightWorldPos - canvasPivot) * canvasScale) + canvasPosition;
        float screenRadius = lightDimRadii[i] * canvasScale;

        float dist = distance(screenPos, lightScreenPos);
        float distRatio = dist / screenRadius;

        minDistRatio = min(minDistRatio, distRatio);
      }

      if (useGrayscale) {
        float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        gl_FragColor.rgb = vec3(luminance);
      }

      float darkness = smoothstep(0.9, 1.0, minDistRatio);

      if (darkness > 0.0) {
        float luminance = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 desaturated = vec3(luminance);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, desaturated * 0.3, darkness);
      }
    }`;

    static defaultUniforms = {
        ...super.defaultUniforms,
        lightCount: 0,
        lightPositions: new Array(60).fill(0),
        lightBrightRadii: new Array(30).fill(0),
        lightDimRadii: new Array(30).fill(0),
        canvasPosition: [0, 0],
        canvasPivot: [0, 0],
        canvasScale: 1.0,
        dimMultiplier: 2.0,
        useGrayscale: true
    };

    get isRequired() {
        return true;
    }
}
