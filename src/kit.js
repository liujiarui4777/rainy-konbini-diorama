import * as THREE from 'three';

/* ============================================================
   基础几何工具：整个场景都是用小盒子 / 圆柱 / 圆角体堆出来的
   ============================================================ */

export const G = (...children) => {
  const g = new THREE.Group();
  for (const c of children) if (c) g.add(c);
  return g;
};

const V = (p) => (p instanceof THREE.Vector3 ? p : new THREE.Vector3(p[0], p[1], p[2]));
const R = (r) => (r instanceof THREE.Euler ? r : new THREE.Euler(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0));

/** 直接构造 Mesh：几何 + 材质 + 位置/旋转/缩放 */
export function M(geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(V(p));
  m.rotation.copy(R(r));
  m.scale.set(s[0], s[1], s[2]);
  return m;
}

export function box(w, h, d, mat, p, r) {
  return M(new THREE.BoxGeometry(w, h, d), mat, p, r);
}

export function rbox(w, h, d, rad, mat, p, r, seg = 2) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  // 用挤压方式近似圆角太贵，这里直接用 Box 的球面膨胀法生成圆角盒
  return M(roundedBoxGeo(w, h, d, rad, seg), mat, p, r);
}

/* 圆角盒：把 Box 的顶点按半边长做球面收边（够用且便宜） */
const roundedCache = new Map();
export function roundedBoxGeo(w, h, d, radius, segments = 3) {
  const key = [w, h, d, radius, segments].join('|');
  if (roundedCache.has(key)) return roundedCache.get(key);
  const r = Math.min(radius, Math.min(w, h, d) * 0.49);
  const g = new THREE.BoxGeometry(w, h, d, segments, segments, segments);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const cx = Math.max(-hx, Math.min(hx, x));
    const cy = Math.max(-hy, Math.min(hy, y));
    const cz = Math.max(-hz, Math.min(hz, z));
    n.set(x - cx, y - cy, z - cz);
    if (n.lengthSq() < 1e-10) { n.set(0, 1, 0); } else n.normalize();
    pos.setXYZ(i, cx + n.x * r, cy + n.y * r, cz + n.z * r);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  g.computeBoundingSphere();
  roundedCache.set(key, g);
  return g;
}

export function cyl(rTop, rBottom, h, mat, p, r, seg = 14) {
  return M(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat, p, r);
}

export function plane(w, h, mat, p, r) {
  return M(new THREE.PlaneGeometry(w, h), mat, p, r);
}

export function torus(radius, tube, mat, p, r, arc = Math.PI * 2, seg = 18) {
  return M(new THREE.TorusGeometry(radius, tube, 8, seg, arc), mat, p, r);
}

export function sphere(radius, mat, p, s = [1, 1, 1], seg = 12) {
  return M(new THREE.SphereGeometry(radius, seg, Math.max(6, seg * 0.7 | 0)), mat, p, [0, 0, 0], s);
}

/** 两点之间的圆柱（电线杆斜撑、自行车车架、栏杆等） */
export function rod(a, b, radius, mat, seg = 8) {
  const pa = V(a), pb = V(b);
  const dir = new THREE.Vector3().subVectors(pb, pa);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(radius, radius, len, seg);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(pa).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return m;
}

/** 垂下的电线 / 缆绳：用带垂度的曲线做管状体 */
export function wire(a, b, sag, radius, mat, seg = 24) {
  const pa = V(a), pb = V(b);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = pa.x + (pb.x - pa.x) * t;
    const z = pa.z + (pb.z - pa.z) * t;
    const y = pa.y + (pb.y - pa.y) * t - Math.sin(Math.PI * t) * sag;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius, 4, false), mat);
}

/** 带贴图的立牌/贴片（朝向 -z 的正面） */
export function decal(w, h, mat, p, r) {
  return M(new THREE.PlaneGeometry(w, h), mat, p, r);
}

/** 关闭阴影的快捷设定 */
export function noShadow(obj) { obj.traverse(o => { o.castShadow = false; o.receiveShadow = false; }); return obj; }

/* 确定性随机，保证每次刷新场景一致 */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
