import * as THREE from 'three';
import { G, M, box, cyl, sphere, rod, plane, torus, mulberry32, roundedBoxGeo } from './kit.js';
import { toon, neon, flat, metal, C } from './palette.js';
import { brickTex, concreteTex, shutterTex, stickerTex, glowTex, posterTex } from './texture.js';
import { L } from './world.js';

const WY = L.WALK_Y;

function glowSprite(map, color, size, opacity = 0.5) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color: new THREE.Color(color), transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

/* 一扇发光窗 */
function lightWindow(x, y, z, w, h, rotY, color, { curtain = false, bare = false } = {}) {
  const g = new THREE.Group();
  const frameM = toon(0x3a4152);
  g.add(box(w + 0.1, h + 0.1, 0.08, frameM, [0, 0, 0]));
  if (!bare) {
    const paneM = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), toneMapped: false });
    g.add(box(w, h, 0.02, paneM, [0, 0, 0.05]));
    // 窗格
    g.add(box(0.035, h, 0.04, frameM, [0, 0, 0.065]));
    g.add(box(w, 0.035, 0.04, frameM, [0, 0, 0.065]));
    if (curtain) {
      g.add(box(w * 0.45, h * 0.94, 0.015, toon(0xcfc0a8), [w * 0.24, 0, 0.075]));
    }
  } else {
    g.add(box(w, h, 0.02, flat(0x0e1220), [0, 0, 0.05]));
    g.add(box(0.03, h, 0.04, frameM, [0, 0, 0.065]));
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  return g;
}

/* ---------------- 邻家：两层老楼（便利店西侧） ---------------- */
function westNeighbor() {
  const g = new THREE.Group();
  const bx0 = -13, bx1 = -6.6, bz0 = -11.0, bz1 = -5.2;
  const w = bx1 - bx0, d = bz1 - bz0;
  const cx = (bx0 + bx1) / 2;
  const h = 6.1;

  const wallTex = brickTex();
  wallTex.repeat.set(4, 3);
  const wallMat = toon(0x8f7f86, { map: wallTex, rim: 0x9fc8ff, rimStr: 0.22 });
  const wallMat2 = toon(0x7d7076, { rim: 0x9fc8ff, rimStr: 0.18 });

  // 主体
  const body = box(w, h, d, wallMat, [cx, h / 2, (bz0 + bz1) / 2]);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // 二层挑出的檐
  g.add(box(w + 0.24, 0.16, d + 0.2, toon(0x4a4550), [cx, 3.32, (bz0 + bz1) / 2]));
  g.add(box(w + 0.16, 0.12, d + 0.1, toon(0x3b3742), [cx, h - 0.06, (bz0 + bz1) / 2]));

  // 一层卷帘门（两间）
  const shTex = shutterTex();
  const shMat = toon(0x6f7688, { map: shTex, rim: 0x9fc8ff, rimStr: 0.25 });
  for (const sx of [-11.4, -8.6]) {
    g.add(box(2.3, 2.5, 0.1, shMat, [sx, 1.28, bz1 + 0.03]));
    g.add(box(2.5, 0.16, 0.22, toon(0x3a4152), [sx, 2.62, bz1 + 0.06]));
    // 卷帘门上的小海报
    const pm = posterTex(sx < -10 ? 1 : 2);
    const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.84), new THREE.MeshBasicMaterial({ map: pm, color: 0xdddddd }));
    pp.position.set(sx + 0.6, 1.5, bz1 + 0.09);
    g.add(pp);
  }
  // 居酒屋入口 + 门帘 + 灯笼
  const doorX = -7.6;
  g.add(box(1.0, 2.2, 0.1, toon(0x2b2f3a), [doorX, 1.1, bz1 + 0.02]));
  g.add(box(1.06, 0.06, 0.5, toon(0x3a4152), [doorX, 2.28, bz1 + 0.24]));
  // 暖帘
  const norenM = toon(0x8c3a44, { rim: 0xffb0c0, rimStr: 0.3 });
  for (let i = 0; i < 3; i++) {
    g.add(box(0.3, 0.62, 0.02, norenM, [doorX - 0.33 + i * 0.33, 1.95, bz1 + 0.16]));
  }
  // 红灯笼
  const lantern = sphere(0.13, neon(0xff6b5a, 1.5), [doorX + 0.72, 2.15, bz1 + 0.28], [1, 1.25, 1], 10);
  g.add(lantern);
  g.add(cyl(0.05, 0.05, 0.05, toon(0x2b2f3a), [doorX + 0.72, 2.33, bz1 + 0.28], [0, 0, 0], 8));
  g.add(glowSprite(glowTex(0.5), 0xff7a5a, 1.5, 0.5).translateX(doorX + 0.72).translateY(2.15).translateZ(bz1 + 0.4));

  // 竖招牌「スナック」
  const vs = new THREE.Group();
  vs.add(box(0.42, 1.5, 0.1, toon(0x2a2230), [0, 0, 0]));
  const vt = stickerTex('スナック', '#7a2340');
  for (const dz of [-1, 1]) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.34),
      new THREE.MeshBasicMaterial({ map: vt, color: new THREE.Color(1.9, 1.2, 1.5), toneMapped: false })
    );
    p.position.set(0, 0.42, dz * 0.052);
    if (dz < 0) p.rotation.y = Math.PI;
    vs.add(p);
  }
  const neonBar = box(0.36, 0.06, 0.06, neon(0xff5fa8, 2.6), [0, -0.5, 0]);
  vs.add(neonBar);
  vs.position.set(-6.78, 3.9, bz1 + 0.4);
  g.add(vs);
  g.add(glowSprite(glowTex(0.55), 0xff5fa8, 2.6, 0.4).translateX(-6.78).translateY(3.6).translateZ(bz1 + 0.7));

  // 二层窗
  const winY = 4.9;
  for (let i = 0; i < 3; i++) {
    const x = -11.6 + i * 2.35;
    const lit = i !== 1;
    g.add(lightWindow(x, winY, bz1 + 0.02, 1.1, 1.2, 0, lit ? 0xffd9a0 : 0x33405a, { curtain: lit }));
    // 小窗台
    g.add(box(1.3, 0.08, 0.2, toon(0x4a4550), [x, winY - 0.66, bz1 + 0.06]));
  }
  // 竖排水管
  g.add(cyl(0.055, 0.055, h - 0.2, toon(0x5c6373), [-13.06, h / 2 - 0.1, bz1 + 0.06], [0, 0, 0], 8));
  // 屋顶水箱 / 楼梯间
  g.add(box(1.6, 1.0, 1.4, toon(0x5f6675), [-11.6, h + 0.5, -8.2]));
  g.add(cyl(0.4, 0.4, 1.0, toon(0x7a8496), [-9.2, h + 0.9, -8.6], [0, 0, 0], 12));
  g.add(box(0.1, 0.7, 0.1, metal(0x6b7588), [-9.2, h + 0.35, -8.6]));

  // 屋顶设备
  g.add(box(0.9, 0.6, 0.5, toon(0x9aa3b2), [-9.4, h + 0.4, -6.4]));
  g.add(box(0.9, 0.05, 0.52, metal(0x8b95a6), [-9.4, h + 0.72, -6.4]));
  g.add(cyl(0.06, 0.06, 1.2, metal(0x7d8698), [-7.2, h + 0.7, -9.6]));
  for (let i = 0; i < 3; i++) g.add(box(1.4, 0.04, 0.04, metal(0x6b7588), [-12.2, h + 0.5 + i * 0.25, -6.0]));
  // 灯光
  g.add(appPoint(0xffb877, 5, 5.2, doorX, 2.0, bz1 + 0.6));
  g.add(appPoint(0xffcfa0, 4, 5.0, -11.2, 4.9, bz1 - 0.4));
  return g;
}

function appPoint(color, intensity, dist, x, y, z) {
  const p = new THREE.PointLight(color, intensity, dist, 2);
  p.position.set(x, y, z);
  return p;
}

/* ---------------- 街尾建筑（侧街尽头） ---------------- */
function streetEnd() {
  const g = new THREE.Group();
  const w = 6.4, h = 5.4, d = 2.2;
  const cx = 8.0, cz = -12.2;
  const wallMat = toon(0x7b8794, { rim: 0x9fc8ff, rimStr: 0.2 });
  const body = box(w, h, d, wallMat, [cx, h / 2, cz]);
  body.castShadow = true;
  g.add(body);
  g.add(box(w + 0.2, 0.14, d + 0.16, toon(0x3b4252), [cx, h - 0.05, cz]));
  // 一层小商铺
  g.add(box(2.2, 2.2, 0.1, toon(0x5b6472), [cx - 1.2, 1.1, cz + d / 2 + 0.02]));
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 2.0),
    new THREE.MeshBasicMaterial({ map: shutterTex(), color: new THREE.Color(0.7, 0.72, 0.8) })
  );
  sh.position.set(cx - 1.2, 1.05, cz + d / 2 + 0.09);
  g.add(sh);
  // 自动售货机照明的小窗
  g.add(lightWindow(cx + 1.5, 1.65, cz + d / 2 + 0.02, 1.3, 1.1, 0, 0xffd9a0));
  g.add(lightWindow(cx - 1.0, 3.9, cz + d / 2 + 0.02, 1.2, 1.0, 0, 0x5a7099, { bare: true }));
  g.add(lightWindow(cx + 1.6, 3.9, cz + d / 2 + 0.02, 1.2, 1.0, 0, 0xffd9a0, { curtain: true }));
  // 屋顶小披屋
  g.add(box(2.2, 0.8, 1.4, toon(0x555c6c), [cx + 1.4, h + 0.4, cz - 0.2]));
  return g;
}

/* ---------------- 东侧：二层商铺（居酒屋 + 霓虹） ---------------- */
function eastBlock() {
  const g = new THREE.Group();
  const bx0 = 11.4, bx1 = 13.0, bz0 = -12.4, bz1 = -1.2;
  const w = bx1 - bx0, d = bz1 - bz0;
  const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
  const h = 6.4;
  const conc = concreteTex();
  conc.repeat.set(1.5, 2);
  const wallMat = toon(0x8d94a2, { map: conc, rim: 0x9fc8ff, rimStr: 0.2 });
  const body = box(w, h, d, wallMat, [cx, h / 2, cz]);
  body.castShadow = true;
  g.add(body);
  // 檐线
  for (const y of [3.3, 6.0]) {
    g.add(box(w + 0.16, 0.12, d + 0.06, toon(0x4a5163), [cx, y, cz]));
  }
  // 面向街道的立面（-x 方向）
  const fx = bx0 - 0.01;
  // 一层：居酒屋入口 + 暖帘 + 红灯笼
  g.add(box(0.1, 2.3, 1.4, toon(0x2e3038), [fx, 1.15, -3.2]));
  g.add(box(0.3, 0.1, 1.7, toon(0x3d4554), [fx - 0.1, 2.45, -3.2]));
  const norenM = toon(0x223a52, { rim: 0x9fd8ff, rimStr: 0.3 });
  for (let i = 0; i < 3; i++) {
    g.add(box(0.02, 0.6, 0.42, norenM, [fx - 0.16, 2.05, -3.2 - 0.55 + i * 0.45]));
  }
  const lant = sphere(0.14, neon(0xff6b4a, 1.6), [fx - 0.3, 2.15, -2.35], [1, 1.3, 1], 10);
  g.add(lant);
  // 竖霓虹招牌「居酒屋」
  const nm = stickerTex('居酒屋', '#7a2a12');
  const neonBoard = box(0.1, 1.9, 0.5, toon(0x241f28), [fx - 0.28, 4.0, -5.4]);
  g.add(neonBoard);
  for (const dz of [-1, 1]) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 1.5),
      new THREE.MeshBasicMaterial({ map: nm, color: new THREE.Color(2.0, 1.35, 0.95), toneMapped: false })
    );
    p.position.set(fx - 0.28, 4.0, -5.4 + dz * 0.26);
    p.rotation.y = dz > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(p);
  }
  g.add(glowSprite(glowTex(0.5), 0xffa060, 3.4, 0.35).translateX(fx - 0.5).translateY(4.0).translateZ(-5.4));
  // 霓虹灯管
  const tube = neon(0xff8a4a, 2.4);
  g.add(box(0.04, 0.04, 1.6, tube, [fx - 0.34, 5.35, -5.4]));
  g.add(box(0.04, 0.04, 1.6, neon(0x7fd8ff, 2.2), [fx - 0.34, 5.5, -5.4]));

  // 二层窗
  for (let i = 0; i < 4; i++) {
    const z = -10.6 + i * 2.4;
    g.add(lightWindow(fx - 0.02, 4.7, z, 1.2, 1.1, -Math.PI / 2, i % 2 ? 0xffd9a0 : 0x4a5f80, { curtain: i % 2 === 0 }));
  }
  // 三层小窗
  for (let i = 0; i < 3; i++) {
    const z = -9.4 + i * 3.0;
    g.add(lightWindow(fx - 0.02, 6.6, z, 0.8, 0.7, -Math.PI / 2, 0xffe0b0, { bare: i === 1 }));
  }
  // 空调外机 & 管道
  g.add(box(0.4, 0.62, 0.86, toon(0xc3cbd2), [fx - 0.25, 3.85, -8.6]));
  const acFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.5),
    new THREE.MeshBasicMaterial({ map: stickerTex('エアコン', '#8a94a4'), color: 0xffffff })
  );
  acFace.position.set(fx - 0.46, 3.85, -8.6);
  acFace.rotation.y = -Math.PI / 2;
  g.add(acFace);
  g.add(cyl(0.05, 0.05, 5.6, toon(0x6d7688), [fx - 0.06, 2.8, -1.6], [0, 0, 0], 8));

  // 一层另一间：小玻璃门（便利店对面）
  g.add(box(0.08, 2.2, 1.2, toon(0x37404e), [fx, 1.1, -10.0]));
  g.add(lightWindow(fx - 0.02, 1.5, -10.0, 1.0, 1.4, -Math.PI / 2, 0x8fd8e8, { bare: true }));

  /* 建筑背面（朝向底座外缘）：补足细节，避免出现大片空墙 */
  const ox = bx1 + 0.01;
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 3; i++) {
      const z = -10.4 + i * 3.2 + f * 0.4;
      const lit = (i + f) % 3 !== 1;
      g.add(lightWindow(ox, 4.4 + f * 0.25, z, 1.1, 1.0, Math.PI / 2, lit ? 0xffd9a0 : 0x2a3550, { curtain: lit, bare: !lit }));
    }
  }
  // 背面空调外机 + 管道
  g.add(box(0.4, 0.6, 0.8, toon(0xc3cbd2), [ox + 0.2, 3.4, -7.0]));
  g.add(box(0.3, 0.5, 0.7, toon(0xb8c0c9), [ox + 0.2, 1.6, -9.6]));
  g.add(cyl(0.05, 0.05, 5.8, toon(0x6d7688), [ox + 0.08, 2.9, -1.7], [0, 0, 0], 8));
  g.add(cyl(0.05, 0.05, 5.8, toon(0x6d7688), [ox + 0.08, 2.9, -12.0], [0, 0, 0], 8));
  // 背面竖招牌（洗衣店）
  const wm = stickerTex('クリーニング', '#1f5f9e');
  g.add(box(0.12, 2.4, 0.62, toon(0x22303c), [ox + 0.06, 4.1, -8.4]));
  for (const dz of [-1, 1]) {
    const pp = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 2.2),
      new THREE.MeshBasicMaterial({ map: wm, color: new THREE.Color(1.5, 1.6, 1.9), toneMapped: false })
    );
    pp.position.set(ox + 0.13, 4.1, -8.4 + dz * 0.32);
    pp.rotation.y = dz > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(pp);
  }
  g.add(glowSprite(glowTex(0.55), 0x7fb8ff, 3.0, 0.28).translateX(ox + 0.5).translateY(4.1).translateZ(-8.4));
  // 屋顶：水箱 + 小屋 + 天线
  g.add(box(1.6, 1.0, 1.6, toon(0x666e7d), [cx, h + 0.55, cz + 1.5]));
  g.add(cyl(0.5, 0.5, 0.9, toon(0x7f8798), [cx, h + 0.5, cz - 1.8], [0, 0, 0], 12));
  g.add(box(0.06, 2.2, 0.06, metal(0x6b7588), [cx, h + 1.15, cz - 0.6]));
  for (let i = 0; i < 3; i++) {
    g.add(box(0.9 - i * 0.22, 0.02, 0.02, metal(0x6b7588), [cx, h + 2.05 - i * 0.18, cz - 0.6]));
  }

  return g;
}

/* ---------------- 主路对面：小公园 + 民居 + 投币停车场 ---------------- */
function southHouses() {
  const g = new THREE.Group();
  const houseWall = (c) => toon(c, { rim: 0x9fc8ff, rimStr: 0.2 });
  const roofMat = toon(0x39404f, { rim: 0x9fc8ff, rimStr: 0.18 });
  const wallMat = toon(0x6f6a74, { rim: 0x9fc8ff, rimStr: 0.2 });
  const hedgeMat = toon(0x24402f, { rim: 0x7fe0a8, rimStr: 0.16 });

  /* 小公园：草地 + 矮墙 + 树 + 秋千 */
  const parkX0 = -9.6, parkX1 = 3.4, parkZ0 = 7.2, parkZ1 = 12.9;
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(parkX1 - parkX0, parkZ1 - parkZ0),
    toon(0x222f29, { rim: 0x6fe0a0, rimStr: 0.1 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set((parkX0 + parkX1) / 2, 0.026, (parkZ0 + parkZ1) / 2);
  g.add(grass);

  // 沿街矮墙
  g.add(box(parkX1 - parkX0, 0.72, 0.18, wallMat, [(parkX0 + parkX1) / 2, 0.36, parkZ0]));
  g.add(box(parkX1 - parkX0, 0.07, 0.24, toon(0x8a8492), [(parkX0 + parkX1) / 2, 0.75, parkZ0]));
  // 入口
  g.add(box(0.16, 0.95, 0.24, wallMat, [parkX0 + 2.4, 0.47, parkZ0]));
  g.add(box(0.16, 0.95, 0.24, wallMat, [parkX0 + 4.2, 0.47, parkZ0]));
  // 绿篱
  g.add(box(parkX1 - parkX0 - 0.4, 0.42, 0.5, hedgeMat, [(parkX0 + parkX1) / 2, 0.95, parkZ0 - 0.42]));

  // 秋千架
  {
    const sx = parkX0 + 3.2, sz = parkZ0 + 2.4;
    const m = toon(0x5f6675, { rim: 0x9fc8ff, rimStr: 0.25 });
    for (const dz of [-1.1, 1.1]) {
      g.add(rod([sx - 0.9, 0, sz + dz], [sx, 1.9, sz + dz], 0.04, m));
      g.add(rod([sx + 0.9, 0, sz + dz], [sx, 1.9, sz + dz], 0.04, m));
    }
    g.add(rod([sx, 1.9, sz - 1.1], [sx, 1.9, sz + 1.1], 0.045, m));
    for (const dz of [-0.55, 0.55]) {
      g.add(rod([sx - 0.22, 1.88, sz + dz], [sx - 0.22, 1.0, sz + dz], 0.012, metal(0x8b95a6)));
      g.add(rod([sx + 0.22, 1.88, sz + dz], [sx + 0.22, 1.0, sz + dz], 0.012, metal(0x8b95a6)));
      g.add(box(0.48, 0.05, 0.24, toon(0x3f4a5c), [sx, 0.99, sz + dz]));
    }
  }
  // 长椅
  {
    const bx = parkX0 + 1.4, bz = parkZ0 + 4.2;
    g.add(box(1.3, 0.07, 0.4, toon(0x6a5b4a, { rim: 0xffd8a0, rimStr: 0.2 }), [bx, 0.42, bz]));
    g.add(box(1.3, 0.36, 0.06, toon(0x6a5b4a), [bx, 0.62, bz - 0.18]));
    for (const dx of [-0.5, 0.5]) g.add(box(0.07, 0.4, 0.36, metal(0x5a6272), [bx + dx, 0.21, bz]));
  }
  // 公园小径 + 地灯
  {
    const pathMat = toon(0x6a7385, { rim: 0x9fc8ff, rimStr: 0.2 });
    const path = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 5.2), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(parkX0 + 3.2, 0.03, parkZ0 + 4.4);
    g.add(path);
    for (const [bx, bz] of [[parkX0 + 2.2, parkZ0 + 2.0], [parkX0 + 2.2, parkZ0 + 5.4], [parkX0 + 4.2, parkZ0 + 3.6]]) {
      g.add(cyl(0.06, 0.07, 0.5, toon(0x4a5262), [bx, 0.25, bz], [0, 0, 0], 8));
      g.add(box(0.13, 0.05, 0.13, neon(0xffd9a0, 1.5), [bx, 0.5, bz]));
      g.add(glowSprite(glowTex(0.5), 0xffc98a, 0.9, 0.3).translateX(bx).translateY(0.55).translateZ(bz));
    }
  }

  // 公园暗灯
  {
    const lx = parkX0 + 5.6, lz = parkZ0 + 1.2;
    g.add(cyl(0.03, 0.035, 2.6, metal(0x5a6272), [lx, 1.3, lz], [0, 0, 0], 8));
    g.add(cyl(0.12, 0.16, 0.16, toon(0x3d4554), [lx, 2.7, lz], [0, 0, 0], 10));
    g.add(cyl(0.11, 0.11, 0.02, neon(0xffe0b0, 1.6), [lx, 2.62, lz], [0, 0, 0], 10));
    g.add(glowSprite(glowTex(0.45), 0xffc98a, 2.4, 0.45).translateX(lx).translateY(2.6).translateZ(lz));
    const parkL = new THREE.PointLight(0xffc98a, 8, 8, 2);
    parkL.position.set(lx, 2.5, lz);
    g.add(parkL);
  }

  /* 西南角：两层民居（平屋顶 + 屋顶水箱） */
  {
    const w = 3.2, d = 5.0, h = 5.6;
    const cx = -11.4, cz = 10.4;
    g.add(box(w, h, d, houseWall(0x8b8a94), [cx, h / 2, cz]));
    g.add(box(w + 0.16, 0.16, d + 0.16, roofMat, [cx, h + 0.06, cz]));
    g.add(box(w + 0.1, 0.42, 0.1, toon(0x50474a), [cx, h + 0.34, cz - d / 2]));
    g.add(box(w + 0.1, 0.42, 0.1, toon(0x50474a), [cx, h + 0.34, cz + d / 2]));
    // 亮窗（朝向街道）
    g.add(lightWindow(cx + 0.4, 2.1, cz - d / 2 - 0.02, 1.3, 1.1, Math.PI, 0xffd9a0, { curtain: true }));
    g.add(lightWindow(cx + 0.4, 4.3, cz - d / 2 - 0.02, 1.2, 1.0, Math.PI, 0x3a4a66, { bare: true }));
    // 侧墙小窗（朝镜头）
    g.add(lightWindow(cx + w / 2 + 0.02, 3.6, cz + 0.6, 0.8, 0.7, Math.PI / 2, 0xffc48a, { curtain: true }));
    // 屋顶水箱 & 天线
    g.add(box(1.1, 0.9, 1.0, toon(0x606878), [cx - 0.4, h + 0.6, cz + 1.0]));
    g.add(rod([cx + 0.6, h + 0.16, cz + 1.4], [cx + 0.6, h + 2.0, cz + 1.4], 0.02, metal(0x6b7588)));
    for (let i = 0; i < 3; i++) {
      g.add(box(0.5 - i * 0.1, 0.02, 0.02, metal(0x6b7588), [cx + 0.6, h + 1.95 - i * 0.16, cz + 1.4]));
    }
    // 屋顶小灯 + 蟋蟀灯？
    g.add(box(0.1, 0.05, 0.1, neon(0xff8a5a, 1.2), [cx - 0.9, h + 0.18, cz - 1.6]));
  }

  /* 投币停车场 */
  {
    const x0 = 4.4, x1 = 12.6, z0 = 7.5, z1 = 12.9;
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      toon(0x333a49, { rim: 0x7fa8d8, rimStr: 0.15 })
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set((x0 + x1) / 2, 0.032, (z0 + z1) / 2);
    g.add(asphalt);
    const lineMat = flat(0x8d97a6);
    for (let i = 0; i <= 3; i++) {
      const x = x0 + 0.5 + i * 2.4;
      const l = box(0.08, 0.008, 3.6, lineMat, [x, 0.04, z0 + 2.2]);
      l.userData.noOutline = true;
      g.add(l);
    }
    for (let i = 0; i < 3; i++) {
      g.add(box(1.2, 0.09, 0.14, toon(0x9aa3b2), [x0 + 1.7 + i * 2.4, 0.05, z1 - 0.9]));
    }
    // 精算机
    g.add(box(0.5, 1.3, 0.4, toon(0x5f6675), [x0 + 0.6, 0.65, z0 + 0.4]));
    g.add(box(0.44, 0.3, 0.05, neon(0xffe0a8, 1.2), [x0 + 0.6, 1.0, z0 + 0.62]));
    // 标志杆
    const pp = new THREE.Group();
    pp.add(cyl(0.035, 0.035, 2.2, metal(0x8b95a6), [0, 1.1, 0], [0, 0, 0], 8));
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.8),
      new THREE.MeshBasicMaterial({ map: stickerTex('24H P', '#1f5f9e'), side: THREE.DoubleSide, toneMapped: false, transparent: true })
    );
    panel.position.set(0, 2.0, 0);
    panel.rotation.y = Math.PI;
    pp.add(panel);
    pp.position.set(x0 + 0.2, 0, z0 + 0.1);
    g.add(pp);
    // 围栏
    for (let i = 0; i < 5; i++) {
      const px = x0 + 0.4 + i * 2.0;
      g.add(cyl(0.03, 0.03, 1.0, toon(0x6f7788), [px, 0.5, z1 - 0.1], [0, 0, 0], 6));
    }
    g.add(box(x1 - x0 - 0.6, 0.05, 0.05, toon(0x6f7788), [(x0 + x1) / 2, 0.95, z1 - 0.1]));
  }

  // 停车场照明杆
  {
    const gx = 11.9, gz = 12.2;
    g.add(cyl(0.05, 0.06, 4.0, toon(0x3d4554), [gx, 2.0, gz], [0, 0, 0], 8));
    g.add(rod([gx, 3.95, gz], [gx - 0.8, 4.1, gz], 0.04, toon(0x3d4554)));
    g.add(box(0.5, 0.1, 0.24, toon(0x3d4554), [gx - 0.95, 4.06, gz]));
    g.add(box(0.44, 0.03, 0.2, neon(0xfff0c8, 2.6), [gx - 0.95, 3.99, gz]));
    const gl = new THREE.PointLight(0xffd9a0, 9, 9, 2);
    gl.position.set(gx - 0.95, 3.9, gz);
    g.add(gl);
    g.add(glowSprite(glowTex(0.45), 0xffd0a0, 3.0, 0.4).translateX(gx - 0.95).translateY(3.95).translateZ(gz));
  }

  // 主路对面路灯
  const farLampPost = new THREE.Group();
  farLampPost.add(cyl(0.06, 0.07, 4.2, toon(0x3d4554), [0, 2.1, 0], [0, 0, 0], 8));
  farLampPost.add(rod([0, 4.1, 0], [0, 4.25, -0.7], 0.045, toon(0x3d4554)));
  farLampPost.add(box(0.3, 0.1, 0.42, toon(0x3d4554), [0, 4.16, -0.85]));
  farLampPost.add(box(0.26, 0.03, 0.38, neon(0xffd28a, 2.8), [0, 4.09, -0.85]));
  farLampPost.position.set(-7.4, 0, 6.7);
  g.add(farLampPost);
  g.add(glowSprite(glowTex(0.45), 0xffc27a, 2.8, 0.45).translateX(-7.4).translateY(4.1).translateZ(5.85));

  return g;
}

/* ---------------- 背后：围墙 / 后巷 ---------------- */
function backLots() {
  const g = new THREE.Group();
  const wallMat = toon(0x6b7180, { rim: 0x9fc8ff, rimStr: 0.2 });
  // 便利店后的砖墙
  g.add(box(9.6, 1.9, 0.3, wallMat, [0.6, 0.95, -12.55]));
  for (let i = 0; i < 6; i++) {
    g.add(box(0.34, 2.1, 0.42, toon(0x5f6675), [0.6 - 4.6 + i * 1.62 + 0.1, 1.05, -12.55]));
  }
  // 后巷垃圾桶 + 纸箱
  g.add(box(0.6, 0.9, 0.5, toon(0x4a5566), [2.4, 0.45, -11.8]));
  g.add(box(0.44, 0.34, 0.4, toon(0x8a6d4c), [1.4, 0.17, -11.9], [0, 0.3, 0]));
  // 小巷底的围墙（便利店西侧小巷尽头）
  g.add(box(3.2, 2.2, 0.24, wallMat, [-5.1, 1.1, -12.5]));
  g.add(box(3.2, 0.1, 0.3, toon(0x3d4453), [-5.1, 2.22, -12.5]));
  // 围墙上的灯
  g.add(box(0.16, 0.1, 0.12, toon(0x3d4554), [-5.1, 2.4, -12.3]));
  g.add(box(0.12, 0.05, 0.1, neon(0xffd9a0, 1.2), [-5.1, 2.34, -12.28]));
  return g;
}

/* ---------------- 树 ---------------- */
function tree(x, z, scale = 1, color = 0x2b4a3c) {
  const g = new THREE.Group();
  const trunkM = toon(0x3f3327);
  g.add(cyl(0.09 * scale, 0.13 * scale, 1.8 * scale, trunkM, [0, 0.9 * scale, 0], [0, 0, 0], 7));
  const leafM = toon(color, { rim: 0x8fffc0, rimStr: 0.18 });
  const rnd = mulberry32(x * 13 + z);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = (0.35 + rnd() * 0.3) * scale;
    g.add(sphere(r, leafM, [
      Math.cos(a) * 0.4 * scale,
      (1.9 + rnd() * 0.7) * scale,
      Math.sin(a) * 0.4 * scale,
    ], [1, 0.9, 1], 8));
  }
  g.add(sphere(0.55 * scale, leafM, [0, 2.3 * scale, 0], [1.1, 0.9, 1.1], 8));
  g.position.set(x, 0, z);
  return g;
}

export function buildDistrict() {
  const g = new THREE.Group();
  g.add(westNeighbor());
  g.add(streetEnd());
  g.add(eastBlock());
  g.add(southHouses());
  g.add(backLots());
  g.add(tree(-8.2, 9.2, 1.15, 0x22392e));
  g.add(tree(1.2, 10.6, 0.95, 0x22382f));
  g.add(tree(-4.4, 11.9, 0.8, 0x203830));
  return { group: g };
}
