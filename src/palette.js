import * as THREE from 'three';

/* ============================================================
   三渲二 材质系统
   - MeshToonMaterial + 4 阶梯度图 → 干净的赛璐璐分色
   - 边缘光（Fresnel）注入 → 霓虹环境下的二次元轮廓发光
   - 反向外壳描边 → 明确的手绘轮廓
   ============================================================ */

export const C = {
  asphalt: 0x2b3244,
  asphaltDeep: 0x1a1f2b,
  walk: 0x4a5164,
  walkTile: 0x565d71,
  curb: 0x6b7386,
  lineWhite: 0xe4ebf2,
  lineYellow: 0xf0cf7a,
  concrete: 0x5b6376,
  concreteDark: 0x3b4253,
  wallStore: 0xe3e9e6,
  wallStoreDim: 0xc3cfcd,
  storeTrim: 0x24403f,
  storeGreen: 0x0f3f3a,
  glass: 0xa9ece6,
  neonMint: 0x74ffdf,
  neonCyan: 0x74d8ff,
  neonPink: 0xff8ec4,
  neonAmber: 0xffb268,
  neonRed: 0xff6b6b,
  interior: 0xe8fff6,
  interiorWarm: 0xfff0d8,
  metal: 0x6a7285,
  metalDark: 0x3c4354,
  roof: 0x39404f,
  soilA: 0x2a2436,
  soilB: 0x352a3c,
  soilC: 0x413345,
  wood: 0x6b5344,
  bike: 0x2f3a4d,
};

const Q = (v, p = 0.35) => {
  // 量化色：让分色更硬，接近手绘赛璐璐
  const c = new THREE.Color(v);
  const f = (x) => Math.min(1, Math.round(x * p * 4) / (p * 4));
  return new THREE.Color(f(c.r), f(c.g), f(c.b));
};

/* 5 阶夜色梯度图（NearestFilter → 硬分界） */
const gradientMap = (() => {
  const steps = [0.26, 0.46, 0.66, 0.84, 1.0];
  const data = new Uint8Array(steps.length);
  steps.forEach((s, i) => (data[i] = Math.round(s * 255)));
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

/** 赛璐璐材质 */
export function toon(color, o = {}) {
  const { rim, rimStr = 0.5, rimPow = 2.4, ...rest } = o;
  const c = rest.quant ? Q(color, rest.quant) : new THREE.Color(color);
  delete rest.quant;
  const m = new THREE.MeshToonMaterial({ color: c, gradientMap, ...rest });
  if (rim) addRim(m, rim, rimStr, rimPow);
  return m;
}

/** 自发光 / 霓虹（数值 > 1 会触发泛光） */
export function neon(color, boost = 2.4, o = {}) {
  const c = new THREE.Color(color).multiplyScalar(boost);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...o });
}

/** 亚光平面色（不参与光照，用于招牌底、玻璃后面的暗部） */
export function flat(color, o = {}) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color), ...o });
}

export function glass(tint = 0xcdf6ff, opacity = 0.13) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(tint), transparent: true, opacity,
    depthWrite: false, side: THREE.DoubleSide,
  });
}

export function metal(color = C.metal, o = {}) {
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color(color), shininess: 110, specular: new THREE.Color(0xbcc8e0), ...o,
  });
}

/* ---------- 边缘光 ---------- */
export function addRim(mat, color, strength = 0.5, power = 2.4) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: new THREE.Color(color) };
    shader.uniforms.uRimStr = { value: strength };
    shader.uniforms.uRimPow = { value: power };
    shader.vertexShader = 'varying vec3 vRimW;\nvarying vec3 vRimN;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vRimW = (modelMatrix * vec4(transformed, 1.0)).xyz;
       vRimN = normalize(mat3(modelMatrix) * objectNormal);`
    );
    shader.fragmentShader =
      'uniform vec3 uRimColor;\nuniform float uRimStr;\nuniform float uRimPow;\nvarying vec3 vRimW;\nvarying vec3 vRimN;\n' +
      shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
         {
           float rimF = 1.0 - clamp(dot(normalize(vRimN), normalize(cameraPosition - vRimW)), 0.0, 1.0);
           gl_FragColor.rgb += uRimColor * pow(rimF, uRimPow) * uRimStr;
         }`
      );
  };
  mat.needsUpdate = true;
  return mat;
}

/* ---------- 外扩描边 ---------- */
const outlineMatCache = new Map();
function outlineMaterial(thickness, color, res) {
  const key = `${thickness}|${color}`;
  if (outlineMatCache.has(key)) return outlineMatCache.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uThick: { value: thickness },
      uColor: { value: new THREE.Color(color) },
      uRes: res,
    },
    vertexShader: /* glsl */`
      uniform float uThick;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec4 clip = projectionMatrix * mv;
        vec3 nView = normalize(normalMatrix * normal);
        // 屏幕空间等宽外扩
        clip.xy += nView.xy * uThick * clip.w;
        clip.z += 0.00035 * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.BackSide,
  });
  outlineMatCache.set(key, m);
  return m;
}

/** 给一组物体批量加描边外壳（跳过透明/精灵/实例体/过小零件） */
export function outline(root, thickness = 0.0034, color = 0x070a12) {
  const targets = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (o.userData.noOutline || o.userData.isOutline) return;
    const m = o.material;
    if (!m || m.transparent === true || m.isShaderMaterial) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const rad = (o.geometry.boundingSphere?.radius || 0) * Math.max(o.scale.x, o.scale.y, o.scale.z);
    if (rad < 0.24) return;
    targets.push(o);
  });
  const res = { value: new THREE.Vector2(1, 1) };
  for (const m of targets) {
    const shell = new THREE.Mesh(m.geometry, outlineMaterial(thickness, color, res));
    shell.userData.isOutline = true;
    shell.renderOrder = (m.renderOrder || 0) - 1;
    m.add(shell);
  }
  return root;
}

/* 供后期在 resize 时更新描边分辨率（此处仅占位，NDC 宽度与分辨率无关） */
export function setOutlineRes() { }
