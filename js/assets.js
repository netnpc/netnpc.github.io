// 程序化纹理与模型生成（无外部资源依赖）
import * as THREE from '../vendor/three.module.min.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const cvs = (size = 256) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
};

function noise(ctx, size, amount, alpha) {
  const d = ctx.getImageData(0, 0, size, size);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    p[i] += n; p[i + 1] += n; p[i + 2] += n;
    if (alpha !== undefined) p[i + 3] = alpha;
  }
  ctx.putImageData(d, 0, 0);
}

function grunge(ctx, size, count, color, maxR) {
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    const x = Math.random() * size, y = Math.random() * size;
    const r = rnd(1, maxR);
    ctx.fillStyle = color.replace('ALPHA', rnd(0.03, 0.16).toFixed(3));
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function concreteTexture(repeat = 1) {
  const size = 256, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#6b6a66'; ctx.fillRect(0, 0, size, size);
  // 大色块
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${rnd(80, 130) | 0},${rnd(80, 128) | 0},${rnd(76, 120) | 0},.25)`;
    ctx.fillRect(rnd(0, size), rnd(0, size), rnd(20, 90), rnd(20, 90));
  }
  noise(ctx, size, 34);
  grunge(ctx, size, 60, 'rgba(40,40,38,ALPHA)', 26);
  grunge(ctx, size, 30, 'rgba(150,150,142,ALPHA)', 18);
  // 砖缝
  ctx.strokeStyle = 'rgba(35,35,33,.55)'; ctx.lineWidth = 2;
  for (let y = 0; y < size; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    const off = (y / 64) % 2 ? 64 : 0;
    for (let x = off; x < size + 64; x += 128) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 64); ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function containerTexture(base = '#3c4b58', repeat = 1) {
  const size = 256, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 26);
  // 竖向加强筋
  for (let x = 0; x < size; x += 32) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, 'rgba(0,0,0,.30)');
    g.addColorStop(.35, 'rgba(255,255,255,.10)');
    g.addColorStop(.7, 'rgba(255,255,255,.02)');
    g.addColorStop(1, 'rgba(0,0,0,.24)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, 32, size);
  }
  // 锈斑
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(${rnd(110, 150) | 0},${rnd(60, 90) | 0},40,${rnd(.05, .22).toFixed(2)})`;
    ctx.beginPath(); ctx.ellipse(rnd(0, size), rnd(0, size), rnd(4, 26), rnd(3, 12), rnd(0, 3), 0, 7); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function woodTexture(repeat = 1) {
  const size = 128, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#8a5f34'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(${rnd(60, 110) | 0},${rnd(38, 66) | 0},${rnd(16, 34) | 0},${rnd(.15, .5).toFixed(2)})`;
    ctx.lineWidth = rnd(0.5, 2.2);
    const y = rnd(0, size);
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.06 + y) * 2.2);
    ctx.stroke();
  }
  // 木板缝
  ctx.strokeStyle = 'rgba(30,18,8,.55)'; ctx.lineWidth = 2;
  for (let y = 0; y < size; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crateTexture() {
  const size = 128, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#a5753f'; ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 24);
  ctx.strokeStyle = 'rgba(70,44,18,.85)'; ctx.lineWidth = 9;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(size - 8, size - 8); ctx.moveTo(size - 8, 8); ctx.lineTo(8, size - 8); ctx.stroke();
  grunge(ctx, size, 30, 'rgba(50,30,10,ALPHA)', 12);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function targetTexture() {
  const size = 128, c = cvs(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#e9e4d8'; ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  const rings = [['#d33', 58], ['#e9e4d8', 48], ['#d33', 38], ['#e9e4d8', 28], ['#d33', 18], ['#f5c518', 8]];
  rings.forEach(([col, r]) => { ctx.beginPath(); ctx.fillStyle = col; ctx.arc(cx, cx, r, 0, 7); ctx.fill(); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function skyTexture() {
  const w = 64, h = 256, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3f7fc0');
  g.addColorStop(.34, '#79b0dd');
  g.addColorStop(.55, '#bcd4e6');
  g.addColorStop(.62, '#e8e2d2');
  g.addColorStop(.70, '#c7baa2');
  g.addColorStop(1, '#8c8574');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // 淡淡的云带
  for (let i = 0; i < 60; i++) {
    const y = Math.random() * h * 0.45;
    ctx.fillStyle = `rgba(255,255,255,${(0.05 + Math.random() * 0.14).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * w, y, 8 + Math.random() * 30, 2 + Math.random() * 6, 0, 0, 7);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  return t;
}

// 枪口火焰贴图
export function flashTexture() {
  const size = 128, c = cvs(size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,220,1)');
  g.addColorStop(.25, 'rgba(255,220,120,.95)');
  g.addColorStop(.55, 'rgba(255,140,40,.55)');
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  // 星形射线
  ctx.translate(64, 64);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    const lg = ctx.createLinearGradient(0, 0, 0, -64);
    lg.addColorStop(0, 'rgba(255,240,200,.9)');
    lg.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(0, -64); ctx.lineTo(4, 0); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------- 武器模型（第一人称，低模风格） ----------------
const mat = (color, rough = 0.55, metal = 0.55) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

function box(w, h, d, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}
function cyl(r1, r2, h, m, seg = 12) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
}

// 模型朝向：-Z 为枪口方向
export function buildRifle() {
  const g = new THREE.Group();
  const black = mat(0x5f656e, 0.45, 0.6);
  const steel = mat(0x7d838d, 0.32, 0.8);
  const wood = mat(0xb06a30, 0.55, 0.1);
  const dark = mat(0x44484f, 0.65, 0.4);

  // 机匣
  g.add(box(0.09, 0.11, 0.44, steel, 0, 0, 0));
  // 上机匣盖
  g.add(box(0.075, 0.045, 0.36, steel, 0, 0.075, -0.03));
  // 枪管
  const barrel = cyl(0.019, 0.019, 0.42, steel, 10);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.035, -0.42); g.add(barrel);
  // 导气管
  g.add(box(0.045, 0.035, 0.26, black, 0, 0.085, -0.3));
  // 准星
  g.add(box(0.03, 0.055, 0.03, black, 0, 0.12, -0.56));
  // 枪口
  const muzzle = cyl(0.026, 0.026, 0.07, dark, 10);
  muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.035, -0.63); g.add(muzzle);
  // 护木
  g.add(box(0.085, 0.09, 0.2, wood, 0, 0.015, -0.3));
  // 弹匣（弯曲用两段近似）
  g.add(box(0.07, 0.19, 0.1, dark, 0, -0.15, 0.02, 0.28));
  g.add(box(0.07, 0.13, 0.09, dark, 0, -0.25, 0.09, 0.62));
  // 握把
  g.add(box(0.06, 0.17, 0.08, wood, 0, -0.14, 0.2, -0.32));
  // 枪托
  g.add(box(0.07, 0.1, 0.26, wood, 0, -0.01, 0.34));
  g.add(box(0.06, 0.14, 0.03, steel, 0, -0.03, 0.47));
  // 机瞄
  g.add(box(0.012, 0.03, 0.012, black, 0, 0.105, 0.1));

  // 持枪手臂（手套 + 袖子）
  addArms(g, { front: [0.005, -0.16, 0.06], frontLen: 0.34, hand: 'grip', rear: [0, 0.02, 0.42] });

  g.traverse((o) => { o.castShadow = true; });
  return g;
}

function addArms(g, opt) {
  const glove = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.85, metalness: 0.1 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x5d6650, roughness: 0.95, metalness: 0.02 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb98a68, roughness: 0.85 });

  // 前手（握护木）
  const fh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.15), glove);
  fh.position.set(opt.front[0], opt.front[1], opt.front[2]);
  g.add(fh);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, opt.frontLen), sleeve);
  fl.position.set(opt.front[0] - 0.02, opt.front[1] - 0.07, opt.front[2] + opt.frontLen / 2 + 0.04);
  fl.rotation.x = -0.32; fl.rotation.z = -0.12;
  g.add(fl);
  const fw = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.1), skinMat);
  fw.position.set(opt.front[0] - 0.01, opt.front[1] - 0.05, opt.front[2] + 0.11);
  g.add(fw);

  // 后手（握把）+ 小臂
  const rh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.1), glove);
  rh.position.set(0, -0.13, 0.2); rh.rotation.x = -0.3;
  g.add(rh);
  const rl = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.3), sleeve);
  rl.position.set(0.02, -0.24, 0.35); rl.rotation.x = 0.42; rl.rotation.z = 0.1;
  g.add(rl);
}

export function buildPistol() {
  const g = new THREE.Group();
  const black = mat(0x62686f, 0.42, 0.6);
  const dark = mat(0x44484f, 0.65, 0.4);
  g.add(box(0.07, 0.1, 0.3, black, 0, 0, -0.02));   // 套筒
  g.add(box(0.062, 0.07, 0.16, dark, 0, -0.09, 0.07, 0.12)); // 握把
  const barrel = cyl(0.014, 0.014, 0.06, dark, 8);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.015, -0.19); g.add(barrel);
  g.add(box(0.012, 0.022, 0.012, black, 0, 0.062, -0.14)); // 准星
  const glove2 = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.85 });
  const sleeve2 = new THREE.MeshStandardMaterial({ color: 0x5d6650, roughness: 0.95 });
  const hd = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.1, 0.1), glove2);
  hd.position.set(0, -0.08, 0.06); g.add(hd);
  const sl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.26), sleeve2);
  sl.position.set(0.02, -0.2, 0.2); sl.rotation.x = 0.55; g.add(sl);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

// ---------------- 敌方角色（细节化士兵） ----------------
// 几何体复用缓存：多个敌人共享同一 geometry，减少内存与 GC
const _geoCache = new Map();
function gBox(w, h, d) {
  const k = `b${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  if (!_geoCache.has(k)) _geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return _geoCache.get(k);
}
function gCyl(r1, r2, h, seg = 10) {
  const k = `c${r1.toFixed(3)},${r2.toFixed(3)},${h.toFixed(3)},${seg}`;
  if (!_geoCache.has(k)) _geoCache.set(k, new THREE.CylinderGeometry(r1, r2, h, seg));
  return _geoCache.get(k);
}
function gSph(r, ws = 10, hs = 8) {
  const k = `s${r.toFixed(3)},${ws},${hs}`;
  if (!_geoCache.has(k)) _geoCache.set(k, new THREE.SphereGeometry(r, ws, hs));
  return _geoCache.get(k);
}

// 简易部件：位置 + 旋转 + 缩放一次写完
function part(geo, material, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  return m;
}

/**
 * 构建敌方士兵模型。
 * @param {number} color  军装主色（不同精英等级换色）
 * @param {number} skin   肤色
 * @param {object} opt    { elite:boolean, helmet:'full'|'cap', visorColor }
 */
export function buildSoldier(color = 0xb03a3a, skin = 0xd0a07a, opt = {}) {
  const elite = !!opt.elite;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // ---- 材质 ----
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.04 });
  const clothDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.72).getHex(), roughness: 0.9, metalness: 0.04,
  });
  const pad = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.78, metalness: 0.22 });
  const vestM = new THREE.MeshStandardMaterial({ color: elite ? 0x2b2f36 : 0x3a3e45, roughness: 0.9, metalness: 0.1 });
  const webbing = new THREE.MeshStandardMaterial({ color: 0x4a4a3e, roughness: 0.95, metalness: 0.02 });
  const skinc = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.82, metalness: 0.02 });
  const glass = new THREE.MeshStandardMaterial({
    color: opt.visorColor || (elite ? 0x8a2a1a : 0x2f4858),
    roughness: 0.08, metalness: 0.95, emissive: elite ? 0x5a0d04 : 0x000000, emissiveIntensity: elite ? 0.9 : 0,
  });
  const metal = new THREE.MeshStandardMaterial({ color: 0x6b7078, roughness: 0.42, metalness: 0.86 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2e3136, roughness: 0.52, metalness: 0.72 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x27282b, roughness: 0.88, metalness: 0.06 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: elite ? 0xd8a53a : 0xc9c4b4, roughness: 0.55, metalness: 0.45,
  });

  // ---- 骨盆 / 腰带 ----
  body.add(part(gBox(0.38, 0.19, 0.23), clothDark, 0, 0.88, 0));
  body.add(part(gBox(0.4, 0.055, 0.25), leather, 0, 0.965, 0));            // 腰带
  body.add(part(gBox(0.06, 0.05, 0.03), accentMat, 0, 0.965, -0.128));     // 皮带扣
  // 腰侧挂包
  body.add(part(gBox(0.09, 0.1, 0.07), webbing, -0.2, 0.93, -0.06, 0, 0.2, 0));
  body.add(part(gBox(0.08, 0.09, 0.06), webbing, 0.2, 0.93, -0.05, 0, -0.2, 0));
  // 水壶
  body.add(part(gCyl(0.042, 0.042, 0.13, 8), pad, 0.21, 0.9, 0.11, 0, 0, 0.1));
  // 匕首鞘
  body.add(part(gBox(0.035, 0.16, 0.05), leather, -0.21, 0.86, 0.09, 0.12, 0, 0.15));

  // ---- 躯干（三段收腰，更接近人体） ----
  const torso = part(gBox(0.42, 0.24, 0.235), cloth, 0, 1.1, 0);
  body.add(torso);
  const chest = part(gBox(0.475, 0.27, 0.25), cloth, 0, 1.34, 0);
  body.add(chest);
  // 斜挎背带（视觉层次）
  body.add(part(gBox(0.055, 0.42, 0.03), webbing, -0.1, 1.3, -0.135, 0, 0, 0.42));
  body.add(part(gBox(0.055, 0.4, 0.03), webbing, 0.13, 1.28, -0.132, 0, 0, -0.36));

  // ---- 战术背心 ----
  const vest = part(gBox(0.44, 0.44, 0.29), vestM, 0, 1.24, 0);
  body.add(vest);
  // 前胸弹匣袋（3 个，带扣盖）
  for (let i = -1; i <= 1; i++) {
    const dx = i * 0.13;
    body.add(part(gBox(0.1, 0.12, 0.055), pad, dx, 1.15, -0.165));
    body.add(part(gBox(0.104, 0.032, 0.062), webbing, dx, 1.2, -0.167));   // 袋盖
    body.add(part(gBox(0.02, 0.02, 0.012), accentMat, dx, 1.175, -0.196)); // 按扣
  }
  // 无线电（左胸）
  body.add(part(gBox(0.085, 0.13, 0.06), pad, -0.16, 1.36, -0.135));
  body.add(part(gCyl(0.006, 0.006, 0.14, 6), metal, -0.175, 1.47, -0.14, 0.16, 0, 0.1)); // 天线
  // 护板 / 魔术贴标识
  body.add(part(gBox(0.12, 0.028, 0.015), accentMat, 0.14, 1.4, -0.146));
  // 肩带
  body.add(part(gBox(0.09, 0.06, 0.28), vestM, -0.17, 1.48, 0));
  body.add(part(gBox(0.09, 0.06, 0.28), vestM, 0.17, 1.48, 0));
  // 背部电台 + 背包
  const pack = part(gBox(0.28, 0.29, 0.13), pad, 0, 1.32, 0.185);
  body.add(pack);
  body.add(part(gBox(0.26, 0.06, 0.142), webbing, 0, 1.22, 0.185));   // 背包绑带
  body.add(part(gBox(0.11, 0.14, 0.05), vestM, 0, 1.44, 0.255));       // 外挂杂物包
  body.add(part(gCyl(0.005, 0.005, 0.16, 6), metal, 0.11, 1.55, 0.2, 0.12, 0, -0.12)); // 天线
  // 背包侧挂（卷起的睡袋）
  body.add(part(gCyl(0.045, 0.045, 0.22, 8), webbing, -0.15, 1.3, 0.2, 0, 0, Math.PI / 2));

  // ---- 肩部装甲 + 臂章 ----
  const shoulderG = gSph(0.105, 10, 8);
  const sL = part(shoulderG, pad, -0.255, 1.45, 0, 0, 0, 0, 1, 0.85, 1.05);
  const sR = part(shoulderG, pad, 0.255, 1.45, 0, 0, 0, 0, 1, 0.85, 1.05);
  body.add(sL, sR);
  // 肩垫下层（布质）
  body.add(part(gSph(0.115, 10, 8), cloth, -0.25, 1.4, 0, 0, 0, 0, 1, 0.7, 1));
  body.add(part(gSph(0.115, 10, 8), cloth, 0.25, 1.4, 0, 0, 0, 0, 1, 0.7, 1));
  // 臂章（左右各一块，精英为金色）
  body.add(part(gBox(0.012, 0.07, 0.07), accentMat, -0.31, 1.32, 0));
  body.add(part(gBox(0.012, 0.06, 0.06), accentMat, 0.31, 1.34, 0.02));

  // ---- 颈部 / 头 ----
  body.add(part(gCyl(0.058, 0.072, 0.09, 8), skinc, 0, 1.52, 0));
  const head = part(gSph(0.118, 14, 12), skinc, 0, 1.625, 0, 0, 0, 0, 1, 1.06, 1);
  body.add(head);
  // 下颌（让头型不那么像球）
  body.add(part(gBox(0.13, 0.06, 0.1), skinc, 0, 1.55, -0.045));
  // 耳朵
  body.add(part(gSph(0.028, 6, 5), skinc, -0.115, 1.63, 0.005, 0, 0, 0, 0.6, 1, 1));
  body.add(part(gSph(0.028, 6, 5), skinc, 0.115, 1.63, 0.005, 0, 0, 0, 0.6, 1, 1));

  // 头盔（半球 + 帽檐 + 侧导轨 + 头盔带）
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.138, 16, 11, 0, Math.PI * 2, 0, Math.PI * 0.56), pad
  );
  helmet.position.set(0, 1.632, 0);
  helmet.scale.set(1.02, 1.06, 1.04);
  body.add(helmet);
  // 头盔顶盖 / 加强筋
  body.add(part(gBox(0.045, 0.026, 0.2), vestM, 0, 1.755, 0));
  body.add(part(gBox(0.2, 0.026, 0.045), vestM, 0, 1.752, 0));
  // 侧导轨
  body.add(part(gBox(0.022, 0.032, 0.13), metal, -0.132, 1.66, -0.02));
  body.add(part(gBox(0.022, 0.032, 0.13), metal, 0.132, 1.66, -0.02));
  // 头盔下缘带
  body.add(part(gBox(0.29, 0.028, 0.29), vestM, 0, 1.585, 0));
  // 前额夜视镜座
  body.add(part(gBox(0.07, 0.05, 0.05), metal, 0, 1.72, -0.115));
  // 护目镜（双镜片 + 镜框）
  body.add(part(gBox(0.2, 0.05, 0.055), vestM, 0, 1.645, -0.108));
  body.add(part(gBox(0.075, 0.038, 0.02), glass, -0.048, 1.646, -0.13));
  body.add(part(gBox(0.075, 0.038, 0.02), glass, 0.048, 1.646, -0.13));
  // 镜带
  body.add(part(gBox(0.3, 0.03, 0.02), vestM, 0, 1.645, 0.11));
  // 面罩（半脸）
  const mask = part(gBox(0.145, 0.09, 0.075), pad, 0, 1.565, -0.075);
  body.add(mask);
  body.add(part(gBox(0.14, 0.05, 0.02), leather, 0, 1.52, -0.085)); // 面罩下缘
  // 呼吸滤罐
  body.add(part(gCyl(0.032, 0.032, 0.04, 8), metal, 0, 1.53, -0.105, Math.PI / 2, 0, 0));
  // 通讯耳麦
  body.add(part(gCyl(0.038, 0.038, 0.024, 10), pad, -0.122, 1.63, 0, 0, 0, Math.PI / 2));
  body.add(part(gCyl(0.038, 0.038, 0.024, 10), pad, 0.122, 1.63, 0, 0, 0, Math.PI / 2));
  // 麦克风杆
  body.add(part(gBox(0.014, 0.014, 0.1), leather, -0.1, 1.575, -0.075, 0.3, -0.5, 0));

  // ---- 腿（髋关节组，带大腿/小腿/护膝/战术靴，可动画） ----
  const mkLeg = (sx) => {
    const g = new THREE.Group();
    g.position.set(sx, 0.87, 0);
    // 大腿
    g.add(part(gBox(0.155, 0.42, 0.175), cloth, 0, -0.21, 0));
    // 大腿侧袋
    g.add(part(gBox(0.045, 0.13, 0.1), webbing, sx > 0 ? 0.085 : -0.085, -0.2, -0.01));
    // 小腿（靴筒）
    g.add(part(gBox(0.14, 0.36, 0.16), clothDark, 0, -0.58, 0.008));
    // 护膝
    g.add(part(gBox(0.148, 0.11, 0.075), pad, 0, -0.44, -0.088));
    g.add(part(gBox(0.1, 0.03, 0.02), accentMat, 0, -0.44, -0.128));
    // 绑腿
    g.add(part(gBox(0.146, 0.035, 0.166), leather, 0, -0.5, 0.008));
    g.add(part(gBox(0.142, 0.03, 0.162), leather, 0, -0.68, 0.008));
    // 靴子（鞋身 + 鞋头 + 鞋底 + 鞋带）
    g.add(part(gBox(0.15, 0.115, 0.19), leather, 0, -0.79, 0.005));
    g.add(part(gBox(0.14, 0.085, 0.09), leather, 0, -0.805, -0.115));
    g.add(part(gBox(0.158, 0.032, 0.3), new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.98 }), 0, -0.852, -0.02));
    g.add(part(gBox(0.155, 0.016, 0.1), pad, 0, -0.755, -0.045));
    body.add(g);
    return g;
  };
  const legL = mkLeg(-0.115), legR = mkLeg(0.115);

  // ---- 手臂（肩关节组，持枪姿态） ----
  const mkArm = (sx) => {
    const g = new THREE.Group();
    g.position.set(sx, 1.43, 0);
    // 上臂（略向外、向前）
    g.add(part(gBox(0.1, 0.28, 0.11), cloth, sx * 0.1, -0.14, -0.05, 0.55, 0, 0));
    // 肘部护具
    g.add(part(gBox(0.098, 0.068, 0.085), pad, sx * 0.12, -0.275, -0.135, 0.55, 0, 0));
    // 小臂（前伸指向 -Z）
    g.add(part(gBox(0.088, 0.25, 0.095), clothDark, sx * 0.14, -0.325, -0.285, 1.42, 0, 0));
    // 手套
    g.add(part(gBox(0.076, 0.076, 0.095), leather, sx * 0.15, -0.35, -0.44));
    // 手腕护条
    g.add(part(gBox(0.082, 0.026, 0.082), pad, sx * 0.145, -0.345, -0.385));
    body.add(g);
    return g;
  };
  const armL = mkArm(-0.275), armR = mkArm(0.275);

  // ---- 步枪（细节化：机匣/护木/弯弹匣/准星/枪托/握把/瞄具） ----
  const gun = new THREE.Group();
  gun.add(part(gBox(0.055, 0.075, 0.44), gunMat, 0, 0, 0));                        // 机匣
  gun.add(part(gBox(0.05, 0.032, 0.34), metal, 0, 0.052, -0.03));                  // 上机匣盖
  gun.add(part(gBox(0.048, 0.07, 0.17), pad, 0, 0.005, -0.245));                   // 护木
  gun.add(part(gCyl(0.014, 0.014, 0.24, 8), metal, 0, 0.022, -0.4, Math.PI / 2, 0, 0)); // 枪管
  gun.add(part(gCyl(0.021, 0.021, 0.055, 8), gunMat, 0, 0.022, -0.5, Math.PI / 2, 0, 0)); // 消焰器
  gun.add(part(gBox(0.026, 0.05, 0.022), gunMat, 0, 0.072, -0.44));                // 准星
  gun.add(part(gBox(0.02, 0.028, 0.018), gunMat, 0, 0.06, 0.08));                  // 照门
  gun.add(part(gBox(0.038, 0.045, 0.05), metal, 0, 0.085, -0.16));                 // 光学瞄具
  // 弯弹匣（两段）
  gun.add(part(gBox(0.042, 0.15, 0.075), gunMat, 0, -0.11, 0.03, 0.22, 0, 0));
  gun.add(part(gBox(0.04, 0.1, 0.068), gunMat, 0, -0.2, 0.075, 0.55, 0, 0));
  // 握把
  gun.add(part(gBox(0.042, 0.13, 0.06), pad, 0, -0.095, 0.16, -0.3, 0, 0));
  // 枪托
  gun.add(part(gBox(0.045, 0.075, 0.22), pad, 0, -0.01, 0.32));
  gun.add(part(gBox(0.05, 0.1, 0.028), gunMat, 0, -0.02, 0.44));
  gun.position.set(0.055, 1.235, -0.34);
  gun.rotation.set(-0.09, -0.16, 0.06);
  body.add(gun);
  // 枪背带
  body.add(part(gBox(0.03, 0.28, 0.02), leather, 0.1, 1.32, -0.145, 0, 0, -0.4));

  // 阴影
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  root.userData = {
    head, torso: chest, vest, legL, legR, armL, armR, body, gun,
    // 用于受击闪红的材质集合
    flashMats: [cloth, clothDark, vestM],
  };
  return root;
}
