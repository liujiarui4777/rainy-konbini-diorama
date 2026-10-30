import * as THREE from 'three';
import { G, M, box, cyl, rbox, roundedBoxGeo, plane, rod, decal, mulberry32 } from './kit.js';
import { toon, neon, flat, glass, metal, C, outline } from './palette.js';
import {
  fasciaTex, verticalSignTex, roofSignTex, fridgeTex, magazineTex, goodsTex,
  stickerTex, glowTex, posterTex,
} from './texture.js';
import { L } from './world.js';

/* ============================================================
   便利店主体（视觉中心）
   ============================================================ */

const S = L.STORE;
const WALL_T = 0.2;
const FRONT_Z = S.z1;          // -5.2
const FLOOR_Y = L.WALK_Y;      // 室内地面与人行道齐平

function glowSprite(map, color, size, opacity = 0.7, blending = THREE.AdditiveBlending) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color: new THREE.Color(color), transparent: true, opacity,
    blending, depthWrite: false, depthTest: true, toneMapped: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

export function buildStore() {
  const g = new THREE.Group();
  const rnd = mulberry32(1234);

  const wallMat = toon(0xdfe7e3, { rim: 0x9fd8ee, rimStr: 0.3, rimPow: 2.2 });
  const wallSideMat = toon(0xd2dbd8, { rim: 0x9fd8ee, rimStr: 0.24, rimPow: 2.4 });
  const trimMat = toon(0x27474a, { rim: 0x78e6d2, rimStr: 0.45 });
  const trimLight = toon(0x3d6165);
  const roofMat = toon(0x39404f, { rim: 0x6f9dc8, rimStr: 0.2 });
  const glassMat = glass(0xd4fbf6, 0.09);
  const litPanel = (map, boost = 1.25) => new THREE.MeshBasicMaterial({
    map, color: new THREE.Color(boost, boost, boost), toneMapped: false,
  });

  const W = S.x1 - S.x0;      // 7.2
  const D = S.z1 - S.z0;      // 5.8
  const H = S.h;              // 4.05
  const cx = 0, cz = (S.z0 + S.z1) / 2;

  /* ---------- 主体墙 ---------- */
  // 后墙
  g.add(box(W, H, WALL_T, wallSideMat, [cx, H / 2, S.z0 + WALL_T / 2]));
  // 西墙
  g.add(box(WALL_T, H, D, wallSideMat, [S.x0 + WALL_T / 2, H / 2, cz]));
  // 东墙
  g.add(box(WALL_T, H, D, wallMat, [S.x1 - WALL_T / 2, H / 2, cz]));
  // 顶板
  g.add(box(W, 0.18, D, roofMat, [cx, H - 0.09, cz]));

  // 正面：下裙板
  g.add(box(W, 0.62, WALL_T, trimMat, [cx, 0.31, FRONT_Z - WALL_T / 2]));
  // 正面：招牌横梁
  g.add(box(W, H - 2.92, WALL_T, wallMat, [cx, (2.92 + H) / 2, FRONT_Z - WALL_T / 2]));

  // 转角柱
  g.add(box(0.14, H, 0.14, trimLight, [S.x1 - 0.07, H / 2, FRONT_Z - 0.07]));
  g.add(box(0.14, H, 0.14, trimLight, [S.x0 + 0.07, H / 2, FRONT_Z - 0.07]));

  /* ---------- 玻璃幕墙 + 竖框 ---------- */
  const glassZ = FRONT_Z - 0.09;
  const glassH = 2.92 - 0.62;
  const glassY = 0.62 + glassH / 2;
  g.add(M(new THREE.PlaneGeometry(W - 0.3, glassH), glassMat, [cx, glassY, glassZ]));

  const mullionX = [-3.42, -1.15, 1.15, 3.42];
  for (const x of mullionX) {
    g.add(box(0.09, glassH, 0.13, trimMat, [x, glassY, glassZ]));
  }
  g.add(box(W - 0.2, 0.1, 0.14, trimMat, [cx, 2.92, glassZ]));
  g.add(box(W - 0.2, 0.08, 0.12, trimMat, [cx, 0.62, glassZ]));

  /* ---------- 自动门（双开，滑到两侧） ---------- */
  const doorY0 = 0.66, doorH = 2.2;
  const makeDoorPanel = (x) => {
    const p = new THREE.Group();
    const fw = 1.12, fh = doorH;
    p.add(box(fw, 0.07, 0.06, trimMat, [x, doorY0 + fh - 0.035, glassZ - 0.05]));
    p.add(box(fw, 0.07, 0.06, trimMat, [x, doorY0 + 0.035, glassZ - 0.05]));
    p.add(box(0.07, fh, 0.06, trimMat, [x - fw / 2 + 0.035, doorY0 + fh / 2, glassZ - 0.05]));
    p.add(box(0.07, fh, 0.06, trimMat, [x + fw / 2 - 0.035, doorY0 + fh / 2, glassZ - 0.05]));
    p.add(M(new THREE.PlaneGeometry(fw - 0.14, fh - 0.14), glassMat, [x, doorY0 + fh / 2, glassZ - 0.05]));
    return p;
  };
  g.add(makeDoorPanel(-1.72));
  g.add(makeDoorPanel(1.72));
  // 地轨
  g.add(box(3.5, 0.03, 0.1, metal(0x8a93a4), [0, 0.02, glassZ - 0.05]));
  // 自动门贴纸
  const autoSticker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.2),
    litPanel(stickerTex('自動ドア', '#158a74'), 1.1)
  );
  autoSticker.position.set(1.72, 1.05, glassZ - 0.085);
  g.add(autoSticker);

  /* ---------- 室内 ---------- */
  const inner = new THREE.Group();
  const floorTex = goodsTex();
  // 室内地面（浅色）
  inner.add(box(W - 0.3, 0.06, D - 0.3, toon(0xcfd6d4), [cx, FLOOR_Y + 0.03, cz]));
  // 天花板
  inner.add(box(W - 0.3, 0.06, D - 0.3, toon(0xdae4e0), [cx, 3.16, cz]));

  // 天花灯带
  const barMat = neon(0xf2fff8, 1.0);
  for (let i = 0; i < 3; i++) {
    inner.add(box(1.0, 0.04, 0.16, barMat, [-2.0 + i * 2.0, 3.11, -6.6]));
    inner.add(box(1.0, 0.04, 0.16, barMat, [-2.0 + i * 2.0, 3.11, -8.9]));
  }

  // 后墙冷柜
  const fridgeMat = litPanel(fridgeTex(), 0.55);
  const fr = box(6.4, 2.35, 0.12, fridgeMat, [cx, 1.42, S.z0 + 0.28]);
  inner.add(fr);
  inner.add(box(6.5, 0.1, 0.16, trimMat, [cx, 2.62, S.z0 + 0.28]));
  inner.add(box(0.09, 2.45, 0.16, trimMat, [cx, 1.42, S.z0 + 0.28]));

  // 货架（两组）
  const shelfMat = toon(0xb2bdba, { rim: 0x8fe0d0, rimStr: 0.22 });
  const prodCols = [0xff6b6b, 0xffd166, 0x5ad1ff, 0x8ef2b8, 0xff9ad5, 0xc7a2ff, 0xfff2b8];
  const prodMats = prodCols.map((c) => toon(c, { rim: 0xffffff, rimStr: 0.12 }));
  const shelfUnit = (x, z, len) => {
    const u = new THREE.Group();
    u.add(box(len, 0.06, 0.52, shelfMat, [x, 0.16, z]));
    for (let lvl = 0; lvl < 3; lvl++) {
      const yy = 0.5 + lvl * 0.44;
      u.add(box(len, 0.05, 0.5, shelfMat, [x, yy, z]));
      u.add(box(len, 0.34, 0.04, shelfMat, [x, yy + 0.2, z + 0.24]));
      // 货架正面的商品色带（透过玻璃看最有便利店味）
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(len - 0.06, 0.3),
        new THREE.MeshBasicMaterial({ map: goodsTex(), color: new THREE.Color(0.85, 0.85, 0.85), toneMapped: false })
      );
      strip.position.set(x, yy + 0.2, z + 0.262);
      u.add(strip);
      // 商品
      for (let i = 0; i < 7; i++) {
        const px = x - len / 2 + 0.16 + i * (len - 0.32) / 6;
        const hh = 0.16 + rnd() * 0.1;
        u.add(box(0.14, hh, 0.13, prodMats[(rnd() * prodMats.length) | 0], [px, yy + 0.03 + hh / 2, z]));
      }
    }
    return u;
  };
  inner.add(shelfUnit(-1.55, -8.9, 1.9));
  inner.add(shelfUnit(-1.55, -7.3, 1.9));
  inner.add(shelfUnit(1.75, -8.9, 1.7));

  // 杂志架（靠右窗）
  const magMat = litPanel(magazineTex(), 0.85);
  inner.add(box(1.9, 1.15, 0.4, shelfMat, [2.3, 0.75, -7.0]));
  inner.add(M(new THREE.PlaneGeometry(1.8, 1.05), magMat, [2.3, 0.78, -6.78]));

  // 收银台（左后）
  inner.add(box(2.0, 0.95, 0.7, toon(0xc9d2cf), [-2.1, 0.64, -10.2]));
  inner.add(box(2.1, 0.09, 0.8, trimMat, [-2.1, 1.14, -10.2]));
  // 收银机
  inner.add(box(0.42, 0.3, 0.32, toon(0x2c3542), [-2.5, 1.3, -10.1]));
  inner.add(M(new THREE.PlaneGeometry(0.3, 0.18), neon(0x74ffdf, 1.5), [-2.5, 1.36, -9.93]));
  // 关东煮 / 热食柜
  inner.add(box(0.7, 0.42, 0.5, toon(0x9aa4a8), [-1.2, 1.35, -10.2]));
  inner.add(M(new THREE.PlaneGeometry(0.6, 0.24), neon(0xffd08a, 1.4), [-1.2, 1.4, -9.94]));

  // 室内海报
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.26), litPanel(posterTex(0), 0.8));
  p1.position.set(-3.42, 1.9, -8.2); p1.rotation.y = Math.PI / 2;
  inner.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), litPanel(posterTex(2), 0.8));
  p2.position.set(3.42, 1.7, -9.6); p2.rotation.y = -Math.PI / 2;
  inner.add(p2);

  // 门口地垫
  const matTex = goodsTex();
  inner.add(box(1.9, 0.02, 1.0, toon(0x5b3a44), [0, FLOOR_Y + 0.07, -5.9]));

  // 购物篮
  for (let i = 0; i < 3; i++) {
    inner.add(box(0.44, 0.24, 0.32, toon(0xd8555f), [0.75, 0.12 + i * 0.11, -6.3]));
  }

  g.add(inner);

  /* ---------- 外檐雨棚（L 形） ---------- */
  const canopyMat = toon(0x9daea9, { rim: 0x8fffe4, rimStr: 0.45, rimPow: 2.0 });
  const canopyUnder = toon(0xd5ddd6);
  const cY = 2.98;
  const front = box(W + 0.7, 0.16, 1.72, canopyMat, [cx, cY, FRONT_Z + 0.86]);
  front.castShadow = true;
  g.add(front);
  g.add(box(W + 0.7, 0.03, 1.72, canopyUnder, [cx, cY - 0.09, FRONT_Z + 0.86]));
  const sideCanopy = box(1.72, 0.16, D - 0.4, canopyMat, [S.x1 + 0.86, cY, cz - 0.2]);
  sideCanopy.castShadow = true;
  g.add(sideCanopy);
  g.add(box(1.72, 0.03, D - 0.4, canopyUnder, [S.x1 + 0.86, cY - 0.09, cz - 0.2]));

  // 雨棚边缘亮条
  const edgeGlow = neon(0x9dfff0, 1.2);
  g.add(box(W + 0.72, 0.05, 0.05, edgeGlow, [cx, cY - 0.11, FRONT_Z + 1.72]));
  g.add(box(0.05, 0.05, D - 0.4, edgeGlow, [S.x1 + 1.72, cY - 0.11, cz - 0.2]));

  // 雨棚下的筒灯
  const downMat = neon(0xfff0d0, 3.0);
  for (let i = 0; i < 4; i++) {
    const x = -2.4 + i * 1.6;
    g.add(cyl(0.075, 0.075, 0.03, downMat, [x, cY - 0.1, FRONT_Z + 1.15], [0, 0, 0], 10));
    const sp = glowSprite(glowTex(0.4), 0xffd9a0, 0.8, 0.3);
    sp.position.set(x, cY - 0.16, FRONT_Z + 1.15);
    g.add(sp);
  }
  for (let i = 0; i < 3; i++) {
    const z = -6.4 - i * 1.7;
    g.add(cyl(0.075, 0.075, 0.03, downMat, [S.x1 + 1.15, cY - 0.1, z], [0, 0, 0], 10));
    const sp = glowSprite(glowTex(0.4), 0xffd9a0, 0.8, 0.3);
    sp.position.set(S.x1 + 1.15, cY - 0.16, z);
    g.add(sp);
  }

  /* ---------- 招牌 ---------- */
  const fTex = fasciaTex(true);
  const fMat = new THREE.MeshBasicMaterial({ map: fTex, color: new THREE.Color(1.45, 1.45, 1.45), toneMapped: false });
  const fSign = new THREE.Mesh(new THREE.PlaneGeometry(7.05, 0.98), fMat);
  fSign.position.set(cx, 3.5, FRONT_Z + 0.005);
  g.add(fSign);
  // 招牌背板（略厚，带侧边）
  g.add(box(7.35, 1.1, 0.12, trimMat, [cx, 3.5, FRONT_Z - 0.06]));

  // 东侧招牌
  const fMat2 = new THREE.MeshBasicMaterial({ map: fasciaTex(false), color: new THREE.Color(1.4, 1.4, 1.4), toneMapped: false });
  const fSign2 = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.86), fMat2);
  fSign2.position.set(S.x1 + 0.005, 3.48, cz);
  fSign2.rotation.y = Math.PI / 2;
  g.add(fSign2);
  g.add(box(0.12, 1.05, 5.5, trimMat, [S.x1 + 0.06, 3.48, cz]));

  // 竖向袖看板（东面挑出）
  const vTex = verticalSignTex();
  const vMatSide = new THREE.MeshBasicMaterial({ map: vTex, color: new THREE.Color(1.3, 1.3, 1.3), toneMapped: false });
  const vBoard = box(0.52, 2.0, 0.09, trimMat, [S.x1 + 0.34, 2.55, -6.6]);
  g.add(vBoard);
  for (const dz of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.94), vMatSide);
    p.position.set(S.x1 + 0.34, 2.55, -6.6 + dz * 0.051);
    if (dz < 0) p.rotation.y = Math.PI;
    g.add(p);
  }
  // 支架
  g.add(rod([S.x1 + 0.02, 3.6, -6.6], [S.x1 + 0.32, 3.5, -6.6], 0.03, metal(0x7c8698)));
  g.add(rod([S.x1 + 0.02, 1.55, -6.6], [S.x1 + 0.32, 1.6, -6.6], 0.03, metal(0x7c8698)));

  // 屋顶广告牌
  const rTex = roofSignTex();
  const rMat = new THREE.MeshBasicMaterial({ map: rTex, color: new THREE.Color(1.35, 1.35, 1.35), toneMapped: false });
  const roofBoard = box(5.4, 1.66, 0.1, trimMat, [cx - 0.3, H + 1.02, S.z0 + 1.0]);
  g.add(roofBoard);
  const roofPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.24, 1.5), rMat);
  roofPlane.position.set(cx - 0.3, H + 1.02, S.z0 + 1.06);
  g.add(roofPlane);
  // 支架
  for (const dx of [-2.2, 2.2]) {
    g.add(box(0.1, 1.0, 0.1, metal(0x6b7588), [cx - 0.3 + dx, H + 0.1, S.z0 + 1.0]));
    g.add(rod([cx - 0.3 + dx, H + 0.1, S.z0 + 1.0], [cx - 0.3 + dx, H + 0.6, S.z0 + 1.35], 0.035, metal(0x6b7588)));
  }
  // 屋顶招牌背光
  const roofGlow = glowSprite(glowTex(0.6), 0x7fffe0, 7.5, 0.28);
  roofGlow.position.set(cx - 0.3, H + 1.05, S.z0 + 0.6);
  g.add(roofGlow);

  // 招牌光晕
  const signGlow = glowSprite(glowTex(0.55), 0x66ffe0, 8.5, 0.3);
  signGlow.position.set(cx, 3.5, FRONT_Z + 0.6);
  g.add(signGlow);

  /* ---------- 屋顶细节 ---------- */
  // 女儿墙
  g.add(box(W + 0.1, 0.3, 0.12, trimLight, [cx, H + 0.15, S.z0 + 0.06]));
  g.add(box(W + 0.1, 0.3, 0.12, trimLight, [cx, H + 0.15, S.z1 - 0.06]));
  g.add(box(0.12, 0.3, D, trimLight, [S.x0 + 0.06, H + 0.15, cz]));
  g.add(box(0.12, 0.3, D, trimLight, [S.x1 - 0.06, H + 0.15, cz]));
  // 屋顶空调外机
  for (const [ax, az] of [[-2.4, -9.6], [2.2, -10.2]]) {
    const ac = box(0.9, 0.56, 0.5, toon(0xc9d2d2), [ax, H + 0.37, az]);
    g.add(ac);
    g.add(box(0.9, 0.06, 0.5, metal(0x8f97a6), [ax, H + 0.66, az]));
    const fan = cyl(0.19, 0.19, 0.04, flat(0x2a3140), [ax + 0.28, H + 0.68, az], [0, 0, 0], 14);
    g.add(fan);
  }
  // 排气管
  g.add(cyl(0.08, 0.08, 0.7, metal(0x7d8698), [1.0, H + 0.4, -9.2]));
  g.add(cyl(0.12, 0.12, 0.06, metal(0x7d8698), [1.0, H + 0.76, -9.2]));

  /* ---------- 外墙小细节 ---------- */
  // 门口灯箱 / 小招牌
  const iceMat = litPanel(stickerTex('アイス', '#2f6fa8'), 1.15);
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.26), iceMat);
  ice.position.set(-2.55, 2.35, FRONT_Z + 0.02);
  g.add(ice);
  const atmMat = litPanel(stickerTex('ATM', '#c9433f'), 1.1);
  const atm = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.24), atmMat);
  atm.position.set(2.55, 2.35, FRONT_Z + 0.02);
  g.add(atm);

  // 店内透出的光斑（地面光池）
  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTex(0.75), color: new THREE.Color(0xfff2d8).multiplyScalar(0.4),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 4.4), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, L.WALK_Y + 0.012, -3.2);
  pool.userData.noOutline = true;
  g.add(pool);

  /* ---------- 背面（后巷一侧）细节 ---------- */
  const backZ = S.z0;
  // 后门
  g.add(box(1.1, 2.05, 0.08, toon(0x39414e), [-1.2, 1.02, backZ - 0.04]));
  g.add(box(0.06, 0.18, 0.06, metal(0x9aa3b2), [-0.75, 1.05, backZ - 0.09]));
  // 后门小灯
  g.add(box(0.16, 0.1, 0.16, toon(0x3d4554), [-0.5, 2.35, backZ - 0.08]));
  g.add(box(0.12, 0.04, 0.12, neon(0xffd9a0, 1.6), [-0.5, 2.3, backZ - 0.08]));
  // 通风口 / 管道 / 电表箱
  g.add(box(0.9, 0.6, 0.1, toon(0x8b93a2), [1.6, 3.1, backZ - 0.05]));
  for (let i = 0; i < 4; i++) g.add(box(0.8, 0.03, 0.12, flat(0x2a3140), [1.6, 2.95 + i * 0.1, backZ - 0.06]));
  g.add(cyl(0.05, 0.05, H - 0.2, toon(0x5c6373), [3.3, H / 2, backZ - 0.08], [0, 0, 0], 8));
  g.add(box(0.5, 0.7, 0.1, toon(0x6d7688), [2.6, 1.6, backZ - 0.06]));
  g.add(box(0.44, 0.3, 0.02, flat(0x1c2230), [2.6, 1.7, backZ - 0.13]));
  // 后墙海报
  const bp1 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.98), new THREE.MeshBasicMaterial({ map: posterTex(1), color: 0x9aa4b0 }));
  bp1.position.set(-2.6, 1.9, backZ - 0.045);
  bp1.rotation.y = Math.PI;
  g.add(bp1);
  // 空调外机
  g.add(box(0.86, 0.6, 0.34, toon(0xc3cbd2), [0.3, 0.5, backZ - 0.25]));
  g.add(box(0.86, 0.05, 0.36, metal(0x8b95a6), [0.3, 0.82, backZ - 0.25]));
  // 屋顶爬梯
  for (let i = 0; i < 6; i++) g.add(box(0.5, 0.03, 0.03, metal(0x8b95a6), [3.0, 3.2 + i * 0.3, backZ - 0.12]));
  g.add(box(0.03, 1.9, 0.03, metal(0x8b95a6), [2.76, 4.0, backZ - 0.12]));
  g.add(box(0.03, 1.9, 0.03, metal(0x8b95a6), [3.24, 4.0, backZ - 0.12]));

  /* ---------- 灯光 ---------- */
  const lights = [];
  const addPoint = (color, intensity, dist, pos, decay = 2) => {
    const p = new THREE.PointLight(color, intensity, dist, decay);
    p.position.set(pos[0], pos[1], pos[2]);
    lights.push(p);
    g.add(p);
    return p;
  };
  addPoint(0xfff0d8, 5.0, 11, [0, 2.7, -7.2]);
  addPoint(0xe6fff8, 3.4, 9, [-1.2, 2.7, -9.8]);
  addPoint(0xffe8c0, 8.0, 8.0, [0, 1.9, -4.4]);
  // 雨棚下暖光
  addPoint(0xffd9a0, 7, 5.5, [0, 2.7, -4.2]);
  addPoint(0xffd9a0, 6, 5.0, [4.4, 2.7, -7.6]);

  return { group: g, lights };
}
