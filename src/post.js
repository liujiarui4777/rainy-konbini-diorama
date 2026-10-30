import * as THREE from 'three';

/* ============================================================
   后期：亮度提取 → 两级高斯泛光 → ACES 色调映射 + 暗角 + 颗粒
   ============================================================ */

const QUAD_VS = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }`;

const BRIGHT_FS = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = max(max(c.r, c.g), c.b);
    float k = smoothstep(uThreshold, uThreshold + uKnee, l);
    gl_FragColor = vec4(c * k, 1.0);
  }`;

const BLUR_FS = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main(){
    vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.227027;
    sum += texture2D(tDiffuse, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
    sum += texture2D(tDiffuse, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
    sum += texture2D(tDiffuse, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
    sum += texture2D(tDiffuse, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(sum, 1.0);
  }`;

const COMPOSITE_FS = /* glsl */`
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform sampler2D tBloomWide;
  uniform float uBloom;
  uniform float uBloomWide;
  uniform float uExposure;
  uniform float uTime;
  uniform vec2 uRes;
  varying vec2 vUv;

  vec3 aces(vec3 x){
    // Narkowicz 近似
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  float hash(vec2 p){
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  void main(){
    vec2 uv = vUv;
    vec3 col = texture2D(tScene, uv).rgb;

    // 移轴虚化：画面上下两端轻微失焦，强化“微缩模型”观感
    float dof = smoothstep(0.14, 0.58, abs(uv.y - 0.5));
    if (dof > 0.01) {
      vec2 d = vec2(0.0028, 0.0028) * dof;
      vec3 acc = texture2D(tScene, uv).rgb * 0.28;
      acc += texture2D(tScene, uv + vec2( d.x, 0.0)).rgb * 0.14;
      acc += texture2D(tScene, uv + vec2(-d.x, 0.0)).rgb * 0.14;
      acc += texture2D(tScene, uv + vec2(0.0,  d.y)).rgb * 0.14;
      acc += texture2D(tScene, uv + vec2(0.0, -d.y)).rgb * 0.14;
      acc += texture2D(tScene, uv + d).rgb * 0.08;
      acc += texture2D(tScene, uv - d).rgb * 0.08;
      col = mix(col, acc, dof * 0.9);
    }

    vec3 bloom = texture2D(tBloom, uv).rgb;
    // 泛光带一点点色散
    vec3 bloomShift = vec3(
      texture2D(tBloom, uv + vec2(0.0022, 0.0)).r,
      bloom.g,
      texture2D(tBloom, uv - vec2(0.0022, 0.0)).b
    );
    col += mix(bloom, bloomShift, 0.55) * uBloom;
    col += texture2D(tBloomWide, uv).rgb * uBloomWide;

    // 曝光 + ACES
    col = aces(col * uExposure);

    // 轻微对比增强，让夜里的霓虹更「跳」
    col = clamp((col - 0.44) * 1.05 + 0.44, 0.0, 1.0);

    // 夜景冷调 + 暗角
    float vig = smoothstep(1.35, 0.28, length((uv - 0.5) * vec2(1.02, 0.98)));
    col *= mix(0.66, 1.0, vig);
    col = mix(col, col * vec3(0.94, 0.97, 1.06), 0.3);

    // 线性 → sRGB
    col = pow(max(col, 0.0), vec3(1.0 / 2.2));

    // 分离色调：暗部偏蓝、亮部偏暖，再提一点饱和度，强化二次元夜景层次
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col * vec3(0.90, 0.95, 1.14), col * vec3(1.07, 1.0, 0.93), smoothstep(0.10, 0.80, lum));
    col = mix(vec3(lum), col, 1.12);
    col = clamp(col, 0.0, 1.0);

    // 轻微胶片颗粒，消除色带
    float n = hash(uv * uRes + fract(uTime) * 137.0) - 0.5;
    col += n * 0.018;

    gl_FragColor = vec4(col, 1.0);
  }`;

export class PostFX {
  constructor(renderer, scene, camera, opts = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.bright = opts.bright ?? 0.72;
    this.threshold = opts.threshold ?? 0.62;
    this.knee = opts.knee ?? 0.55;
    this.exposure = opts.exposure ?? 1.06;
    this.bloomStrength = opts.bloomStrength ?? 0.85;
    this.debugRT = opts.debugRT || null;

    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: this.threshold }, uKnee: { value: this.knee } },
      vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, depthTest: false, depthWrite: false,
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: QUAD_VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        tBloomWide: { value: null },
        uBloom: { value: this.bloomStrength },
        uBloomWide: { value: 0.55 },
        uExposure: { value: this.exposure },
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: QUAD_VS, fragmentShader: COMPOSITE_FS, depthTest: false, depthWrite: false,
    });

    const rtOpts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      colorSpace: THREE.LinearSRGBColorSpace,
    };
    this.rtScene = new THREE.WebGLRenderTarget(1, 1, rtOpts);
    const blurOpts = { ...rtOpts, depthBuffer: false };
    this.rtA = new THREE.WebGLRenderTarget(1, 1, blurOpts);
    this.rtB = new THREE.WebGLRenderTarget(1, 1, blurOpts);
    this.rtC = new THREE.WebGLRenderTarget(1, 1, blurOpts);
    this.rtD = new THREE.WebGLRenderTarget(1, 1, blurOpts);

    this.size = new THREE.Vector2(1, 1);
  }

  resize(w, h) {
    this.size.set(w, h);
    this.rtScene.setSize(w, h);
    const bw = Math.max(2, Math.floor(w / 2));
    const bh = Math.max(2, Math.floor(h / 2));
    this.rtA.setSize(bw, bh);
    this.rtB.setSize(bw, bh);
    this.rtC.setSize(Math.max(2, Math.floor(w / 4)), Math.max(2, Math.floor(h / 4)));
    this.rtD.setSize(Math.max(2, Math.floor(w / 4)), Math.max(2, Math.floor(h / 4)));
    this.compMat.uniforms.uRes.value.set(w, h);
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  render(time) {
    const r = this.renderer;

    if (this.debugRT) { this.compMat.uniforms.tScene.value = this.debugRT.rt.texture; }
    // 1. 场景 → rtScene
    r.setRenderTarget(this.rtScene);
    r.clear(true, true, true);
    r.render(this.scene, this.camera);

    // 2. 亮度提取（半分辨率）
    this.brightMat.uniforms.tDiffuse.value = this.rtScene.texture;
    this.pass(this.brightMat, this.rtA);

    // 3. 高斯模糊（半分辨率，两轮）
    const bw = this.rtA.width, bh = this.rtA.height;
    this.blurMat.uniforms.tDiffuse.value = this.rtA.texture;
    this.blurMat.uniforms.uDir.value.set(1.4 / bw, 0);
    this.pass(this.blurMat, this.rtB);
    this.blurMat.uniforms.tDiffuse.value = this.rtB.texture;
    this.blurMat.uniforms.uDir.value.set(0, 1.4 / bh);
    this.pass(this.blurMat, this.rtA);

    // 4. 四分之一分辨率再做一轮，得到更宽的辉光
    this.brightMat.uniforms.tDiffuse.value = this.rtA.texture;
    this.pass(this.brightMat, this.rtC);
    this.blurMat.uniforms.tDiffuse.value = this.rtC.texture;
    this.blurMat.uniforms.uDir.value.set(1.8 / this.rtC.width, 0);
    this.pass(this.blurMat, this.rtD);
    this.blurMat.uniforms.tDiffuse.value = this.rtD.texture;
    this.blurMat.uniforms.uDir.value.set(0, 1.8 / this.rtD.height);
    this.pass(this.blurMat, this.rtC);

    // 5. 合成
    if (!this.debugRT) this.compMat.uniforms.tScene.value = this.rtScene.texture;
    this.compMat.uniforms.tBloom.value = this.rtA.texture;
    this.compMat.uniforms.tBloomWide.value = this.rtC.texture;
    this.compMat.uniforms.uTime.value = time;
    this.compMat.uniforms.uBloom.value = this.bloomStrength;
    this.quad.material = this.compMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
    return;
  }
}
