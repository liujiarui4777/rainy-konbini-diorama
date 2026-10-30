import * as THREE from 'three';
import { G, M, box, cyl, plane, rod, mulberry32, roundedBoxGeo } from './kit.js';
import { toon, flat, neon, metal, C, outline } from './palette.js';
import { sidewalkTex, tactileTex, asphaltTex, tomareTex, wetMaskTex } from './texture.js';
import { makePuddleOverlay } from './wet.js';

/* ============================================================
   场景布局常量（单位：米）
   ============================================================ */

export const L = {
  HALF: 13,            // 底座半边长
  WALK_Y: 0.17,        // 人行道高度
  // 便利店主体
  STORE: { x0: -3.6, x1: 3.6, z0: -11.0, z1: -5.2, h: 4.05 },
  // 正面人行道（含转角）
  FRONT: { x0: -13, x1: 5.4, z0: -5.2, z1: -1.2 },
  // 侧街（南北向，靠东）
  SIDE: { x0: 5.4, x1: 10.6, z0: -13, z1: -1.2 },
  // 主路（东西向）
  ROAD: { z0: -1.2, z1: 4.8 },
  // 主路对面人行道
  SOUTH: { z0: 4.8, z1: 6.5 },
  // 侧街东侧人行道
  EAST: { x0: 10.6, x1: 11.4 },
  // 小巷（便利店西侧）
  ALLEY: { x0: -6.6, x1: -3.6, z0: -11.0, z1: -5.2 },
};

/* 形状挤出（顶面用世界坐标当 uv，方便贴砖） */
function extrudeFlat(shape, height, mat) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 8 });
  geo.rotateX(-Math.PI / 2);
  // 此时 shape 的 y 变成 world -z；重新计算 uv（单位：米）
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i);
    uv[i * 2 + 1] = -pos.getZ(i);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

/* ============================================================
   底座：土层断面 + 沥青地面
   ============================================================ */

export function buildBase(groundMat) {
  const g = new THREE.Group();
  const HALF = L.HALF;

  const layers = [
    { y0: -2.05, y1: -1.42, col: 0x2b2436 },
    { y0: -1.42, y1: -0.82, col: 0x352a40 },
    { y0: -0.82, y1: -0.30, col: 0x413747 },
    { y0: -0.30, y1: 0.015, col: 0x4a4053 },
  ];
  for (const l of layers) {
    const h = l.y1 - l.y0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, h, HALF * 2), toon(l.col, { rim: 0x2a3a5a, rimStr: 0.16 }));
    m.position.y = l.y0 + h / 2;
    m.receiveShadow = true;
    g.add(m);
  }
  // 顶面沥青（反射材质）
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.02;
  ground.receiveShadow = false;
  g.add(ground);

  // 底座上沿的一圈极细亮边，强调“模型”
  const edgeMat = neon(0x9fc4ff, 0.55);
  const e1 = box(HALF * 2 + 0.02, 0.02, 0.03, edgeMat, [0, -0.012, HALF + 0.006]);
  const e2 = box(HALF * 2 + 0.02, 0.02, 0.03, edgeMat, [0, -0.012, -HALF - 0.006]);
  const e3 = box(0.03, 0.02, HALF * 2 + 0.02, edgeMat, [HALF + 0.006, -0.012, 0]);
  const e4 = box(0.03, 0.02, HALF * 2 + 0.02, edgeMat, [-HALF - 0.006, -0.012, 0]);
  [e1, e2, e3, e4].forEach((e) => { e.userData.noOutline = true; g.add(e); });

  return { group: g, ground };
}

/* ============================================================
   人行道：L 形（带街角圆弧）+ 盲道 + 马路牙子
   ============================================================ */

export function buildSidewalks() {
  const g = new THREE.Group();
  const H = L.WALK_Y;

  const walkMap = sidewalkTex();
  walkMap.repeat.set(0.5, 0.5);
  const walkMat = toon(0xffffff, {
    map: walkMap, rim: 0x6f9dc8, rimStr: 0.28, color: 0xb9c2d2,
  });
  // 侧面（马路牙子）颜色更亮，便于分色
  const curbMat = toon(0x9aa3b4, { rim: 0x8fc3ff, rimStr: 0.4 });

  // 转角 L 形形状（shape 坐标：u = x, v = -z）
  const s = new THREE.Shape();
  s.moveTo(-13, 1.2);
  s.lineTo(4.1, 1.2);
  s.quadraticCurveTo(5.4, 1.2, 5.4, 2.5);
  s.lineTo(5.4, 11.0);
  s.lineTo(3.6, 11.0);
  s.lineTo(3.6, 5.2);
  s.lineTo(-13, 5.2);
  s.closePath();
  const walk = extrudeFlat(s, H, walkMat);
  walk.castShadow = true;
  g.add(walk);

  // 盲道：沿正面人行道边缘
  const tacMap = tactileTex();
  tacMap.repeat.set(1, 1);
  const tacMat = toon(0xffffff, { map: tacMap, color: 0xd8bf6e, rim: 0xffe6a8, rimStr: 0.25 });
  const tacGeo = new THREE.PlaneGeometry(0.32, 0.32);
  const t1 = new THREE.Mesh(new THREE.PlaneGeometry(17.0, 0.34), tacMat);
  t1.rotation.x = -Math.PI / 2;
  t1.position.set(-4.0, H + 0.004, -1.55);
  g.add(t1);
  const t2 = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 5.6), tacMat);
  t2.rotation.x = -Math.PI / 2;
  t2.position.set(4.95, H + 0.004, -8.0);
  g.add(t2);

  // 人行道边缘的一圈深色压边（细线）
  const edgeMat = toon(0x6d7688);
  const edgeFront = box(18.6, 0.02, 0.07, edgeMat, [-3.8, H + 0.001, -1.235]);
  const edgeSide = box(0.07, 0.02, 5.9, edgeMat, [5.335, H + 0.001, -8.05]);
  [edgeFront, edgeSide].forEach((m) => g.add(m));

  return { group: g, walkMat, H };
}

/* 主路对面 & 侧街东侧的人行道（简单盒子） */
export function buildFarWalks() {
  const g = new THREE.Group();
  const mapA = sidewalkTex(); mapA.repeat.set(0.5, 0.5);
  const mapB = sidewalkTex(); mapB.repeat.set(0.5, 0.5);
  const matA = toon(0xffffff, { map: mapA, color: 0xa9b3c4, rim: 0x6f9dc8, rimStr: 0.22 });
  const matB = toon(0xffffff, { map: mapB, color: 0xa9b3c4, rim: 0x6f9dc8, rimStr: 0.22 });

  const south = new THREE.Mesh(new THREE.BoxGeometry(26, L.WALK_Y, L.SOUTH.z1 - L.SOUTH.z0), matA);
  south.position.set(0, L.WALK_Y / 2, (L.SOUTH.z0 + L.SOUTH.z1) / 2);
  south.receiveShadow = true;
  g.add(south);

  const east = new THREE.Mesh(new THREE.BoxGeometry(L.EAST.x1 - L.EAST.x0, L.WALK_Y, 11.2), matB);
  east.position.set((L.EAST.x0 + L.EAST.x1) / 2, L.WALK_Y / 2, -6.6);
  east.receiveShadow = true;
  g.add(east);


  return { group: g };
}

/* ============================================================
   路面标线 / 斑马线 / 停车位 / 井盖 / 排水沟
   ============================================================ */

export function buildRoadMarks() {
  const g = new THREE.Group();
  const white = flat(0x8b96a4);
  const whiteDim = flat(0x707b8a);
  const RY = 0.030;

  const addBox = (w, d, x, z, mat = white, h = 0.006) => {
    const m = box(w, h, d, mat, [x, RY, z]);
    m.userData.noOutline = true;
    g.add(m);
    return m;
  };

  // 主路中心虚线
  for (let x = -12.6; x < 13; x += 4.2) {
    if (x > -1.0 && x < 6.2) continue;
    addBox(2.4, 0.14, x, 1.82, whiteDim);
  }
  // 主路两边实线
  addBox(25.8, 0.1, 0, -0.72, whiteDim);
  addBox(25.8, 0.1, 0, 4.34, whiteDim);
  // 侧街中心虚线
  for (let z = -12.4; z < -5.0; z += 3.6) {
    addBox(0.12, 1.9, 8.0, z, whiteDim);
  }
  // 侧街边线
  addBox(0.1, 11.0, 5.72, -7.2, whiteDim);
  addBox(0.1, 11.0, 10.28, -7.2, whiteDim);

  // 斑马线：主路（跨东西向马路，行人走南北）
  for (let z = -1.05; z < 4.75; z += 0.92) {
    addBox(4.2, 0.46, -1.9, z, white);
  }
  // 斑马线：侧街（行人走东西）
  for (let x = 5.55; x < 10.5; x += 0.92) {
    addBox(0.46, 3.4, x, -3.3, white);
  }

  // 停止线（侧街）
  addBox(4.6, 0.3, 8.0, -5.75, white);

  // 「止まれ」路面文字
  const tm = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 3.0),
    new THREE.MeshBasicMaterial({ map: tomareTex(), transparent: true, depthWrite: false, color: 0xc8d2df, side: THREE.DoubleSide })
  );
  tm.rotation.x = -Math.PI / 2;
  tm.position.set(8.0, RY + 0.002, -7.6);
  tm.userData.noOutline = true;
  g.add(tm);

  // 停车位（便利店斜前方的路边停车位）
  const bayX0 = -9.6, bayX1 = -4.0, bayZ0 = -0.95, bayZ1 = 3.9;
  addBox(bayX1 - bayX0, 0.1, (bayX0 + bayX1) / 2, bayZ0, whiteDim);
  addBox(bayX1 - bayX0, 0.1, (bayX0 + bayX1) / 2, bayZ1, whiteDim);
  for (let i = 0; i <= 2; i++) {
    addBox(0.1, bayZ1 - bayZ0, bayX0 + i * (bayX1 - bayX0) / 2, (bayZ0 + bayZ1) / 2, whiteDim);
  }
  // 车挡
  const stopMat = toon(0xd8dde6, { rim: 0x8fb8e6, rimStr: 0.3 });
  for (let i = 0; i < 2; i++) {
    const cx = bayX0 + (i + 0.5) * (bayX1 - bayX0) / 2;
    const m = box(1.5, 0.1, 0.16, stopMat, [cx, 0.07, 3.5]);
    g.add(m);
    g.add(box(1.5, 0.06, 0.2, stopMat, [cx, 0.03, 3.5]));
  }

  // 井盖
  const mhMat = toon(0x5a6377, { rim: 0xa8c0e0, rimStr: 0.3 });
  const mh = cyl(0.36, 0.36, 0.03, mhMat, [-1.4, 0.036, 3.5], [0, 0, 0], 24);
  g.add(mh);
  const mhRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.35, 24), flat(0x3c4455));
  mhRing.rotation.x = -Math.PI / 2;
  mhRing.position.set(-1.4, 0.052, 3.5);
  g.add(mhRing);

  // 排水沟 + 雨水篦子
  const gutMat = flat(0x1a1f2a);
  const gut = box(26, 0.01, 0.26, gutMat, [0, 0.026, -1.03]);
  gut.userData.noOutline = true;
  g.add(gut);
  const grateMat = metal(0x59616f);
  for (const gx of [-8.4, -3.0, 2.2]) {
    const base = box(0.62, 0.02, 0.26, grateMat, [gx, 0.034, -1.03]);
    g.add(base);
    for (let i = 0; i < 5; i++) {
      g.add(box(0.05, 0.02, 0.22, flat(0x161b24), [gx - 0.24 + i * 0.12, 0.045, -1.03]));
    }
  }

  return g;
}

/* ============================================================
   积水贴片（人行道上）
   ============================================================ */

export function buildWalkPuddles(reflection) {
  const g = new THREE.Group();
  const mat = makePuddleOverlay(reflection, { scale: 0.9, opacity: 1 });
  const spots = [
    [-9.2, -3.4, 3.6, 2.2], [-1.0, -2.2, 2.6, 1.8], [3.0, -3.0, 2.0, 2.4],
    [-4.2, -8.2, 2.0, 2.6], [4.7, -9.0, 1.4, 2.2], [8.6, -2.6, 1.8, 1.2],
    [-11.4, 5.6, 2.4, 1.2], [6.4, 5.4, 2.2, 1.1],
  ];
  for (const [x, z, w, d] of spots) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1), mat);
    p.rotation.x = -Math.PI / 2;
    const onWalk = (x > -13 && x < 5.4 && z > -5.2 && z < -1.2) || (x > 3.6 && x < 5.4 && z > -11 && z < -5.2)
      || (z > 4.8 && z < 6.5) || (x > 10.6 && x < 12.0);
    p.position.set(x, onWalk ? L.WALK_Y + 0.006 : 0.032, z);
    p.userData.noOutline = true;
    g.add(p);
  }
  return g;
}
