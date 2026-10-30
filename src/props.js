import * as THREE from 'three';
import { G, M, box, cyl, rbox, roundedBoxGeo, plane, rod, sphere, torus, wire, mulberry32 } from './kit.js';
import { toon, neon, flat, glass, metal, C, outline } from './palette.js';
import {
  vendingTex, glowTex, grilleTex, noticeBoardTex, posterTex, guideSignTex,
  stopSignTex, stickerTex, concreteTex, brickTex, shutterTex,
} from './texture.js';
import { L } from './world.js';

const WY = L.WALK_Y;

function glowSprite(map, color, size, opacity = 0.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color: new THREE.Color(color), transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

/* ---------------- 自动贩卖机 ---------------- */
function vendingMachine(kind = 'red') {
  const g = new THREE.Group();
  const bodyCol = kind === 'red' ? 0xa82b35 : 0x26506e;
  const body = new THREE.Mesh(roundedBoxGeo(1.0, 1.86, 0.76, 0.06, 2), toon(bodyCol, { rim: 0xffc0c0, rimStr: 0.3 }));
  body.position.y = 0.93;
  body.castShadow = true;
  g.add(body);
  // 顶部压边
  g.add(box(1.02, 0.08, 0.78, toon(0x8f2028), [0, 1.86, 0]));
  // 正面贴图
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.94, 1.76),
    new THREE.MeshBasicMaterial({ map: vendingTex(kind), color: new THREE.Color(0.95, 0.95, 0.95), toneMapped: false })
  );
  face.position.set(0, 0.94, 0.385);
  g.add(face);
  // 出货口
  g.add(box(0.3, 0.14, 0.04, flat(0x0a0e14), [0, 0.28, 0.4]));
  // 底部踢脚
  g.add(box(0.98, 0.09, 0.72, toon(0x3a3f4a), [0, 0.045, 0]));
  // 光晕
  const sp = glowSprite(glowTex(0.55), kind === 'red' ? 0xff9a9a : 0x9fd8ff, 1.6, 0.22);
  sp.position.set(0, 1.1, 0.55);
  g.add(sp);
  return g;
}

/* ---------------- 自行车 ---------------- */
function bicycle(frameColor = 0x2f3a4d) {
  const g = new THREE.Group();
  const frame = toon(frameColor, { rim: 0x8fd0ff, rimStr: 0.4 });
  const chrome = metal(0x9aa6bb);
  const tyre = toon(0x181d27);
  const R = 0.34;

  const wheel = (x) => {
    const w = new THREE.Group();
    w.add(torus(R, 0.032, tyre, [0, 0, 0], [0, 0, 0], Math.PI * 2, 20));
    w.add(torus(R - 0.035, 0.014, chrome, [0, 0, 0], [0, 0, 0], Math.PI * 2, 20));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      w.add(rod([0, 0, 0], [Math.cos(a) * (R - 0.04), Math.sin(a) * (R - 0.04), 0], 0.006, chrome, 4));
    }
    w.add(cyl(0.03, 0.03, 0.07, chrome, [0, 0, 0], [Math.PI / 2, 0, 0], 8));
    w.position.set(x, R, 0);
    return w;
  };
  const rear = -0.48, front = 0.48;
  g.add(wheel(rear));
  g.add(wheel(front));

  const B = [0.0, 0.29], S = [-0.14, 0.86], Hd = [0.38, 0.88];
  // 车架
  g.add(rod([rear, R, 0], [S[0], S[1], 0], 0.022, frame));
  g.add(rod([S[0], S[1], 0], [B[0], B[1], 0], 0.022, frame));
  g.add(rod([B[0], B[1], 0], [rear, R, 0], 0.022, frame));
  g.add(rod([S[0], S[1], 0], [Hd[0], Hd[1], 0], 0.02, frame));
  g.add(rod([B[0], B[1], 0], [Hd[0], Hd[1] - 0.04, 0], 0.022, frame));
  g.add(rod([Hd[0], Hd[1], 0], [front, R, 0], 0.018, chrome));
  // 车把
  g.add(rod([Hd[0], Hd[1] + 0.02, -0.22], [Hd[0], Hd[1] + 0.02, 0.22], 0.016, chrome));
  g.add(rod([Hd[0] - 0.06, Hd[1], 0], [Hd[0], Hd[1] + 0.06, 0], 0.016, chrome));
  // 车座
  g.add(box(0.24, 0.06, 0.12, toon(0x1d222c), [S[0] - 0.02, S[1] + 0.05, 0]));
  // 车筐
  const basket = new THREE.Group();
  basket.add(box(0.3, 0.2, 0.26, flat(0x2a3444), [0, 0, 0]));
  for (let i = 0; i < 3; i++) basket.add(box(0.3, 0.012, 0.012, metal(0x8f9bb0), [0, -0.07 + i * 0.07, 0.14]));
  basket.position.set(Hd[0] + 0.16, Hd[1] - 0.12, 0);
  g.add(basket);
  // 挡泥板
  const fender = torus(0.36, 0.012, frame, [0, 0, 0], [0, 0, 0], Math.PI * 0.9, 12);
  fender.position.set(rear, R, 0); fender.rotation.z = 0.2;
  g.add(fender);
  // 脚撑
  g.add(rod([0.0, 0.28, 0.02], [-0.12, 0.0, 0.14], 0.014, chrome));
  // 反光片
  g.add(box(0.06, 0.03, 0.02, neon(0xff6b6b, 1.6), [-0.46, 0.55, 0.02]));
  return g;
}

/* ---------------- 垃圾桶 ---------------- */
function trashBin(color, label, labelBg) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(roundedBoxGeo(0.46, 0.72, 0.46, 0.05, 2), toon(color, { rim: 0xffffff, rimStr: 0.25 }));
  body.position.y = 0.36;
  g.add(body);
  g.add(box(0.5, 0.06, 0.5, toon(0x2c3440), [0, 0.74, 0]));
  g.add(box(0.2, 0.09, 0.03, flat(0x131820), [0, 0.56, 0.235]));
  const lb = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.17),
    new THREE.MeshBasicMaterial({ map: stickerTex(label, labelBg), color: 0xffffff, toneMapped: false })
  );
  lb.position.set(0, 0.36, 0.235);
  g.add(lb);
  return g;
}

/* ---------------- 伞架 ---------------- */
function umbrellaStand() {
  const g = new THREE.Group();
  const metalM = metal(0x8d97aa);
  g.add(box(0.52, 0.02, 0.26, metalM, [0, 0.24, 0]));
  g.add(box(0.52, 0.02, 0.26, metalM, [0, 0.02, 0]));
  for (const [dx, dz] of [[-0.24, -0.11], [0.24, -0.11], [-0.24, 0.11], [0.24, 0.11]]) {
    g.add(rod([dx, 0, dz], [dx, 0.26, dz], 0.012, metalM));
  }
  const cols = [0x2f6fa8, 0xc9433f, 0x4f8f6a];
  for (let i = 0; i < 3; i++) {
    const u = new THREE.Group();
    u.add(cyl(0.012, 0.012, 0.88, metalM, [0, 0.44, 0], [0, 0, 0], 6));
    // 伞头
    u.add(cyl(0.035, 0.02, 0.06, toon(0xd8b06a), [0, 0.9, 0], [0, 0, 0], 8));
    // 收拢的伞面
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.5, 8), toon(cols[i], { rim: 0xffffff, rimStr: 0.3 }));
    cone.position.y = 0.6;
    cone.rotation.x = Math.PI;
    u.add(cone);
    u.position.set(-0.16 + i * 0.16, 0.02, 0);
    u.rotation.z = (i - 1) * 0.12;
    g.add(u);
  }
  return g;
}

/* ---------------- 路灯 ---------------- */
function streetLamp() {
  const g = new THREE.Group();
  const poleM = toon(0x3d4554, { rim: 0x9fc8ff, rimStr: 0.4 });
  g.add(cyl(0.075, 0.095, 4.5, poleM, [0, 2.25, 0], [0, 0, 0], 10));
  g.add(cyl(0.14, 0.17, 0.2, poleM, [0, 0.1, 0], [0, 0, 0], 10));
  // 弯臂
  const armY = 4.45;
  g.add(rod([0, armY, 0], [0, armY + 0.28, 0], 0.055, poleM));
  g.add(rod([0, armY + 0.28, 0], [0.0, armY + 0.34, 0.75], 0.05, poleM));
  g.add(rod([0, armY + 0.34, 0.75], [0, armY + 0.3, 1.35], 0.05, poleM));
  // 灯头
  const head = box(0.4, 0.13, 0.62, poleM, [0, armY + 0.24, 1.45]);
  g.add(head);
  const lens = box(0.34, 0.03, 0.55, neon(0xffd28a, 3.4), [0, armY + 0.165, 1.45]);
  lens.userData.noOutline = true;
  g.add(lens);
  const sp = glowSprite(glowTex(0.45), 0xffc27a, 3.2, 0.6);
  sp.position.set(0, armY + 0.16, 1.45);
  g.add(sp);
  // 灯杆小旗
  g.add(box(0.02, 0.02, 0.5, flat(0x5b6376), [0.06, 3.2, 0.25]));
  return g;
}

/* ---------------- 电线杆 ---------------- */
function utilityPole(withTf = true) {
  const g = new THREE.Group();
  const conc = toon(0x9aa2b0, { rim: 0xbcd8ff, rimStr: 0.3 });
  // 水泥杆（锥形）
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 8.6, 10), conc);
  pole.position.y = 4.3;
  pole.castShadow = true;
  g.add(pole);
  // 黄黑警示带
  for (let i = 0; i < 3; i++) {
    g.add(box(0.34, 0.14, 0.34, flat(i % 2 ? 0x26282e : 0xd8b23a), [0, 0.3 + i * 0.16, 0]));
  }
  // 横担
  for (const y of [7.3, 7.9]) {
    g.add(box(1.5, 0.08, 0.1, toon(0x4a5262), [0, y, 0]));
    for (const dx of [-0.62, 0, 0.62]) {
      g.add(cyl(0.045, 0.045, 0.14, toon(0x8f99aa), [dx, y + 0.11, 0], [0, 0, 0], 8));
      g.add(cyl(0.07, 0.05, 0.06, toon(0x6c7788), [dx, y + 0.21, 0], [0, 0, 0], 8));
    }
  }
  if (withTf) {
    // 变压器
    const tf = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.62, 12), toon(0x5f6a7a));
    tf.position.set(0.0, 6.35, 0.34);
    g.add(tf);
    g.add(box(0.34, 0.06, 0.3, metal(0x7f8a9c), [0, 6.7, 0.34]));
    g.add(rod([0, 6.05, 0.34], [0, 5.7, 0.1], 0.03, metal(0x707b8d)));
    // 接线箱
    g.add(box(0.34, 0.5, 0.22, toon(0x6b7788), [0, 5.2, 0.2]));
  }
  // 爬杆脚钉
  for (let i = 0; i < 6; i++) {
    g.add(box(0.2, 0.02, 0.02, metal(0x8b95a6), [i % 2 ? 0.08 : -0.08, 2.2 + i * 0.55, 0.02]));
  }
  // 杆号牌
  g.add(box(0.14, 0.2, 0.02, flat(0xe8eef8), [0.0, 2.6, 0.19]));
  return g;
}

/* ---------------- 告示板 ---------------- */
function noticeBoard() {
  const g = new THREE.Group();
  g.add(box(1.66, 1.24, 0.08, toon(0x5b4636), [0, 0, 0]));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.08),
    new THREE.MeshBasicMaterial({ map: noticeBoardTex(), color: new THREE.Color(0.95, 0.95, 0.95), toneMapped: false })
  );
  face.position.z = 0.045;
  g.add(face);
  // 小灯
  g.add(box(0.3, 0.05, 0.12, toon(0x3d4554), [0, 0.68, 0.12]));
  g.add(box(0.26, 0.03, 0.1, neon(0xffe8b0, 1.8), [0, 0.65, 0.12]));
  return g;
}

/* ---------------- 空调外机 ---------------- */
function acUnit(scale = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(roundedBoxGeo(0.86 * scale, 0.6 * scale, 0.34 * scale, 0.03, 2), toon(0xc3cbd2, { rim: 0xbfd8ff, rimStr: 0.3 }));
  g.add(body);
  const grille = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6 * scale, 0.44 * scale),
    new THREE.MeshBasicMaterial({ map: grilleTex(), color: new THREE.Color(0.8, 0.84, 0.9) })
  );
  grille.position.z = 0.175 * scale;
  g.add(grille);
  g.add(box(0.86 * scale, 0.05 * scale, 0.36 * scale, metal(0x8b95a6), [0, 0.32 * scale, 0]));
  // 排水管
  g.add(rod([0.3 * scale, -0.2 * scale, 0.1], [0.32 * scale, -0.6 * scale, 0.2], 0.02, flat(0x6d7688)));
  return g;
}

/* ---------------- 小猫 ---------------- */
function cat() {
  const g = new THREE.Group();
  const fur = toon(0x3a3f4c, { rim: 0x9fc8ff, rimStr: 0.5 });
  const body = sphere(0.13, fur, [0, 0.14, 0], [1.0, 1.25, 1.0]);
  g.add(body);
  const head = sphere(0.1, fur, [0, 0.3, 0.03], [1.05, 0.95, 1.0]);
  g.add(head);
  const ear = new THREE.ConeGeometry(0.038, 0.075, 4);
  g.add(M(ear, fur, [-0.055, 0.375, 0.02], [0.1, 0, 0.25]));
  g.add(M(ear, fur, [0.055, 0.375, 0.02], [0.1, 0, -0.25]));
  // 眼睛
  const eyeM = neon(0xd8ffb0, 1.6);
  g.add(sphere(0.017, eyeM, [-0.038, 0.312, 0.088]));
  g.add(sphere(0.017, eyeM, [0.038, 0.312, 0.088]));
  // 尾巴
  const tail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, 0.1, -0.13),
    new THREE.Vector3(0.16, 0.09, -0.2),
    new THREE.Vector3(0.2, 0.02, -0.28),
    new THREE.Vector3(0.1, 0.02, -0.34),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 12, 0.02, 5, false), fur));
  // 前爪
  g.add(sphere(0.035, fur, [-0.05, 0.035, 0.11], [1, 0.7, 1.2]));
  g.add(sphere(0.035, fur, [0.05, 0.035, 0.11], [1, 0.7, 1.2]));
  return g;
}

/* ---------------- 交通标志杆 ---------------- */
function signPost() {
  const g = new THREE.Group();
  const poleM = metal(0x8d97aa);
  g.add(cyl(0.045, 0.05, 3.0, poleM, [0, 1.5, 0], [0, 0, 0], 8));
  // 停止标志（倒三角）
  const stop = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.72),
    new THREE.MeshBasicMaterial({ map: stopSignTex(), transparent: true, side: THREE.DoubleSide, color: new THREE.Color(1.15, 1.15, 1.15), toneMapped: false })
  );
  stop.position.set(0, 2.55, 0.03);
  stop.rotation.y = Math.PI * 0.5;
  g.add(stop);
  // 蓝色方向牌
  const guide = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 0.56),
    new THREE.MeshBasicMaterial({ map: guideSignTex(), side: THREE.DoubleSide, color: new THREE.Color(0.9, 0.95, 1.1), toneMapped: false })
  );
  guide.position.set(0, 1.85, 0.03);
  guide.rotation.y = Math.PI * 0.5;
  g.add(guide);
  g.add(box(1.14, 0.58, 0.02, toon(0x4a5262), [0, 1.85, 0.0], [0, Math.PI * 0.5, 0]));
  // 小箭头牌
  return g;
}

/* ---------------- 护栏 ---------------- */
function guardrail(length, posts = 8) {
  const g = new THREE.Group();
  const m = toon(0xc8cfda, { rim: 0xbfe0ff, rimStr: 0.45 });
  const dark = toon(0x8b95a6);
  for (let i = 0; i <= posts; i++) {
    const x = -length / 2 + (length * i) / posts;
    g.add(cyl(0.035, 0.04, 0.78, dark, [x, 0.39, 0], [0, 0, 0], 8));
    g.add(box(0.1, 0.06, 0.1, dark, [x, 0.8, 0]));
  }
  g.add(box(length, 0.055, 0.055, m, [0, 0.74, 0]));
  g.add(box(length, 0.05, 0.05, m, [0, 0.52, 0]));
  return g;
}

/* ---------------- 折叠立牌 ---------------- */
function aFrameSign() {
  const g = new THREE.Group();
  const boardM = toon(0xe8eef2, { rim: 0xffffff, rimStr: 0.2 });
  for (const s of [-1, 1]) {
    const b = box(0.62, 0.9, 0.03, boardM, [0, 0.46, s * 0.13], [s * 0.12, 0, 0]);
    g.add(b);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.82),
      new THREE.MeshBasicMaterial({ map: posterTex(0), color: new THREE.Color(0.9, 0.9, 0.9) })
    );
    face.position.set(0, 0.47, s * (0.145 + 0.02));
    face.rotation.y = s > 0 ? 0 : Math.PI;
    face.rotation.x = s * -0.12;
    g.add(face);
  }
  g.add(box(0.64, 0.05, 0.06, metal(0x8b95a6), [0, 0.94, 0]));
  return g;
}

/* ============================================================
   汇总
   ============================================================ */

export function buildProps() {
  const g = new THREE.Group();
  const lights = [];

  /* 自动贩卖机（两台，便利店左侧） */
  const v1 = vendingMachine('red');
  v1.position.set(-8.45, WY, -4.72);
  g.add(v1);
  const v2 = vendingMachine('blue');
  v2.position.set(-7.35, WY, -4.72);
  g.add(v2);
  const vLight = new THREE.PointLight(0xffd0c0, 5.5, 4.2, 2);
  vLight.position.set(-7.9, WY + 1.1, -4.1);
  lights.push(vLight);
  g.add(vLight);

  /* 蹲在贩卖机边的小猫 */
  const strayCat = cat();
  strayCat.position.set(-6.62, WY, -4.05);
  strayCat.rotation.y = -0.55;
  strayCat.scale.setScalar(1.1);
  g.add(strayCat);

  /* 巷口地面的暖光池 */
  const alleyPool = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3.2),
    new THREE.MeshBasicMaterial({
      map: glowTex(0.8), color: new THREE.Color(0xffb678).multiplyScalar(0.5),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    })
  );
  alleyPool.rotation.x = -Math.PI / 2;
  alleyPool.position.set(-6.1, WY + 0.014, -6.6);
  alleyPool.userData.noOutline = true;
  g.add(alleyPool);

  /* 门口伞架 & 立牌 & 花盆 */
  const us = umbrellaStand();
  us.position.set(-1.42, WY, -4.52);
  g.add(us);
  const af = aFrameSign();
  af.position.set(2.62, WY, -4.45);
  af.rotation.y = -0.25;
  g.add(af);

  // 花盆
  for (const [px, pz, s] of [[-3.15, -4.55, 1.0], [3.05, -4.62, 0.85]]) {
    const pot = new THREE.Group();
    pot.add(cyl(0.14 * s, 0.11 * s, 0.22 * s, toon(0x8a5a48), [0, 0.11 * s, 0], [0, 0, 0], 10));
    pot.add(cyl(0.15 * s, 0.15 * s, 0.03 * s, toon(0x6d4436), [0, 0.22 * s, 0], [0, 0, 0], 10));
    const leafM = toon(0x2f5a44, { rim: 0x7fffc0, rimStr: 0.4 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      pot.add(sphere(0.1 * s, leafM, [Math.cos(a) * 0.09 * s, (0.32 + (i % 2) * 0.07) * s, Math.sin(a) * 0.09 * s], [1, 1.3, 1]));
    }
    pot.position.set(px, WY, pz);
    g.add(pot);
  }

  /* 垃圾桶（便利店东侧墙边） */
  const bins = [['#3f7fbf', 'かん', '#2b5f94'], ['#4f9a6a', 'ペット', '#327a4d'], ['#c49a3a', 'ビン', '#9c7526']];
  bins.forEach((b, i) => {
    const t = trashBin(new THREE.Color(b[0]).getHex(), b[1], b[2]);
    t.position.set(4.05, WY, -6.35 - i * 0.58);
    t.rotation.y = Math.PI / 2;
    g.add(t);
  });

  /* 自行车（靠墙停放两台） */
  const b1 = bicycle(0x2f3a4d);
  b1.position.set(4.5, WY, -8.55);
  b1.rotation.y = Math.PI * 0.5;
  b1.rotation.z = 0.12;
  g.add(b1);
  const b2 = bicycle(0x6b3f4a);
  b2.position.set(4.62, WY, -9.75);
  b2.rotation.y = Math.PI * 0.52;
  b2.rotation.z = -0.1;
  g.add(b2);
  // 自行车停放牌
  const bp = new THREE.Group();
  bp.add(cyl(0.03, 0.03, 1.1, metal(0x8b95a6), [0, 0.55, 0], [0, 0, 0], 6));
  const bps = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.3),
    new THREE.MeshBasicMaterial({ map: stickerTex('駐輪', '#2b6f5e'), side: THREE.DoubleSide, toneMapped: false })
  );
  bps.position.set(0, 1.0, 0);
  bps.rotation.y = Math.PI * 0.5;
  bp.add(bps);
  bp.position.set(4.75, WY, -10.6);
  g.add(bp);

  /* 路灯（街角） */
  const lamp = streetLamp();
  lamp.position.set(5.05, WY, -1.95);
  lamp.rotation.y = -Math.PI * 0.18;
  g.add(lamp);

  // 灯光：路灯聚光（投影）
  const spot = new THREE.SpotLight(0xffb066, 60, 16, 0.92, 0.55, 1.8);
  spot.position.set(5.05, WY + 4.7, -0.62);
  spot.target.position.set(4.0, 0, 0.6);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.camera.near = 0.5;
  spot.shadow.camera.far = 20;
  spot.shadow.bias = -0.0006;
  spot.shadow.normalBias = 0.02;
  lights.push(spot);
  g.add(spot, spot.target);
  const lampGlow = glowSprite(glowTex(0.4), 0xffb877, 5.5, 0.34);
  lampGlow.position.set(5.05, WY + 4.72, -0.6);
  g.add(lampGlow);

  /* 电线杆 + 电线 */
  const p1 = utilityPole(true);
  p1.position.set(5.12, 0, -10.5);
  g.add(p1);
  const p2 = utilityPole(true);
  p2.position.set(-12.55, 0, 5.85);
  p2.rotation.y = 0.3;
  g.add(p2);
  const p3 = utilityPole(false);
  p3.position.set(11.0, 0, -3.6);
  p3.scale.setScalar(0.94);
  g.add(p3);

  const wireMat = toon(0x14181f, { rim: 0x7fa8d8, rimStr: 0.5 });
  const top1 = new THREE.Vector3(5.12, 8.35, -10.5);
  const top2 = new THREE.Vector3(-12.55, 8.35, 5.85);
  const top3 = new THREE.Vector3(11.3, 7.9, -4.2);
  const bundle = (a, b, n, dx, dy, sag) => {
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 0.16;
      const A = a.clone().add(new THREE.Vector3(dx ? off : 0, off * 0.35, dx ? 0 : off));
      const B = b.clone().add(new THREE.Vector3(dx ? off : 0, off * 0.35, dx ? 0 : off));
      g.add(wire(A, B, sag + i * 0.06, 0.018, wireMat));
    }
  };
  bundle(top1, top2, 4, true, 0, 0.9);
  bundle(top1, top3, 3, true, 0, 0.35);
  bundle(top3, top2, 3, true, 0, 0.8);
  // 引出底座的电线
  g.add(wire(top2, new THREE.Vector3(-13.2, 8.0, 8.6), 0.4, 0.018, wireMat));
  g.add(wire(top1, new THREE.Vector3(5.4, 8.1, -13.2), 0.35, 0.018, wireMat));
  g.add(wire(top3, new THREE.Vector3(13.2, 7.7, -4.4), 0.3, 0.018, wireMat));
  // 入户线到便利店
  g.add(wire(new THREE.Vector3(5.12, 7.6, -10.5), new THREE.Vector3(3.4, 4.6, -9.2), 0.5, 0.016, wireMat));

  /* 交通标志 */
  const sp = signPost();
  sp.position.set(4.32, WY, -1.72);
  sp.rotation.y = Math.PI * 0.5 + 0.1;
  g.add(sp);

  /* 告示板（邻家墙上） */
  const nb = noticeBoard();
  nb.position.set(-9.6, 1.85, -5.16);
  g.add(nb);

  /* 空调外机 */
  const ac1 = acUnit(1.0);
  ac1.position.set(-11.6, 2.35, -5.05);
  g.add(ac1);
  const ac2 = acUnit(0.85);
  ac2.position.set(-6.62, 1.15, -9.4);
  ac2.rotation.y = Math.PI * 0.5;
  g.add(ac2);
  const ac3 = acUnit(1.1);
  ac3.position.set(11.22, 2.6, -7.4);
  ac3.rotation.y = -Math.PI * 0.5;
  g.add(ac3);

  /* 小巷里的杂物 */
  const rnd = mulberry32(4321);
  // 木箱
  for (let i = 0; i < 3; i++) {
    const c = box(0.5, 0.4, 0.42, toon(0x7a5f45), [-5.9 + i * 0.55, 0.2 + (i === 2 ? 0.4 : 0), -10.6 - (i === 2 ? 0 : 0)]);
    g.add(c);
  }
  // 啤酒箱
  for (let i = 0; i < 2; i++) {
    g.add(box(0.44, 0.28, 0.34, toon(0x8f2f38), [-4.35, 0.14 + i * 0.29, -10.3]));
  }
  // 垃圾袋
  for (let i = 0; i < 4; i++) {
    const s = sphere(0.2 + rnd() * 0.06, toon(0x2a2f3a, { rim: 0x8fb8ff, rimStr: 0.4 }), [-6.3 + rnd() * 0.4, 0.2, -6.1 - i * 0.42], [1, 1.15, 1]);
    g.add(s);
  }
  // 猫
  const c = cat();
  c.position.set(-5.35, 0.6, -9.35);
  c.rotation.y = 0.5;
  g.add(c);
  // 小巷吊灯
  const alleyLamp = new THREE.Group();
  alleyLamp.add(cyl(0.1, 0.13, 0.16, toon(0x3d4554), [0, 0, 0], [0, 0, 0], 10));
  alleyLamp.add(cyl(0.09, 0.09, 0.02, neon(0xffe2b0, 2.6), [0, -0.09, 0], [0, 0, 0], 10));
  alleyLamp.position.set(-6.2, 2.75, -8.6);
  g.add(alleyLamp);
  const ag = glowSprite(glowTex(0.45), 0xffc98a, 2.6, 0.45);
  ag.position.copy(alleyLamp.position).add(new THREE.Vector3(0, -0.1, 0));
  g.add(ag);
  const alleyLight = new THREE.PointLight(0xffb877, 10, 6.5, 2);
  alleyLight.position.set(-5.9, 2.5, -8.6);
  lights.push(alleyLight);
  g.add(alleyLight);
  // 小巷后门
  g.add(box(1.0, 2.0, 0.08, toon(0x3f4a56), [-5.6, 1.0, -11.0]));
  g.add(box(0.08, 0.16, 0.06, neon(0xffdca0, 1.6), [-5.1, 1.1, -10.95]));

  /* 主路对面护栏 */
  const gr = guardrail(19, 9);
  gr.position.set(-2.0, WY, 5.12);
  g.add(gr);
  const gr2 = guardrail(6.5, 3);
  gr2.position.set(10.72, WY, -6.2);
  gr2.rotation.y = Math.PI * 0.5;
  g.add(gr2);

  /* 停车位标识柱 */
  const pp = new THREE.Group();
  pp.add(cyl(0.035, 0.035, 2.3, metal(0x8b95a6), [0, 1.15, 0], [0, 0, 0], 8));
  const ppS = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.68),
    new THREE.MeshBasicMaterial({ map: stickerTex('P', '#1f5f9e'), side: THREE.DoubleSide, toneMapped: false, transparent: true })
  );
  ppS.position.set(0, 2.05, 0);
  ppS.rotation.y = Math.PI * 0.35;
  pp.add(ppS);
  pp.position.set(-6.4, 0, 4.15);
  g.add(pp);

  return { group: g, lights };
}
