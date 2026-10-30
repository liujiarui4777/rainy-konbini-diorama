import * as THREE from 'three';
import { asphaltTex, wetMaskTex, splashTex } from './texture.js';
import { mulberry32 } from './kit.js';

/* ============================================================
   湿地面系统：平面镜反射 + 积水遮罩 + 雨波纹
   ============================================================ */

export class Reflection {
  constructor(renderer, scene, camera, planeY = 0.0, size = 1024) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.planeY = planeY;
    this.virtual = new THREE.PerspectiveCamera();
    this.textureMatrix = new THREE.Matrix4();
    this.hide = [];   // 渲染反射时需要隐藏的物体（接收面本身）
    this.rt = new THREE.WebGLRenderTarget(size, size, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    this.rt.depthBuffer = true;
    this._bias = new THREE.Matrix4().set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1
    );
  }

  update() {
    const cam = this.camera;
    const v = this.virtual;
    const H = this.planeY;

    // 镜像相机：位置、朝向、上方向关于水平面反射
    v.position.set(cam.position.x, 2 * H - cam.position.y, cam.position.z);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const lookAt = new THREE.Vector3().copy(cam.position).addScaledVector(dir, 10);
    lookAt.y = 2 * H - lookAt.y;
    v.up.set(0, -1, 0);
    v.lookAt(lookAt);
    v.fov = cam.fov;
    v.aspect = cam.aspect;
    v.near = cam.near;
    v.far = cam.far;
    v.updateProjectionMatrix();
    v.updateMatrixWorld(true);

    this.textureMatrix.multiplyMatrices(this._bias, v.projectionMatrix).multiply(v.matrixWorldInverse);

    // 渲染
    const hidden = this.hide.filter(Boolean);
    hidden.forEach((o) => (o.visible = false));
    const prevBg = this.scene.background;
    const prevFog = this.scene.fog;
    this.scene.background = null;
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(this.scene, v);
    r.setRenderTarget(null);
    this.scene.background = prevBg;
    this.scene.fog = prevFog;
    hidden.forEach((o) => (o.visible = true));
  }
}

/* ---------------- 地面材质 ---------------- */

const commonUniforms = () => ({
  uTime: { value: 0 },
  uReflectStr: { value: 1.1 },
  uWetness: { value: 1.0 },
});

const GLSL_NOISE = /* glsl */`
  float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  // 简单雨滴涟漪：返回法线扰动
  vec2 rainRipple(vec2 p, float t){
    vec2 acc = vec2(0.0);
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      vec2 q = p * (1.4 + fi * 0.9) + vec2(fi * 11.3, fi * 5.7);
      vec2 cell = floor(q);
      vec2 f = fract(q) - 0.5;
      float h = hash21(cell);
      float ph = fract(t * (1.1 + h * 0.6) + h);
      float r = ph * 0.46;
      float d = length(f);
      float ring = smoothstep(0.055, 0.0, abs(d - r)) * (1.0 - ph);
      acc += normalize(f + 1e-5) * ring * 0.5;
    }
    return acc;
  }
`;

export function makeGroundMaterial(reflection, opts = {}) {
  const uniforms = {
    ...commonUniforms(),
    tReflect: { value: reflection.rt.texture },
    uTexMatrix: { value: reflection.textureMatrix },
    tAsphalt: { value: asphaltTex() },
    tWetMask: { value: wetMaskTex() },
    uAmbient: { value: new THREE.Color(opts.ambient ?? 0x2b3244) },
    uTint: { value: new THREE.Color(opts.tint ?? 0x7fa8c8) },
  };
  uniforms.tAsphalt.value.repeat.set(1, 1);
  uniforms.tWetMask.value.repeat.set(1, 1);

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tReflect;
      uniform sampler2D tAsphalt;
      uniform sampler2D tWetMask;
      uniform mat4 uTexMatrix;
      uniform vec3 uAmbient;
      uniform vec3 uTint;
      uniform float uTime;
      uniform float uReflectStr;
      uniform float uWetness;
      varying vec3 vWorld;
      ${GLSL_NOISE}

      void main(){
        vec2 xz = vWorld.xz;
        vec3 base = texture2D(tAsphalt, xz * 0.115).rgb;
        base *= uAmbient * 1.35;
        // 边缘压暗，做出模型底座的收边
        float edge = smoothstep(12.9, 11.2, max(abs(xz.x), abs(xz.y)));
        base *= mix(0.55, 1.0, edge);

        // 湿区遮罩（大尺度）
        float wet = texture2D(tWetMask, xz * 0.052 + 0.35).r;
        float puddle = smoothstep(0.30, 0.74, wet);
        puddle *= uWetness;

        // 涟漪扰动反射
        vec2 rip = rainRipple(xz * 1.15, uTime) * 0.02;
        vec4 uvp = uTexMatrix * vec4(vWorld, 1.0);
        vec2 ruv = uvp.xy / uvp.w + rip * (0.25 + puddle);

        // 轻微模糊：三个偏移采样
        vec3 refl = texture2D(tReflect, ruv).rgb * 0.5;
        refl += texture2D(tReflect, ruv + vec2(0.0016, 0.0)).rgb * 0.25;
        refl += texture2D(tReflect, ruv + vec2(0.0, 0.0016)).rgb * 0.25;

        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.6);
        float amount = puddle * mix(0.42, 1.0, fres) * uReflectStr;

        vec3 col = mix(base, (refl * uTint + vec3(0.012, 0.016, 0.026)) * 1.25, amount);
        // 积水边缘的高光带
        float rim = smoothstep(0.30, 0.40, wet) - smoothstep(0.66, 0.76, wet);
        col += refl * rim * 0.35 * (0.3 + fres);

        // 整体压出一层极淡的蓝调水膜
        col = mix(col, col * vec3(0.86, 0.94, 1.08), 0.35);

        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return mat;
}

/* ---------------- 人行道 / 广场上的积水贴片 ---------------- */

export function makePuddleOverlay(reflection, { scale = 1, opacity = 1 } = {}) {
  const uniforms = {
    ...commonUniforms(),
    tReflect: { value: reflection.rt.texture },
    uTexMatrix: { value: reflection.textureMatrix },
    tMask: { value: wetMaskTex() },
    uOpacity: { value: opacity },
    uScale: { value: scale },
  };
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tReflect;
      uniform sampler2D tMask;
      uniform mat4 uTexMatrix;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uScale;
      varying vec3 vWorld;
      varying vec2 vUv;
      ${GLSL_NOISE}
      void main(){
        float m = texture2D(tMask, vUv * uScale + 0.2).r;
        float a = smoothstep(0.22, 0.85, m) * uOpacity;
        if (a < 0.01) discard;
        vec2 rip = rainRipple(vWorld.xz * 1.2, uTime) * 0.016;
        vec4 uvp = uTexMatrix * vec4(vWorld, 1.0);
        vec2 ruv = uvp.xy / uvp.w + rip;
        vec3 refl = texture2D(tReflect, ruv).rgb;
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.2);
        vec3 col = (refl * 0.55 + vec3(0.035, 0.045, 0.07)) * vec3(0.85, 0.95, 1.1) * (0.55 + fres * 0.9);
        gl_FragColor = vec4(col, a * 0.75);
      }`,
  });
}

/* ---------------- 雨 ---------------- */

export class Rain {
  constructor({ count = 4200, area = 13, height = 22, wind = new THREE.Vector2(0.35, 0.12) } = {}) {
    const rnd = mulberry32(2024);
    const pos = new Float32Array(count * 2 * 3);
    const seed = new Float32Array(count * 2);
    const tip = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = (rnd() * 2 - 1) * area;
      const z = (rnd() * 2 - 1) * area;
      const y = rnd() * height;
      const s = rnd();
      for (let k = 0; k < 2; k++) {
        const idx = (i * 2 + k);
        pos[idx * 3 + 0] = x;
        pos[idx * 3 + 1] = y;
        pos[idx * 3 + 2] = z;
        seed[idx] = s;
        tip[idx] = k;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aTip', new THREE.BufferAttribute(tip, 1));

    this.height = height;
    this.wind = wind;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHeight: { value: height },
        uWind: { value: wind },
        uColor: { value: new THREE.Color(0x8fb6dd) },
        uOpacity: { value: 0.3 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float aSeed;
        attribute float aTip;
        uniform float uTime;
        uniform float uHeight;
        uniform vec2 uWind;
        varying float vA;
        void main(){
          float speed = 18.0 + aSeed * 12.0;
          float len = 0.55 + aSeed * 0.55;
          vec3 p = position;
          // 循环下落
          float y = mod(p.y - uTime * speed, uHeight);
          p.y = y + aTip * len;
          p.x += uWind.x * aTip * len * 1.6 + sin(uTime * 0.6 + aSeed * 12.0) * 0.05;
          p.z += uWind.y * aTip * len * 1.6;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          // 顶部淡出、远处淡出
          float fadeTop = smoothstep(0.0, 6.0, p.y) * smoothstep(uHeight, uHeight - 5.0, p.y);
          vA = mix(1.0, 0.25, aTip) * fadeTop;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vA;
        void main(){
          gl_FragColor = vec4(uColor, vA * uOpacity);
        }`,
    });
    this.mesh = new THREE.LineSegments(geo, this.material);
    this.mesh.frustumCulled = false;
  }
  update(t) { this.material.uniforms.uTime.value = t; }
}

/* ---------------- 雨滴溅落水花 ---------------- */

export class Splashes {
  constructor({ count = 220, area = 13, color = 0xa8d8ff } = {}) {
    const rnd = mulberry32(777);
    const geo = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1);
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    const off = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      off[i * 3] = (rnd() * 2 - 1) * area;
      off[i * 3 + 1] = 0;
      off[i * 3 + 2] = (rnd() * 2 - 1) * area;
      phase[i] = rnd();
      speed[i] = 0.5 + rnd() * 0.9;
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 3));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    geo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speed, 1));
    geo.instanceCount = count;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: splashTex() },
        uColor: { value: new THREE.Color(color) },
        uY: { value: 0.012 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec3 aOffset;
        attribute float aPhase;
        attribute float aSpeed;
        uniform float uTime;
        uniform float uY;
        varying vec2 vUv;
        varying float vA;
        void main(){
          float life = fract(uTime * aSpeed + aPhase);
          float s = 0.10 + life * 0.62;
          vA = (1.0 - life) * smoothstep(0.0, 0.12, life);
          vUv = uv;
          vec3 p = vec3(position.x * s, 0.0, position.y * s) + vec3(aOffset.x, uY, aOffset.z);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vA;
        void main(){
          float a = texture2D(uMap, vUv).a;
          gl_FragColor = vec4(uColor * 1.6, a * vA * 0.75);
        }`,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
  }
  update(t) { this.material.uniforms.uTime.value = t; }
}
