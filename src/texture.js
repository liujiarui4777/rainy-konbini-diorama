import * as THREE from 'three';
import { mulberry32 } from './kit.js';

/* ============================================================
   程序化贴图：全部用 Canvas 现画，零外部资源，保证离线可开
   ============================================================ */

const JP = '"Yu Gothic UI","Yu Gothic","Meiryo","MS Gothic",sans-serif';

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, x: c.getContext('2d') };
}

export function tex(canvas, { repeat = [1, 1], srgb = true, aniso = 8, filter = THREE.LinearFilter } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.minFilter = filter;
  t.magFilter = filter;
  t.needsUpdate = true;
  return t;
}

function noise(ctx, w, h, amount, alpha, rnd) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    d[i + 3] = Math.max(d[i + 3], alpha);
  }
  ctx.putImageData(img, 0, 0);
}

/* ---------------- 地面 ---------------- */

export function asphaltTex() {
  const S = 512, { c, x } = cv(S, S);
  const rnd = mulberry32(11);
  x.fillStyle = '#262c3a'; x.fillRect(0, 0, S, S);
  // 大块色斑
  for (let i = 0; i < 60; i++) {
    const r = 20 + rnd() * 90;
    x.beginPath();
    x.arc(rnd() * S, rnd() * S, r, 0, 7);
    x.fillStyle = `rgba(${20 + rnd() * 26 | 0},${24 + rnd() * 30 | 0},${34 + rnd() * 34 | 0},0.5)`;
    x.fill();
  }
  // 石子
  for (let i = 0; i < 5000; i++) {
    const g = 60 + rnd() * 110;
    x.fillStyle = `rgba(${g},${g + 6},${g + 16},${0.08 + rnd() * 0.2})`;
    x.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2.4, 1 + rnd() * 2);
  }
  // 裂缝
  x.strokeStyle = 'rgba(12,15,22,0.55)';
  for (let i = 0; i < 5; i++) {
    x.lineWidth = 1 + rnd() * 2;
    x.beginPath();
    let px = rnd() * S, py = rnd() * S;
    x.moveTo(px, py);
    for (let k = 0; k < 7; k++) { px += (rnd() - 0.5) * 90; py += (rnd() - 0.5) * 90; x.lineTo(px, py); }
    x.stroke();
  }
  noise(x, S, S, 16, 255, rnd);
  return tex(c, { repeat: [3, 3] });
}

export function sidewalkTex() {
  const S = 512, { c, x } = cv(S, S);
  const rnd = mulberry32(23);
  x.fillStyle = '#4b5266'; x.fillRect(0, 0, S, S);
  const n = 4, cell = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = 68 + rnd() * 22;
    x.fillStyle = `rgb(${v | 0},${(v + 6) | 0},${(v + 20) | 0})`;
    x.fillRect(i * cell + 3, j * cell + 3, cell - 6, cell - 6);
    // 每块砖的细纹
    x.strokeStyle = 'rgba(255,255,255,0.05)';
    x.lineWidth = 1;
    x.strokeRect(i * cell + 5, j * cell + 5, cell - 10, cell - 10);
  }
  x.strokeStyle = 'rgba(24,28,40,0.85)';
  x.lineWidth = 4;
  for (let i = 0; i <= n; i++) {
    x.beginPath(); x.moveTo(i * cell, 0); x.lineTo(i * cell, S); x.stroke();
    x.beginPath(); x.moveTo(0, i * cell); x.lineTo(S, i * cell); x.stroke();
  }
  noise(x, S, S, 12, 255, rnd);
  return tex(c, { repeat: [6, 6] });
}

/** 黄色盲道点阵 */
export function tactileTex() {
  const S = 128, { c, x } = cv(S, S);
  x.fillStyle = '#c9a83f'; x.fillRect(0, 0, S, S);
  x.fillStyle = '#e8c65a';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    x.beginPath();
    x.arc(16 + i * 32, 16 + j * 32, 9, 0, 7);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.16)';
    x.beginPath(); x.arc(13 + i * 32, 13 + j * 32, 4, 0, 7); x.fill();
    x.fillStyle = '#e8c65a';
  }
  return tex(c, { repeat: [1, 1] });
}

export function concreteTex() {
  const S = 256, { c, x } = cv(S, S);
  const rnd = mulberry32(31);
  x.fillStyle = '#5d6478'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 250; i++) {
    x.fillStyle = `rgba(${40 + rnd() * 40 | 0},${46 + rnd() * 40 | 0},${60 + rnd() * 40 | 0},0.35)`;
    x.beginPath(); x.arc(rnd() * S, rnd() * S, 2 + rnd() * 14, 0, 7); x.fill();
  }
  // 水渍竖纹
  for (let i = 0; i < 18; i++) {
    x.fillStyle = 'rgba(28,32,44,0.25)';
    const w = 1 + rnd() * 5;
    x.fillRect(rnd() * S, 0, w, S);
  }
  noise(x, S, S, 12, 255, rnd);
  return tex(c, { repeat: [2, 2] });
}

export function brickTex() {
  const S = 256, { c, x } = cv(S, S);
  const rnd = mulberry32(37);
  x.fillStyle = '#3d3140'; x.fillRect(0, 0, S, S);
  const bw = 64, bh = 26;
  for (let r = 0; r < S / bh + 1; r++) {
    for (let i = -1; i < S / bw + 1; i++) {
      const off = (r % 2) * bw * 0.5;
      const v = 58 + rnd() * 26;
      x.fillStyle = `rgb(${(v + 14) | 0},${(v - 4) | 0},${(v + 8) | 0})`;
      x.fillRect(i * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
    }
  }
  noise(x, S, S, 14, 255, rnd);
  return tex(c, { repeat: [3, 2] });
}

export function shutterTex() {
  const S = 256, { c, x } = cv(S, S);
  const rnd = mulberry32(41);
  x.fillStyle = '#4a4f5e'; x.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 8) {
    x.fillStyle = 'rgba(255,255,255,0.09)';
    x.fillRect(0, y, S, 2);
    x.fillStyle = 'rgba(0,0,0,0.28)';
    x.fillRect(0, y + 4, S, 3);
  }
  for (let i = 0; i < 12; i++) {
    x.fillStyle = `rgba(${70 + rnd() * 50 | 0},${50 + rnd() * 30 | 0},${40 + rnd() * 20 | 0},0.18)`;
    x.beginPath(); x.arc(rnd() * S, rnd() * S, 4 + rnd() * 16, 0, 7); x.fill();
  }
  return tex(c, { repeat: [1, 1] });
}

/* ---------------- 招牌 ---------------- */

const LOGO = (x, cx, cy, r) => {
  // 星形小 logo
  x.save();
  x.translate(cx, cy);
  x.fillStyle = '#0f3f3a';
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r : r * 0.44;
    x[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  x.closePath();
  x.fill();
  x.restore();
};

/** 主招牌（横向长条）：ほしぞらマート / HOSHIZORA MART */
export function fasciaTex(main = true) {
  const W = 1024, H = 192, { c, x } = cv(W, H);
  const grd = x.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#14524a');
  grd.addColorStop(0.55, '#0d3d39');
  grd.addColorStop(1, '#0a2f2d');
  x.fillStyle = grd; x.fillRect(0, 0, W, H);
  // 顶部霓虹细线
  x.fillStyle = '#7dffe2'; x.fillRect(0, 8, W, 5);
  x.fillStyle = 'rgba(125,255,226,0.35)'; x.fillRect(0, 14, W, 2);
  x.fillStyle = 'rgba(125,255,226,0.5)'; x.fillRect(0, H - 10, W, 3);

  if (main) {
    // 星标
    x.save();
    x.beginPath(); x.arc(96, H / 2, 52, 0, 7); x.fillStyle = '#7dffe2'; x.fill();
    x.restore();
    LOGO(x, 96, H / 2 + 2, 40);
    x.fillStyle = '#ffffff';
    x.font = `700 92px ${JP}`;
    x.textBaseline = 'middle';
    x.fillText('ほしぞらマート', 176, H / 2 + 2);
    x.fillStyle = '#a9fff0';
    x.font = `600 30px ${JP}`;
    x.fillText('HOSHIZORA  MART', 182, H - 34);
    // 24H
    x.fillStyle = '#ff8ec4';
    x.font = `700 34px ${JP}`;
    x.textAlign = 'right';
    x.fillText('24H', W - 26, 44);
    x.textAlign = 'left';
  } else {
    x.fillStyle = '#eafff9';
    x.font = `700 86px ${JP}`;
    x.textBaseline = 'middle';
    x.fillText('ほしぞらマート', 40, H / 2);
  }
  return tex(c);
}

/** 竖向袖看板：ほしぞら / 24H OPEN */
export function verticalSignTex() {
  const W = 192, H = 768, { c, x } = cv(W, H);
  x.fillStyle = '#f2fff9'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#0f3f3a'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = '#0f3f3a';
  const word = 'ほしぞら';
  x.font = `700 118px ${JP}`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < word.length; i++) x.fillText(word[i], W / 2, 110 + i * 130);
  x.fillStyle = '#158a74';
  x.fillRect(16, H - 128, W - 32, 96);
  x.fillStyle = '#eafff9';
  x.font = `700 56px ${JP}`;
  x.fillText('24H', W / 2, H - 78);
  return tex(c);
}

/** 屋顶广告牌 */
export function roofSignTex() {
  const W = 1024, H = 320, { c, x } = cv(W, H);
  x.fillStyle = '#0d3d39'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#7dffe2'; x.fillRect(0, 0, W, 12); x.fillRect(0, H - 12, W, 12);
  x.save();
  x.beginPath(); x.arc(150, H / 2, 92, 0, 7); x.fillStyle = '#7dffe2'; x.fill();
  x.restore();
  LOGO(x, 150, H / 2 + 4, 70);
  x.fillStyle = '#ffffff';
  x.font = `700 116px ${JP}`;
  x.textBaseline = 'middle';
  x.fillText('ほしぞら', 288, H / 2 - 30);
  x.fillStyle = '#a9fff0';
  x.font = `600 60px ${JP}`;
  x.fillText('MART  /  OPEN 24H', 292, H / 2 + 74);
  return tex(c);
}

/** 自动贩卖机正面 */
export function vendingTex(hue = 'red') {
  const W = 512, H = 1024, { c, x } = cv(W, H);
  const rnd = mulberry32(hue === 'red' ? 7 : 9);
  const body = hue === 'red' ? '#d8323c' : '#26506e';
  const bodyDark = hue === 'red' ? '#a62129' : '#1b3b52';
  x.fillStyle = body; x.fillRect(0, 0, W, H);
  x.fillStyle = bodyDark; x.fillRect(0, H - 190, W, 190);

  // 顶部灯箱
  const g = x.createLinearGradient(0, 0, 0, 140);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dff6ff');
  x.fillStyle = g; x.fillRect(18, 16, W - 36, 120);
  x.fillStyle = body;
  x.font = `700 66px ${JP}`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(hue === 'red' ? 'つめたい ドリンク' : 'あったか〜い', W / 2, 78);

  // 商品展示窗
  x.fillStyle = '#0d1620'; x.fillRect(18, 150, W - 36, 560);
  x.fillStyle = 'rgba(190,245,255,0.10)'; x.fillRect(18, 150, W - 36, 560);
  const cols = 4, rows = 5;
  const cw = (W - 36) / cols, ch = 560 / rows;
  const palettes = ['#ff5a5a', '#ffd166', '#59d6ff', '#8ef2b8', '#ff9ad5', '#c7a2ff', '#ffffff', '#ff8a3d'];
  for (let r = 0; r < rows; r++) {
    // 层板
    x.fillStyle = 'rgba(255,255,255,0.18)';
    x.fillRect(18, 150 + (r + 1) * ch - 5, W - 36, 4);
    for (let i = 0; i < cols; i++) {
      const px = 18 + i * cw + 14, py = 150 + r * ch + 14;
      const canW = cw - 28, canH = ch - 46;
      x.fillStyle = palettes[(rnd() * palettes.length) | 0];
      x.beginPath();
      x.roundRect(px, py, canW, canH, 8); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.55)';
      x.fillRect(px + 4, py + 6, 6, canH - 12);
      x.fillStyle = 'rgba(0,0,0,0.25)';
      x.fillRect(px, py + canH * 0.55, canW, 4);
      // 价格
      x.fillStyle = '#ffe9a8';
      x.font = `700 16px ${JP}`;
      x.textAlign = 'center';
      x.fillText('130', px + canW / 2, py + canH + 20);
    }
  }
  // 出货口 & 按钮
  x.fillStyle = '#10151c'; x.fillRect(40, H - 170, 150, 120);
  x.fillStyle = '#303a48'; x.fillRect(40, H - 178, 150, 10);
  x.fillStyle = '#e8eef8';
  x.font = `600 22px ${JP}`;
  x.textAlign = 'left';
  x.fillText('COIN  /  IC', 230, H - 120);
  x.fillStyle = '#7dffe2'; x.fillRect(230, H - 96, 120, 34);
  x.fillStyle = '#0d1a16'; x.font = `700 22px ${JP}`; x.fillText('¥ 130', 244, H - 72);
  return tex(c);
}

/** 收银台后墙 / 冷柜门（发光） */
export function fridgeTex() {
  const W = 512, H = 256, { c, x } = cv(W, H);
  const rnd = mulberry32(53);
  x.fillStyle = '#eafff8'; x.fillRect(0, 0, W, H);
  const cols = 6, cw = W / cols;
  for (let i = 0; i < cols; i++) {
    x.fillStyle = 'rgba(150,225,255,0.55)';
    x.fillRect(i * cw + 4, 8, cw - 8, H - 16);
    for (let k = 0; k < 4; k++) {
      x.fillStyle = ['#ff6b6b', '#ffd166', '#5ad1ff', '#8ef2b8', '#ff9ad5'][(rnd() * 5) | 0];
      x.fillRect(i * cw + 12, 18 + k * 56, cw - 24, 34);
    }
    x.fillStyle = 'rgba(255,255,255,0.5)';
    x.fillRect(i * cw + 2, 4, 3, H - 8);
  }
  return tex(c);
}

/** 杂志架条带 */
export function magazineTex() {
  const W = 512, H = 256, { c, x } = cv(W, H);
  const rnd = mulberry32(59);
  x.fillStyle = '#141c26'; x.fillRect(0, 0, W, H);
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 6; i++) {
      const w = 74, h = 70;
      x.fillStyle = ['#e8556d', '#3f8fd8', '#f2c14e', '#6fce9a', '#c77dff', '#ff9f43'][(rnd() * 6) | 0];
      x.fillRect(i * (w + 6) + 6, r * 84 + 8, w, h);
      x.fillStyle = 'rgba(255,255,255,0.85)';
      x.fillRect(i * (w + 6) + 12, r * 84 + 16, w - 12, 10);
      x.fillStyle = 'rgba(0,0,0,0.35)';
      x.fillRect(i * (w + 6) + 12, r * 84 + 36, w - 24, 4);
      x.fillRect(i * (w + 6) + 12, r * 84 + 46, w - 34, 4);
    }
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.fillRect(0, r * 84 + 80, W, 4);
  }
  return tex(c);
}

/** 冷柜 / 货架上的小商品色块 */
export function goodsTex() {
  const W = 256, H = 256, { c, x } = cv(W, H);
  const rnd = mulberry32(61);
  x.fillStyle = '#101821'; x.fillRect(0, 0, W, H);
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 7; i++) {
      x.fillStyle = ['#ff6b6b', '#ffd166', '#5ad1ff', '#8ef2b8', '#ff9ad5', '#c7a2ff', '#f7f7f7'][(rnd() * 7) | 0];
      x.fillRect(i * 36 + 3, r * 62 + 12, 30, 40);
    }
    x.fillStyle = 'rgba(255,255,255,0.16)';
    x.fillRect(0, r * 62 + 56, W, 4);
  }
  return tex(c);
}

/* ---------------- 告示 / 海报 ---------------- */

export function posterTex(kind = 0) {
  const W = 320, H = 448, { c, x } = cv(W, H);
  if (kind === 0) {
    x.fillStyle = '#f4efe2'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#d9433f'; x.fillRect(0, 0, W, 90);
    x.fillStyle = '#fff';
    x.font = `700 48px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('夏祭り', W / 2, 48);
    x.fillStyle = '#3a3630'; x.font = `600 30px ${JP}`;
    x.fillText('町内会 盆踊り大会', W / 2, 140);
    x.fillStyle = '#c8452f'; x.beginPath(); x.arc(W / 2, 260, 62, 0, 7); x.fill();
    x.fillStyle = '#f4efe2'; x.font = `700 26px ${JP}`;
    x.fillText('8/15', W / 2, 262);
    x.fillStyle = '#3a3630'; x.font = `500 22px ${JP}`;
    x.fillText('18:00  商店街広場', W / 2, 366);
  } else if (kind === 1) {
    x.fillStyle = '#e9f3ef'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#2b6f5e'; x.fillRect(0, 0, W, 76);
    x.fillStyle = '#fff'; x.font = `700 34px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('猫の里親募集', W / 2, 42);
    x.fillStyle = '#8c7a63'; x.beginPath(); x.arc(W / 2, 210, 74, 0, 7); x.fill();
    x.fillStyle = '#5d5142';
    x.beginPath(); x.arc(W / 2 - 24, 198, 8, 0, 7); x.fill();
    x.beginPath(); x.arc(W / 2 + 24, 198, 8, 0, 7); x.fill();
    x.fillStyle = '#2b6f5e'; x.font = `600 24px ${JP}`;
    x.fillText('生後3か月・オス', W / 2, 320);
    x.fillStyle = '#6b6459'; x.font = `500 20px ${JP}`;
    x.fillText('TEL 090-0000-0000', W / 2, 372);
  } else {
    x.fillStyle = '#1a1a20'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#f2c14e'; x.font = `700 64px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('ラーメン', W / 2, 120);
    x.fillStyle = '#ff6b6b'; x.fillRect(40, 180, W - 80, 6);
    x.fillStyle = '#e8eef8'; x.font = `600 34px ${JP}`;
    x.fillText('営業中', W / 2, 250);
    x.fillStyle = '#8fa3bb'; x.font = `500 22px ${JP}`;
    x.fillText('路地を入って 20m', W / 2, 330);
    x.fillStyle = '#f2c14e'; x.font = `600 26px ${JP}`;
    x.fillText('深夜 2 時まで', W / 2, 386);
  }
  return tex(c);
}

/** 公告栏（木框 + 软木 + 多张海报） */
export function noticeBoardTex() {
  const W = 512, H = 384, { c, x } = cv(W, H);
  const rnd = mulberry32(67);
  x.fillStyle = '#6b5344'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#9a7d62'; x.fillRect(12, 12, W - 24, H - 24);
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(${120 + rnd() * 50 | 0},${95 + rnd() * 40 | 0},${70 + rnd() * 30 | 0},0.5)`;
    x.fillRect(12 + rnd() * (W - 24), 12 + rnd() * (H - 24), 2, 2);
  }
  const cards = [
    [30, 30, 150, 190, '#f4efe2', '#d9433f', 'お知らせ'],
    [200, 26, 130, 160, '#e9f3ef', '#2b6f5e', '防犯'],
    [350, 40, 130, 170, '#1a1a20', '#f2c14e', '求人'],
    [60, 240, 160, 120, '#fdf7e2', '#3a3630', '回覧板'],
    [250, 220, 200, 140, '#e8eef8', '#3f6fa8', 'ゴミ収集'],
  ];
  for (const [px, py, w, h, bg, accent, t] of cards) {
    x.save();
    x.translate(px + w / 2, py + h / 2);
    x.rotate((rnd() - 0.5) * 0.08);
    x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(-w / 2 + 5, -h / 2 + 6, w, h);
    x.fillStyle = bg; x.fillRect(-w / 2, -h / 2, w, h);
    x.fillStyle = accent; x.fillRect(-w / 2, -h / 2, w, 34);
    x.fillStyle = '#fff'; x.font = `700 22px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(t, 0, -h / 2 + 18);
    x.fillStyle = 'rgba(40,40,50,0.55)';
    for (let k = 0; k < 5; k++) x.fillRect(-w / 2 + 12, -h / 2 + 58 + k * 18, w - 24 - rnd() * 26, 5);
    x.fillStyle = '#c9433f'; x.beginPath(); x.arc(0, -h / 2 + 4, 6, 0, 7); x.fill();
    x.restore();
  }
  return tex(c);
}

/** 路面「止まれ」 */
export function tomareTex() {
  const W = 256, H = 512, { c, x } = cv(W, H);
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(238,242,248,0.92)';
  x.font = `700 132px ${JP}`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.save(); x.translate(W / 2, 150); x.fillText('止', 0, 0); x.restore();
  x.save(); x.translate(W / 2, 300); x.fillText('ま', 0, 0); x.restore();
  x.save(); x.translate(W / 2, 430); x.fillText('れ', 0, 0); x.restore();
  return tex(c);
}

/** 蓝色路牌 */
export function guideSignTex() {
  const W = 512, H = 256, { c, x } = cv(W, H);
  x.fillStyle = '#1b4f8a'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#ffffff'; x.lineWidth = 10; x.strokeRect(9, 9, W - 18, H - 18);
  x.fillStyle = '#fff'; x.font = `700 54px ${JP}`; x.textAlign = 'left'; x.textBaseline = 'middle';
  x.fillText('商店街', 40, 78);
  x.font = `600 34px ${JP}`;
  x.fillText('SHOTENGAI', 40, 132);
  // 箭头
  x.beginPath();
  x.moveTo(400, 196); x.lineTo(456, 148); x.lineTo(400, 100);
  x.lineWidth = 18; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = '#fff';
  x.beginPath(); x.moveTo(456, 148); x.lineTo(408, 122); x.lineTo(408, 174); x.closePath(); x.fill();
  return tex(c);
}

/** 停止标志：倒三角「止まれ」 */
export function stopSignTex() {
  const S = 256, { c, x } = cv(S, S);
  x.clearRect(0, 0, S, S);
  x.fillStyle = '#d8323c';
  x.beginPath(); x.moveTo(10, 18); x.lineTo(246, 18); x.lineTo(128, 236); x.closePath(); x.fill();
  x.fillStyle = '#ffffff';
  x.beginPath(); x.moveTo(34, 34); x.lineTo(222, 34); x.lineTo(128, 210); x.closePath(); x.fill();
  x.fillStyle = '#d8323c';
  x.font = `700 52px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('止まれ', 128, 92);
  return tex(c);
}

/** 便利店玻璃上的招贴 / 香烟广告小牌 */
export function stickerTex(label, bg) {
  const W = 256, H = 128, { c, x } = cv(W, H);
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 4; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 46px ${JP}`;
  x.fillText(label, W / 2, H / 2);
  return tex(c);
}

/** 光斑（泛光精灵 / 灯罩光晕） */
export function glowTex(soft = 0.5) {
  const S = 256, { c, x } = cv(S, S);
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(soft * 0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(soft, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** 雨滴溅落的水花环 */
export function splashTex() {
  const S = 128, { c, x } = cv(S, S);
  x.clearRect(0, 0, S, S);
  x.strokeStyle = 'rgba(255,255,255,0.95)';
  x.lineWidth = 3;
  x.beginPath(); x.arc(S / 2, S / 2, 52, 0, 7); x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.4)';
  x.lineWidth = 2;
  x.beginPath(); x.arc(S / 2, S / 2, 40, 0, 7); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** 积水遮罩：柔和不规则湿区 */
export function wetMaskTex() {
  const S = 512, { c, x } = cv(S, S);
  const rnd = mulberry32(83);
  x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  x.filter = 'blur(10px)';
  for (let i = 0; i < 70; i++) {
    const px = rnd() * S, py = rnd() * S, r = 18 + rnd() * 78;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  x.filter = 'none';
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** 瓦楞 / 波浪屋檐板 */
export function corrugatedTex() {
  const S = 128, { c, x } = cv(S, S);
  x.fillStyle = '#3a4152'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 8) {
    x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(i, 0, 3, S);
    x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(i + 5, 0, 3, S);
  }
  return tex(c, { repeat: [1, 1] });
}

/** 空调外机格栅 */
export function grilleTex() {
  const S = 256, { c, x } = cv(S, S);
  x.fillStyle = '#8a90a0'; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(30,35,46,0.75)'; x.lineWidth = 3;
  for (let r = 12; r < S - 8; r += 10) {
    x.beginPath(); x.arc(S / 2, S / 2, r, 0, 7); x.stroke();
  }
  x.fillStyle = '#5c6272';
  x.beginPath(); x.arc(S / 2, S / 2, 26, 0, 7); x.fill();
  x.fillStyle = '#a8aebd';
  x.beginPath(); x.arc(S / 2, S / 2, 12, 0, 7); x.fill();
  return tex(c);
}

export function noiseTex() {
  const S = 256, { c, x } = cv(S, S);
  const rnd = mulberry32(97);
  const img = x.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 100 + rnd() * 100;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return tex(c, { repeat: [4, 4], srgb: false });
}
