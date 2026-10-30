import * as THREE from 'three';
import { buildBase, buildSidewalks, buildFarWalks, buildRoadMarks, buildWalkPuddles, L } from './world.js';
import { buildStore } from './store.js';
import { buildProps } from './props.js';
import { buildDistrict } from './district.js';
import { Reflection, makeGroundMaterial, Rain, Splashes } from './wet.js';
import { PostFX } from './post.js';
import { outline } from './palette.js';
import { mergeStatic } from './merge.js';

/* ============================================================
   雨夜便利店街角 · 微缩三维模型
   ============================================================ */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x0a0e19, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x151b2e, 90, 210);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.4, 400);
camera.position.set(23.0, 18.0, 25.5);

/* ---------------- 夜空 ---------------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    uTop: { value: new THREE.Color(0x070b18) },
    uMid: { value: new THREE.Color(0x18203e) },
    uBot: { value: new THREE.Color(0x33294a) },
    uGlow: { value: new THREE.Color(0x4a5f92) },
  },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main(){
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; uniform vec3 uGlow;
    varying vec3 vDir;
    void main(){
      float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(uBot, uMid, smoothstep(0.42, 0.62, h));
      col = mix(col, uTop, smoothstep(0.6, 0.95, h));
      // 地平线附近的城市夜光
      float hz = pow(1.0 - abs(vDir.y), 6.0);
      col += uGlow * hz * 0.35;
      // 轻微的云带
      float band = sin(vDir.x * 3.0 + vDir.z * 2.0) * 0.5 + 0.5;
      col += vec3(0.05, 0.06, 0.1) * band * smoothstep(0.55, 0.85, h) * 0.5;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 32, 18), skyMat);
sky.renderOrder = -10;
scene.add(sky);

/* ---------------- 灯光 ---------------- */
const hemi = new THREE.HemisphereLight(0x5a6fa8, 0x3a2a2e, 0.46);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xa8c6ff, 1.15);
moon.position.set(-16, 20, -12);
moon.target.position.set(0, 0, 0);
scene.add(moon, moon.target);

const fill = new THREE.DirectionalLight(0x4a5f92, 0.42);
const rimLight = new THREE.DirectionalLight(0x7fa8ff, 0.75);
const warmFill = new THREE.DirectionalLight(0xffb37a, 0.35);
warmFill.position.set(14, 5, 18);
scene.add(warmFill);
rimLight.position.set(-6, 9, -16);
scene.add(rimLight);
fill.position.set(18, 8, 16);
scene.add(fill);

/* ---------------- 反射 & 地面 ---------------- */
const reflection = new Reflection(renderer, scene, camera, 0.06, 1024);
const groundMat = makeGroundMaterial(reflection, { ambient: 0x6a7c96, tint: 0x8fb6d8 });
const base = buildBase(groundMat);
scene.add(base.group);
reflection.hide.push(base.group); // 整个底座在反射通道里要隐藏，否则挡住镜像视线

const walks = buildSidewalks();
scene.add(walks.group);
const farWalks = buildFarWalks();
scene.add(farWalks.group);
const roadMarks = buildRoadMarks();
scene.add(roadMarks);

const walkPuddles = buildWalkPuddles(reflection);
reflection.hide.push(walkPuddles);
scene.add(walkPuddles);

/* ---------------- 建筑与摆件 ---------------- */
const store = buildStore();
scene.add(store.group);
store.lights.forEach((l) => scene.add(l));

const props = buildProps();
scene.add(props.group);
props.lights.forEach((l) => scene.add(l));

const district = buildDistrict();
scene.add(district.group);

/* ---------------- 雨 ---------------- */
const rain = new Rain({ count: 4200, area: 13.2, height: 24 });
scene.add(rain.mesh);
const splashes = new Splashes({ count: 260, area: 12.8 });
scene.add(splashes.mesh);

/* ---------------- 描边（动画轮廓线） ---------------- */
outline(store.group, 0.0044);
outline(props.group, 0.0040);
outline(district.group, 0.0038);
outline(walks.group, 0.0032);

/* ---------------- 合批：把静态网格并成少量大网格，降低 draw call ---------------- */
const merged = new THREE.Group();
merged.name = 'merged-static';
scene.add(merged);
const mergeStats = [
  mergeStatic(store.group, merged),
  mergeStatic(props.group, merged),
  mergeStatic(district.group, merged),
  mergeStatic(walks.group, merged),
  mergeStatic(farWalks.group, merged),
  mergeStatic(roadMarks, merged),
].reduce((a, b) => ({ before: a.before + b.before, after: a.after + b.after }), { before: 0, after: 0 });
console.log('[merge] 静态网格', mergeStats.before, '→', mergeStats.after);

/* ---------------- 后期 ---------------- */
const post = new PostFX(renderer, scene, camera, {
  debugRT: location.hash.includes('rt') ? reflection : null,
  exposure: 1.18,
  bloomStrength: 1.15,
  threshold: 0.68,
  knee: 0.6,
});

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  renderer.setPixelRatio(dpr);
  const bw = Math.floor(w * dpr), bh = Math.floor(h * dpr);
  post.resize(bw, bh);
  reflection.rt.setSize(Math.min(768, bw), Math.min(768, bh));
}
window.addEventListener('resize', resize);
resize();

/* ---------------- 轨道控制器（自写，无 UI） ---------------- */
class Orbit {
  constructor(cam, dom) {
    this.cam = cam;
    this.dom = dom;
    this.target = new THREE.Vector3(0, 1.2, -1.8);
    const off = new THREE.Vector3().subVectors(cam.position, this.target);
    this.radius = off.length();
    this.theta = Math.atan2(off.x, off.z);
    this.phi = Math.acos(THREE.MathUtils.clamp(off.y / this.radius, -1, 1));
    this.tRadius = this.radius;
    this.tTheta = this.theta;
    this.tPhi = this.phi;
    this.minR = 15;
    this.maxR = 62;
    this.minPhi = 0.22;
    this.maxPhi = 1.36;
    this.idle = 0;
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.pointers = new Map();
    this.pinchDist = 0;

    dom.addEventListener('pointerdown', (e) => {
      dom.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.dragging = true;
        this.lastX = e.clientX; this.lastY = e.clientY;
      } else if (this.pointers.size === 2) {
        this.dragging = false;
        this.pinchDist = this.pointerDist();
      }
      this.idle = 0;
    });
    dom.addEventListener('pointermove', (e) => {
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const d = this.pointerDist();
        if (this.pinchDist > 0) this.tRadius *= this.pinchDist / Math.max(1, d);
        this.pinchDist = d;
        this.idle = 0;
        return;
      }
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
      this.tTheta -= dx * 0.0052;
      this.tPhi -= dy * 0.0042;
      this.tPhi = THREE.MathUtils.clamp(this.tPhi, this.minPhi, this.maxPhi);
      this.idle = 0;
    });
    const up = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) this.dragging = false;
      if (this.pointers.size < 2) this.pinchDist = 0;
    };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.tRadius *= 1 + Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.0016, 0.12);
      this.idle = 0;
    }, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  pointerDist() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  update(dt) {
    this.idle += dt;
    if (this.idle > 14 && !this.dragging) this.tTheta += dt * 0.03;
    this.tRadius = THREE.MathUtils.clamp(this.tRadius, this.minR, this.maxR);
    const k = 1 - Math.pow(0.0015, dt);
    this.theta += (this.tTheta - this.theta) * k;
    this.phi += (this.tPhi - this.phi) * k;
    this.radius += (this.tRadius - this.radius) * k;
    const sp = Math.sin(this.phi), cp = Math.cos(this.phi);
    this.cam.position.set(
      this.target.x + this.radius * sp * Math.sin(this.theta),
      this.target.y + this.radius * cp,
      this.target.z + this.radius * sp * Math.cos(this.theta)
    );
    this.cam.lookAt(this.target);
  }
}
const controls = new Orbit(camera, renderer.domElement);

/* ---------------- 收集需要时间的材质 ---------------- */
const timeMats = [];
scene.traverse((o) => {
  const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of mats) if (m && m.uniforms && m.uniforms.uTime) timeMats.push(m);
});

/* ---------------- 循环 ---------------- */
let prev = performance.now();
let time = 0;
let reflTimer = 0;
let shadowPrimed = false;
const flickerLight = props.lights.find((l) => l.isPointLight && l.color.getHex() === 0xffb877);

function tick(now) {
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;
  time += dt;

  controls.update(dt);

  for (const m of timeMats) m.uniforms.uTime.value = time;
  rain.update(time);
  splashes.update(time);

  // 巷子里的小灯轻微闪烁
  if (flickerLight) {
    flickerLight.intensity = 6 * (0.9 + 0.1 * Math.sin(time * 9.3) + 0.06 * Math.sin(time * 31.0));
  }

  if (!shadowPrimed) {
    renderer.shadowMap.needsUpdate = true;
    shadowPrimed = true;
  }

  // 反射按 30Hz 更新：镜面内容变化慢，视觉上无区别但省一半开销
  reflTimer += dt;
  if (reflTimer > 1 / 32) {
    reflection.update();
    reflTimer = 0;
  }
  post.render(time);

  if (!window.__ready) window.__ready = true;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

window.addEventListener('error', (e) => { window.__err = String(e.message || e); });
window.__dbg = { camera, scene, renderer, controls, post, reflection, L };
